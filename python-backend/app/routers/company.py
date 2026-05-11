from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import ReturnDocument

from ..database import db
from ..dependencies import get_current_user, serialize_document
from ..schemas import CompanySettingsUpdateRequest
from ..utils.work_schedule import DEFAULT_WORK_SCHEDULE


router = APIRouter(prefix="/company", tags=["company"])


@router.get("/settings")
def get_company_settings(user=Depends(get_current_user)):
    company = db.companies.find_one({"_id": ObjectId(user["company_id"])})
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
    return {
        "success": True,
        "data": {
            "company_name": company["company_name"],
            "admin_email": company["admin_email"],
            "subscription_plan": company["subscription_plan"],
            "work_schedule": company.get("work_schedule") or DEFAULT_WORK_SCHEDULE,
            "kiosk_admin_pin": company.get("kiosk_admin_pin")
        }
    }


@router.put("/settings")
def update_company_settings(payload: CompanySettingsUpdateRequest, user=Depends(get_current_user)):
    company = db.companies.find_one({"_id": ObjectId(user["company_id"])})
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")

    updates = payload.model_dump(exclude_none=True)
    if "work_schedule" in updates and company.get("work_schedule"):
        updates["work_schedule"] = {**company.get("work_schedule", {}), **updates["work_schedule"]}

    company = db.companies.find_one_and_update(
        {"_id": company["_id"]},
        {"$set": updates},
        return_document=ReturnDocument.AFTER
    )

    serialized = serialize_document(company)
    return {
        "success": True,
        "message": "Company settings updated successfully.",
        "data": {
            "company_name": serialized["company_name"],
            "admin_email": serialized["admin_email"],
            "subscription_plan": serialized["subscription_plan"],
            "work_schedule": serialized.get("work_schedule") or DEFAULT_WORK_SCHEDULE,
            "kiosk_admin_pin": serialized.get("kiosk_admin_pin")
        }
    }
