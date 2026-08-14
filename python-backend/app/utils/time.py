from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo


IST = ZoneInfo("Asia/Kolkata")
LEGACY_IST = "Asia/Calcutta"


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_utc_naive(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=IST).astimezone(timezone.utc).replace(tzinfo=None)
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def to_ist(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).astimezone(IST)
    return value.astimezone(IST)


def ist_day_range(value: datetime | None = None) -> tuple[datetime, datetime]:
    current = to_ist(value) if value else datetime.now(IST)
    start_ist = datetime.combine(current.date(), time.min, tzinfo=IST)
    end_ist = datetime.combine(current.date(), time.max, tzinfo=IST)
    return to_utc_naive(start_ist), to_utc_naive(end_ist)


def ist_date_range(date_value: str) -> tuple[datetime, datetime]:
    selected = datetime.fromisoformat(date_value).date()
    start_ist = datetime.combine(selected, time.min, tzinfo=IST)
    end_ist = datetime.combine(selected, time.max, tzinfo=IST)
    return to_utc_naive(start_ist), to_utc_naive(end_ist)


def ist_custom_range(start_date: str, end_date: str) -> tuple[datetime, datetime]:
    start_selected = datetime.fromisoformat(start_date).date()
    end_selected = datetime.fromisoformat(end_date).date()
    start_ist = datetime.combine(start_selected, time.min, tzinfo=IST)
    end_ist = datetime.combine(end_selected, time.max, tzinfo=IST)
    return to_utc_naive(start_ist), to_utc_naive(end_ist)


def ist_iso_date(value: datetime) -> str:
    return to_ist(value).date().isoformat()
