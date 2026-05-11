from datetime import datetime

from fastapi import APIRouter, Depends
from pymongo import ReturnDocument

from ..database import db
from ..dependencies import get_current_user, serialize_document
from ..schemas import DeviceRegisterRequest


router = APIRouter(prefix="/devices", tags=["devices"])


@router.post("/register")
def register_device(payload: DeviceRegisterRequest, user=Depends(get_current_user)):
    device = db.devices.find_one_and_update(
        {"company_id": user["company_id"], "device_id": payload.device_id},
        {"$set": {
            "company_id": user["company_id"],
            "device_id": payload.device_id,
            "device_name": payload.device_name,
            "last_active": datetime.utcnow()
        }},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return {"success": True, "message": "Device registered successfully.", "data": serialize_document(device)}


@router.get("/list")
def list_devices(user=Depends(get_current_user)):
    devices = [serialize_document(item) for item in db.devices.find({"company_id": user["company_id"]}).sort("last_active", -1)]
    return {"success": True, "data": devices}
