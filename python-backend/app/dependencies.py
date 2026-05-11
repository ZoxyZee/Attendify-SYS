from typing import Any, Dict

from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .security import decode_access_token


bearer_scheme = HTTPBearer(auto_error=False)


def serialize_document(document: Dict[str, Any] | None) -> Dict[str, Any] | None:
    if not document:
        return None

    serialized = {}
    for key, value in document.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, list):
            serialized[key] = [str(item) if isinstance(item, ObjectId) else item for item in value]
        else:
            serialized[key] = value
    return serialized


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

    request.state.user = payload
    request.state.company_id = payload.get("company_id")
    return payload
