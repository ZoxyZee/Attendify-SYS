from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import db
from ..dependencies import get_current_user, serialize_document
from ..schemas import AttendanceMarkRequest, AttendanceSyncRequest
from ..utils.attendance import is_duplicate_attendance, resolve_attendance_type_for_day
from ..utils.work_schedule import DEFAULT_WORK_SCHEDULE, build_daily_work_metrics


router = APIRouter(prefix="/attendance", tags=["attendance"])


def build_range(filter_mode: str = "today", date: str = "", start_date: str = "", end_date: str = ""):
    now = datetime.now()
    if date:
        start = datetime.fromisoformat(date)
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start.replace(hour=23, minute=59, second=59, microsecond=999000)
        return start, end, "date"
    if start_date or end_date:
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Both startDate and endDate are required for a custom range.")
        start = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0, microsecond=0)
        end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, microsecond=999000)
        if start > end:
            raise HTTPException(status_code=400, detail="Start date cannot be after end date.")
        return start, end, "range"
    if filter_mode == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now.replace(hour=23, minute=59, second=59, microsecond=999000)
        return start, end, "today"
    if filter_mode == "week":
        diff = 6 if now.weekday() == 6 else now.weekday()
        start = (now - timedelta(days=diff)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now.replace(hour=23, minute=59, second=59, microsecond=999000)
        return start, end, "week"
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(milliseconds=1)
    else:
        end = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(milliseconds=1)
    return start, end, "month"


def verify_device_and_employee(company_id: str, employee_id: str, device_id: str):
    device = db.devices.find_one({"company_id": company_id, "device_id": device_id})
    employee = db.employees.find_one({"company_id": company_id, "employee_id": employee_id, "status": "active"})
    if not device:
        raise HTTPException(status_code=400, detail="Device is not registered for this company.")
    if not employee:
        raise HTTPException(status_code=400, detail="Employee does not belong to this company or is inactive.")
    return device, employee


def verify_active_employee(company_id: str, employee_id: str):
    employee = db.employees.find_one({"company_id": company_id, "employee_id": employee_id, "status": "active"})
    if not employee:
        raise HTTPException(status_code=400, detail="Employee does not belong to this company or is inactive.")
    return employee


@router.get("/today")
def get_attendance_records(
    filter: str = Query("today"),
    search: str = Query(""),
    date: str = Query(""),
    startDate: str = Query(""),
    endDate: str = Query(""),
    user=Depends(get_current_user)
):
    start, end, mode = build_range(filter, date, startDate, endDate)
    company = db.companies.find_one({"_id": ObjectId(user["company_id"])}, {"work_schedule": 1})
    work_schedule = company.get("work_schedule") if company else DEFAULT_WORK_SCHEDULE

    employees = list(db.employees.find({"company_id": user["company_id"]}, {"employee_id": 1, "name": 1}))
    employee_map = {item["employee_id"]: item["name"] for item in employees}
    employee_ids = [item["employee_id"] for item in employees]

    if search.strip():
        term = search.strip().lower()
        employee_ids = [
            item["employee_id"]
            for item in employees
            if term in item["employee_id"].lower() or term in item["name"].lower()
        ]

    if not employee_ids:
        return {"success": True, "data": []}

    records = list(db.attendance.find({
        "company_id": user["company_id"],
        "employee_id": {"$in": employee_ids},
        "timestamp": {"$gte": start, "$lte": end}
    }).sort("timestamp", -1))

    grouped = {}
    for record in records:
        date_key = record["timestamp"].date().isoformat()
        map_key = f"{record['employee_id']}-{date_key}"
        entry = grouped.setdefault(map_key, {
            "id": map_key,
            "employee_id": record["employee_id"],
            "employee_name": employee_map.get(record["employee_id"], record["employee_id"]),
            "date": date_key,
            "records": []
        })
        entry["records"].append(record)

    response_data = []
    for entry in grouped.values():
        metrics = build_daily_work_metrics(entry["records"], work_schedule)
        response_data.append({
            "id": entry["id"],
            "employee_id": entry["employee_id"],
            "employee_name": entry["employee_name"],
            "date": entry["date"],
            "check_in": metrics["check_in"],
            "check_out": metrics["check_out"],
            "status": "In Progress" if metrics["in_progress"] else ("Completed" if metrics["session_count"] > 0 else "Absent"),
            "expected_hours": metrics["expected_hours"],
            "worked_hours": metrics["worked_hours"],
            "overtime_hours": metrics["overtime_hours"],
            "session_count": metrics["session_count"],
            "sessions": metrics["sessions"]
        })

    response_data.sort(key=lambda item: (item["date"], item["employee_name"]), reverse=True)
    return {"success": True, "meta": {"filter_mode": mode, "start": start, "end": end}, "data": response_data}


@router.get("/summary")
def get_dashboard_summary(user=Depends(get_current_user)):
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999000)
    week_start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)

    company = db.companies.find_one({"_id": ObjectId(user["company_id"])}, {"work_schedule": 1})
    work_schedule = company.get("work_schedule") if company else DEFAULT_WORK_SCHEDULE
    employees = list(db.employees.find({"company_id": user["company_id"]}))
    devices = list(db.devices.find({"company_id": user["company_id"]}))
    today_records = list(db.attendance.find({
        "company_id": user["company_id"],
        "timestamp": {"$gte": today_start, "$lte": today_end}
    }).sort("timestamp", 1))
    weekly_records = list(db.attendance.find({
        "company_id": user["company_id"],
        "timestamp": {"$gte": week_start, "$lte": today_end}
    }))

    attendance_by_employee = {}
    for record in today_records:
        attendance_by_employee.setdefault(record["employee_id"], []).append(record)

    daily_metrics = [build_daily_work_metrics(records, work_schedule) for records in attendance_by_employee.values()]
    present_today = sum(1 for item in daily_metrics if item["check_in"])
    late_employees = 0
    for item in daily_metrics:
        if item["check_in"]:
            late_threshold = item["check_in"].replace(hour=9, minute=20, second=0, microsecond=0)
            if item["check_in"] > late_threshold:
                late_employees += 1

    total_work_hours = round(sum(item["worked_hours"] for item in daily_metrics), 1)
    total_overtime_hours = round(sum(item["overtime_hours"] for item in daily_metrics), 1)

    weekly_data = []
    for index in range(6, -1, -1):
        day_start = (now - timedelta(days=index)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start.replace(hour=23, minute=59, second=59, microsecond=999000)
        day_records = [record for record in weekly_records if day_start <= record["timestamp"] <= day_end]
        unique_present = {record["employee_id"] for record in day_records if record["type"] == "check_in"}
        weekly_data.append({"label": day_start.strftime("%a"), "present": len(unique_present)})

    monthly_data = []
    for index in range(5, -1, -1):
        month = now.month - index
        year = now.year
        while month <= 0:
            month += 12
            year -= 1
        month_start = datetime(year, month, 1)
        if month == 12:
            month_end = datetime(year + 1, 1, 1) - timedelta(milliseconds=1)
        else:
            month_end = datetime(year, month + 1, 1) - timedelta(milliseconds=1)
        month_records = list(db.attendance.find({
            "company_id": user["company_id"],
            "timestamp": {"$gte": month_start, "$lte": month_end},
            "type": "check_in"
        }))
        present = len({f"{record['employee_id']}-{record['timestamp'].date().isoformat()}" for record in month_records})
        monthly_data.append({"label": month_start.strftime("%b"), "present": present})

    return {
        "success": True,
        "data": {
            "stats": {
                "totalEmployees": len(employees),
                "presentToday": present_today,
                "lateEmployees": late_employees,
                "totalWorkHours": total_work_hours,
                "totalOvertimeHours": total_overtime_hours,
                "totalDevices": len(devices),
                "workSchedule": work_schedule
            },
            "charts": {
                "weeklyAttendance": weekly_data,
                "monthlyTrend": monthly_data
            }
        }
    }


@router.post("/mark")
def mark_attendance(payload: AttendanceMarkRequest, user=Depends(get_current_user)):
    verify_device_and_employee(user["company_id"], payload.employee_id, payload.device_id)
    record_type = resolve_attendance_type_for_day(user["company_id"], payload.employee_id, payload.timestamp)
    if not record_type:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendance already completed for today.")
    if is_duplicate_attendance(user["company_id"], payload.employee_id, payload.timestamp, record_type, payload.device_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate attendance record detected.")

    attendance = {
        "company_id": user["company_id"],
        "employee_id": payload.employee_id,
        "device_id": payload.device_id,
        "timestamp": payload.timestamp,
        "type": record_type,
        "synced": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    inserted_id = db.attendance.insert_one(attendance).inserted_id
    attendance["_id"] = inserted_id
    db.devices.update_one(
        {"company_id": user["company_id"], "device_id": payload.device_id},
        {"$set": {"last_active": datetime.utcnow()}}
    )
    return {"success": True, "message": f"Attendance {record_type} recorded successfully.", "data": serialize_document(attendance)}


@router.post("/mark-web")
def mark_web_attendance(payload: AttendanceMarkRequest, user=Depends(get_current_user)):
    verify_active_employee(user["company_id"], payload.employee_id)
    record_type = resolve_attendance_type_for_day(user["company_id"], payload.employee_id, payload.timestamp)
    if not record_type:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendance already completed for today.")
    if is_duplicate_attendance(user["company_id"], payload.employee_id, payload.timestamp, record_type, payload.device_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate attendance record detected.")

    attendance = {
        "company_id": user["company_id"],
        "employee_id": payload.employee_id,
        "device_id": payload.device_id or "web-dashboard",
        "timestamp": payload.timestamp,
        "type": record_type,
        "synced": True,
        "source": "web_dashboard",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    inserted_id = db.attendance.insert_one(attendance).inserted_id
    attendance["_id"] = inserted_id
    return {"success": True, "message": f"Web attendance {record_type} recorded successfully.", "data": serialize_document(attendance)}


@router.post("/sync")
def sync_attendance(payload: AttendanceSyncRequest, user=Depends(get_current_user)):
    results = []
    for record in sorted(payload.records, key=lambda item: item.timestamp):
        try:
            verify_device_and_employee(user["company_id"], record.employee_id, record.device_id)
            record_type = resolve_attendance_type_for_day(user["company_id"], record.employee_id, record.timestamp)
            if not record_type:
                results.append({
                    "employee_id": record.employee_id,
                    "device_id": record.device_id,
                    "timestamp": record.timestamp,
                    "success": False,
                    "message": "Attendance already completed for that day."
                })
                continue
            if is_duplicate_attendance(user["company_id"], record.employee_id, record.timestamp, record_type, record.device_id):
                results.append({
                    "employee_id": record.employee_id,
                    "device_id": record.device_id,
                    "timestamp": record.timestamp,
                    "success": False,
                    "message": "Duplicate attendance record detected."
                })
                continue

            attendance = {
                "company_id": user["company_id"],
                "employee_id": record.employee_id,
                "device_id": record.device_id,
                "timestamp": record.timestamp,
                "type": record_type,
                "synced": True,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            attendance_id = db.attendance.insert_one(attendance).inserted_id
            db.devices.update_one(
                {"company_id": user["company_id"], "device_id": record.device_id},
                {"$set": {"last_active": datetime.utcnow()}}
            )
            results.append({
                "employee_id": record.employee_id,
                "device_id": record.device_id,
                "timestamp": record.timestamp,
                "success": True,
                "type": record_type,
                "attendance_id": str(attendance_id)
            })
        except HTTPException as exc:
            results.append({
                "employee_id": record.employee_id,
                "device_id": record.device_id,
                "timestamp": record.timestamp,
                "success": False,
                "message": exc.detail
            })
    return {"success": True, "message": "Attendance sync processed.", "data": results}
