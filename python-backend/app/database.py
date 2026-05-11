from pymongo import MongoClient

from .config import settings


client = MongoClient(settings.mongodb_uri)
db = client.get_default_database()


def ensure_indexes():
    db.companies.create_index("admin_email", unique=True)
    db.users.create_index("email", unique=True)
    db.users.create_index("company_id")
    db.employees.create_index([("company_id", 1), ("employee_id", 1)], unique=True)
    db.devices.create_index([("company_id", 1), ("device_id", 1)], unique=True)
    db.attendance.create_index([("company_id", 1), ("employee_id", 1), ("type", 1), ("timestamp", 1)], unique=True)
    db.attendance.create_index([("company_id", 1), ("employee_id", 1), ("timestamp", 1)])
