from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import db
from ..dependencies import get_current_user, serialize_document, serialize_value
from ..routers.recognition import EmployeePayload, decode_image, get_single_face_from_capture, recognize_face
from ..schemas import AttendanceMarkRequest, AttendanceSyncRequest, FaceAttendanceMarkRequest
from ..utils.attendance import is_duplicate_attendance, resolve_attendance_type_for_day
from ..utils.time import ist_custom_range, ist_date_range, ist_day_range, ist_iso_date, to_ist, to_utc_naive, utc_now_naive
from ..utils.work_schedule import DEFAULT_WORK_SCHEDULE, build_daily_work_metrics


router = APIRouter(prefix="/attendance", tags=["attendance"])


def build_range(filter_mode: str = "today", date: str = "", start_date: str = "", end_date: str = ""):
    now_ist = to_ist(utc_now_naive())
    if date:
        start, end = ist_date_range(date)
        return start, end, "date"
    if start_date or end_date:
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Both startDate and endDate are required for a custom range.")
        start, end = ist_custom_range(start_date, end_date)
        if start > end:
            raise HTTPException(status_code=400, detail="Start date cannot be after end date.")
        return start, end, "range"
    if filter_mode == "today":
        start, end = ist_day_range()
        return start, end, "today"
    if filter_mode == "week":
        diff = 6 if now_ist.weekday() == 6 else now_ist.weekday()
        start, _ = ist_day_range(now_ist - timedelta(days=diff))
        _, end = ist_day_range(now_ist)
        return start, end, "week"
    month_start_ist = now_ist.replace(day=1)
    start, _ = ist_day_range(month_start_ist)
    if now_ist.month == 12:
        next_month_ist = now_ist.replace(year=now_ist.year + 1, month=1, day=1)
    else:
        next_month_ist = now_ist.replace(month=now_ist.month + 1, day=1)
    end, _ = ist_day_range(next_month_ist)
    end = end - timedelta(milliseconds=1)
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


def build_recognition_candidates(company_id: str) -> list[EmployeePayload]:
    employees = db.employees.find(
        {"company_id": company_id, "status": "active"},
        {"employee_id": 1, "name": 1, "face_embedding": 1, "face_embeddings": 1}
    )
    candidates = []
    for employee in employees:
        embeddings = []
        if isinstance(employee.get("face_embeddings"), list):
            embeddings.extend([item for item in employee["face_embeddings"] if isinstance(item, list) and item])
        if isinstance(employee.get("face_embedding"), list) and employee["face_embedding"]:
            embeddings.append(employee["face_embedding"])
        if embeddings:
            candidates.append(EmployeePayload(
                employee_id=employee["employee_id"],
                name=employee.get("name") or employee["employee_id"],
                embeddings=embeddings
            ))
    return candidates


def create_attendance_record(company_id: str, employee_id: str, device_id: str, timestamp: datetime, source: str = "kiosk"):
    record_type = resolve_attendance_type_for_day(company_id, employee_id, timestamp)
    if not record_type:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendance already completed for today.")
    if is_duplicate_attendance(company_id, employee_id, timestamp, record_type, device_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate attendance record detected.")

    attendance = {
        "company_id": company_id,
        "employee_id": employee_id,
        "device_id": device_id,
        "timestamp": timestamp,
        "type": record_type,
        "synced": True,
        "source": source,
        "createdAt": utc_now_naive(),
        "updatedAt": utc_now_naive()
    }
    inserted_id = db.attendance.insert_one(attendance).inserted_id
    attendance["_id"] = inserted_id
    return attendance


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
        date_key = ist_iso_date(record["timestamp"])
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
            "check_in": serialize_value(metrics["check_in"]),
            "check_out": serialize_value(metrics["check_out"]),
            "status": "In Progress" if metrics["in_progress"] else ("Completed" if metrics["session_count"] > 0 else "Absent"),
            "expected_hours": metrics["expected_hours"],
            "worked_hours": metrics["worked_hours"],
            "overtime_hours": metrics["overtime_hours"],
            "session_count": metrics["session_count"],
            "sessions": serialize_value(metrics["sessions"])
        })

    response_data.sort(key=lambda item: (item["date"], item["employee_name"]), reverse=True)
    return {
        "success": True,
        "meta": {"filter_mode": mode, "start": serialize_value(start), "end": serialize_value(end)},
        "data": response_data
    }


@router.get("/summary")
def get_dashboard_summary(user=Depends(get_current_user)):
    now = to_ist(utc_now_naive())
    today_start, today_end = ist_day_range()
    week_start, _ = ist_day_range(now - timedelta(days=6))

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
        day_start, day_end = ist_day_range(now - timedelta(days=index))
        day_records = [record for record in weekly_records if day_start <= record["timestamp"] <= day_end]
        unique_present = {record["employee_id"] for record in day_records if record["type"] == "check_in"}
        weekly_data.append({"label": to_ist(day_start).strftime("%a"), "present": len(unique_present)})

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
        month_start, _ = ist_day_range(month_start)
        _, month_end = ist_day_range(month_end)
        month_records = list(db.attendance.find({
            "company_id": user["company_id"],
            "timestamp": {"$gte": month_start, "$lte": month_end},
            "type": "check_in"
        }))
        present = len({f"{record['employee_id']}-{ist_iso_date(record['timestamp'])}" for record in month_records})
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
    timestamp = to_utc_naive(payload.timestamp)
    verify_device_and_employee(user["company_id"], payload.employee_id, payload.device_id)
    attendance = create_attendance_record(user["company_id"], payload.employee_id, payload.device_id, timestamp)
    db.devices.update_one(
        {"company_id": user["company_id"], "device_id": payload.device_id},
        {"$set": {"last_active": utc_now_naive()}}
    )
    return {"success": True, "message": f"Attendance {attendance['type']} recorded successfully.", "data": serialize_document(attendance)}


@router.post("/mark-face")
def mark_face_attendance(payload: FaceAttendanceMarkRequest, user=Depends(get_current_user)):
    timestamp = to_utc_naive(payload.timestamp)
    device = db.devices.find_one({"company_id": user["company_id"], "device_id": payload.device_id})
    if not device:
        raise HTTPException(status_code=400, detail="Device is not registered for this company.")

    candidates = build_recognition_candidates(user["company_id"])
    if not candidates:
        raise HTTPException(status_code=400, detail="No registered employee face profiles found for this company.")

    face = get_single_face_from_capture(decode_image(payload.image_base64))
    match = recognize_face(face, candidates)
    verify_active_employee(user["company_id"], match["employee_id"])
    attendance = create_attendance_record(user["company_id"], match["employee_id"], payload.device_id, timestamp, "kiosk_face")
    db.devices.update_one(
        {"company_id": user["company_id"], "device_id": payload.device_id},
        {"$set": {"last_active": utc_now_naive()}}
    )
    data = serialize_document(attendance)
    data["employee_name"] = match["employee_name"]
    data["confidence"] = match["confidence"]
    data["similarity"] = match["similarity"]
    data["recognition"] = match
    return {"success": True, "message": f"Attendance {attendance['type']} recorded successfully.", "data": data}


@router.post("/mark-web")
def mark_web_attendance(payload: AttendanceMarkRequest, user=Depends(get_current_user)):
    timestamp = to_utc_naive(payload.timestamp)
    verify_active_employee(user["company_id"], payload.employee_id)
    attendance = create_attendance_record(
        user["company_id"],
        payload.employee_id,
        payload.device_id or "web-dashboard",
        timestamp,
        "web_dashboard"
    )
    return {"success": True, "message": f"Web attendance {attendance['type']} recorded successfully.", "data": serialize_document(attendance)}


@router.post("/sync")
def sync_attendance(payload: AttendanceSyncRequest, user=Depends(get_current_user)):
    results = []
    for record in sorted(payload.records, key=lambda item: item.timestamp):
        try:
            timestamp = to_utc_naive(record.timestamp)
            verify_device_and_employee(user["company_id"], record.employee_id, record.device_id)
            record_type = resolve_attendance_type_for_day(user["company_id"], record.employee_id, timestamp)
            if not record_type:
                results.append({
                    "employee_id": record.employee_id,
                    "device_id": record.device_id,
                    "timestamp": timestamp,
                    "success": False,
                    "message": "Attendance already completed for that day."
                })
                continue
            if is_duplicate_attendance(user["company_id"], record.employee_id, timestamp, record_type, record.device_id):
                results.append({
                    "employee_id": record.employee_id,
                    "device_id": record.device_id,
                    "timestamp": timestamp,
                    "success": False,
                    "message": "Duplicate attendance record detected."
                })
                continue

            attendance = {
                "company_id": user["company_id"],
                "employee_id": record.employee_id,
                "device_id": record.device_id,
                "timestamp": timestamp,
                "type": record_type,
                "synced": True,
                "createdAt": utc_now_naive(),
                "updatedAt": utc_now_naive()
            }
            attendance_id = db.attendance.insert_one(attendance).inserted_id
            db.devices.update_one(
                {"company_id": user["company_id"], "device_id": record.device_id},
                    {"$set": {"last_active": utc_now_naive()}}
            )
            results.append({
                "employee_id": record.employee_id,
                "device_id": record.device_id,
                "timestamp": timestamp,
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
