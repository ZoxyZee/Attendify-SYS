from typing import Any, Dict

from bson import ObjectId
from datetime import datetime
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .database import db
from .security import decode_access_token


bearer_scheme = HTTPBearer(auto_error=False)


def serialize_value(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return f"{value.isoformat()}Z" if value.tzinfo is None else value.isoformat()
    if isinstance(value, list):
        return [serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize_value(item) for key, item in value.items()}
    return value


def serialize_document(document: Dict[str, Any] | None) -> Dict[str, Any] | None:
    if not document:
        return None

    return {key: serialize_value(value) for key, value in document.items()}


def sanitize_user(user: Dict[str, Any]) -> Dict[str, Any]:
    serialized = serialize_document(user) or {}
    serialized.pop("password_hash", None)
    return serialized


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized.")

    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user_id = payload.get("user_id")
    company_id = payload.get("company_id")
    if not user_id or not company_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session.")

    try:
        user_object_id = ObjectId(user_id)
        company_object_id = ObjectId(company_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session.") from exc

    user = db.users.find_one({"_id": user_object_id, "company_id": company_id})
    company = db.companies.find_one({"_id": company_object_id})
    if not user or not company:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session no longer exists.")

    current_user = sanitize_user(user)
    current_user["company_id"] = company_id
    current_user["role"] = user.get("role", payload.get("role", "admin"))

    request.state.user = current_user
    request.state.company_id = company_id
    return current_user
