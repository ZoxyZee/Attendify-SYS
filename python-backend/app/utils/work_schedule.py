from datetime import datetime


DEFAULT_WORK_SCHEDULE = {
    "start_time": "09:00",
    "end_time": "18:00",
    "timezone": "Asia/Calcutta"
}


def parse_time_to_minutes(value: str | None) -> int:
    if not value or ":" not in value:
        return 0
    hours, minutes = value.split(":")
    try:
        return int(hours) * 60 + int(minutes)
    except ValueError:
        return 0


def get_expected_work_hours(work_schedule: dict | None) -> float:
    schedule = work_schedule or DEFAULT_WORK_SCHEDULE
    duration = max(0, parse_time_to_minutes(schedule.get("end_time")) - parse_time_to_minutes(schedule.get("start_time")))
    return duration / 60


def get_worked_hours(check_in: datetime | None, check_out: datetime | None) -> float:
    if not check_in or not check_out:
        return 0
    return max(0, (check_out - check_in).total_seconds() / 3600)


def build_session_summary(records: list[dict]) -> dict:
    sorted_records = sorted(records, key=lambda item: item["timestamp"])
    sessions = []
    open_check_in = None

    for record in sorted_records:
        if record["type"] == "check_in":
            open_check_in = record["timestamp"]
            continue
        if record["type"] == "check_out" and open_check_in:
            sessions.append({
                "check_in": open_check_in,
                "check_out": record["timestamp"],
                "worked_hours": get_worked_hours(open_check_in, record["timestamp"])
            })
            open_check_in = None

    first_session = sessions[0] if sessions else None
    last_session = sessions[-1] if sessions else None
    worked_hours = sum(session["worked_hours"] for session in sessions)

    return {
        "sessions": sessions,
        "session_count": len(sessions),
        "check_in": first_session["check_in"] if first_session else open_check_in,
        "check_out": last_session["check_out"] if last_session else None,
        "worked_hours": worked_hours,
        "in_progress": bool(open_check_in)
    }


def build_daily_work_metrics(records: list[dict], work_schedule: dict | None) -> dict:
    expected_hours = get_expected_work_hours(work_schedule)
    session_summary = build_session_summary(records)
    overtime_hours = max(0, session_summary["worked_hours"] - expected_hours)
    return {
        **session_summary,
        "expected_hours": round(expected_hours, 1),
        "worked_hours": round(session_summary["worked_hours"], 1),
        "overtime_hours": round(overtime_hours, 1)
    }
