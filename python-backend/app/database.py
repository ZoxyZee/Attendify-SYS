from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from .config import settings


DATABASE_MODE = "mongodb"
DATABASE_ERROR = ""


def _get_database_name() -> str:
    database_name = settings.mongodb_uri.rsplit("/", 1)[-1].split("?", 1)[0].strip()
    return database_name or "attendify"


def _create_mongo_client():
    return MongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=3000,
        connectTimeoutMS=3000,
        socketTimeoutMS=3000
    )


def _create_development_fallback_client():
    try:
        import mongomock
    except ImportError:
        return None

    return mongomock.MongoClient()


client = _create_mongo_client()

try:
    client.admin.command("ping")
except PyMongoError as exc:
    DATABASE_ERROR = str(exc)
    if settings.node_env == "production" or not settings.allow_memory_db:
        raise RuntimeError(
            "MongoDB is not reachable. Start MongoDB on the configured MONGODB_URI "
            f"({settings.mongodb_uri}) or set ALLOW_MEMORY_DB=true for temporary local-only testing."
        ) from exc

    fallback_client = _create_development_fallback_client()
    if fallback_client is not None:
        client = fallback_client
        DATABASE_MODE = "development-memory"

db = client.get_database(_get_database_name())


def check_database_connection() -> tuple[bool, str]:
    try:
        client.admin.command("ping")
    except (PyMongoError, ServerSelectionTimeoutError) as exc:
        return False, str(exc)

    if DATABASE_MODE == "development-memory":
        return False, "Using in-memory development database because MongoDB is not reachable. Data is not persistent."

    return True, "MongoDB connection is healthy."


def ensure_indexes():
    db.companies.create_index("admin_email", unique=True)
    db.users.create_index("email", unique=True)
    db.users.create_index("company_id")
    db.employees.create_index([("company_id", 1), ("employee_id", 1)], unique=True)
    db.devices.create_index([("company_id", 1), ("device_id", 1)], unique=True)
    db.attendance.create_index([("company_id", 1), ("employee_id", 1), ("type", 1), ("timestamp", 1)], unique=True)
    db.attendance.create_index([("company_id", 1), ("employee_id", 1), ("timestamp", 1)])
