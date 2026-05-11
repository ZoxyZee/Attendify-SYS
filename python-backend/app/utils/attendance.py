from datetime import datetime, timedelta

from ..database import db


DUPLICATE_WINDOW_MS = 60 * 1000


def get_day_range(timestamp: datetime) -> tuple[datetime, datetime]:
    start = timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
    end = timestamp.replace(hour=23, minute=59, second=59, microsecond=999000)
    return start, end


def resolve_attendance_type_for_day(company_id: str, employee_id: str, timestamp: datetime) -> str | None:
    start, end = get_day_range(timestamp)
    records = list(
        db.attendance.find({
            "company_id": company_id,
            "employee_id": employee_id,
            "timestamp": {"$gte": start, "$lte": end}
        }).sort("timestamp", 1)
    )

    if not records:
        return "check_in"

    return "check_out" if records[-1]["type"] == "check_in" else "check_in"


def is_duplicate_attendance(company_id: str, employee_id: str, timestamp: datetime, record_type: str, device_id: str | None) -> bool:
    exact_match = db.attendance.find_one({
        "company_id": company_id,
        "employee_id": employee_id,
        "timestamp": timestamp,
        "type": record_type
    })
    if exact_match:
        return True

    query = {
        "company_id": company_id,
        "employee_id": employee_id,
        "type": record_type,
        "timestamp": {
            "$gte": timestamp - timedelta(milliseconds=DUPLICATE_WINDOW_MS),
            "$lte": timestamp + timedelta(milliseconds=DUPLICATE_WINDOW_MS)
        }
    }
    if device_id:
        query["device_id"] = device_id

    return db.attendance.find_one(query) is not None
