from datetime import datetime

from pydantic import BaseModel
from pymongo import ReturnDocument
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status

from ..database import db
from ..dependencies import get_current_user, serialize_document
from ..schemas import EmployeeCreateRequest, EmployeeUpdateRequest


router = APIRouter(prefix="/employees", tags=["employees"])


class EmployeeDeleteRequest(BaseModel):
    employee_id: str


@router.post("/create")
def create_employee(payload: EmployeeCreateRequest, user=Depends(get_current_user)):
    company_id = user["company_id"]
    if db.employees.find_one({"company_id": company_id, "employee_id": payload.employee_id}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee already exists for this company.")

    employee = {
        "company_id": company_id,
        "employee_id": payload.employee_id,
        "name": payload.name,
        "department": payload.department,
        "face_label": payload.face_label or "",
        "face_embedding": payload.face_embedding,
        "face_embeddings": payload.face_embeddings[:5],
        "face_image_base64": payload.face_image_base64 or "",
        "embedding_engine": payload.embedding_engine,
        "face_registered_at": payload.face_registered_at or (datetime.utcnow() if (payload.face_label or payload.face_embeddings) else None),
        "status": payload.status,
        "created_at": datetime.utcnow()
    }
    employee_id = db.employees.insert_one(employee).inserted_id
    employee["_id"] = employee_id
    return {"success": True, "message": "Employee created successfully.", "data": serialize_document(employee)}


@router.get("/list")
def list_employees(user=Depends(get_current_user)):
    employees = [serialize_document(item) for item in db.employees.find({"company_id": user["company_id"]}).sort("created_at", -1)]
    return {"success": True, "data": employees}


@router.put("/update")
def update_employee(payload: EmployeeUpdateRequest, user=Depends(get_current_user)):
    updates = payload.model_dump(exclude_none=True)
    if "face_embeddings" in updates:
        updates["face_embeddings"] = updates["face_embeddings"][:5]
    employee = db.employees.find_one_and_update(
        {"company_id": user["company_id"], "employee_id": payload.employee_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    return {"success": True, "message": "Employee updated successfully.", "data": serialize_document(employee)}


@router.delete("/delete")
def delete_employee(
    employee_id: str | None = Query(None),
    payload: EmployeeDeleteRequest | None = Body(default=None),
    user=Depends(get_current_user)
):
    resolved_employee_id = employee_id or (payload.employee_id if payload else None)

    if not resolved_employee_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="employee_id is required.")

    result = db.employees.find_one_and_delete(
        {"company_id": user["company_id"], "employee_id": resolved_employee_id}
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    return {"success": True, "message": "Employee deleted successfully."}
