from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from ..database import db
from ..dependencies import sanitize_user, serialize_document
from ..schemas import LoginRequest, RegisterCompanyRequest
from ..security import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register-company")
def register_company(payload: RegisterCompanyRequest):
    admin_email = payload.admin_email.lower()
    existing_company = db.companies.find_one({"admin_email": admin_email})
    if existing_company:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A company with this admin email already exists.")

    company = {
        "company_name": payload.company_name,
        "admin_email": admin_email,
        "subscription_plan": payload.subscription_plan,
        "work_schedule": {
            "start_time": "09:00",
            "end_time": "18:00",
            "timezone": "Asia/Calcutta"
        },
        "created_at": datetime.utcnow()
    }
    company_id = db.companies.insert_one(company).inserted_id
    company["_id"] = company_id

    user = {
        "company_id": str(company_id),
        "name": payload.name,
        "email": admin_email,
        "password_hash": hash_password(payload.password),
        "role": "admin",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    user_id = db.users.insert_one(user).inserted_id
    user["_id"] = user_id

    token = create_access_token({
        "user_id": str(user_id),
        "company_id": str(company_id),
        "role": user["role"]
    })

    return {
        "success": True,
        "message": "Company registered successfully.",
        "data": {
            "token": token,
            "company_id": str(company_id),
            "company": serialize_document(company),
            "user": sanitize_user(user)
        }
    }


@router.post("/login")
def login(payload: LoginRequest):
    user = db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = create_access_token({
        "user_id": str(user["_id"]),
        "company_id": user["company_id"],
        "role": user["role"]
    })

    return {
        "success": True,
        "message": "Login successful.",
        "data": {
            "token": token,
            "company_id": user["company_id"],
            "user": sanitize_user(user)
        }
    }
