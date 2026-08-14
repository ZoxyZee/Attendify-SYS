from datetime import datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class WorkSchedule(BaseModel):
    start_time: str = "09:00"
    end_time: str = "18:00"
    timezone: str = "Asia/Calcutta"


class RegisterCompanyRequest(BaseModel):
    company_name: str
    admin_email: EmailStr
    subscription_plan: str = "basic"
    name: str
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class EmployeeCreateRequest(BaseModel):
    employee_id: str
    name: str
    department: str
    face_label: str = ""
    face_embedding: List[float] = Field(default_factory=list)
    face_embeddings: List[List[float]] = Field(default_factory=list)
    face_image_base64: str = ""
    embedding_engine: Optional[str] = None
    face_registered_at: Optional[datetime] = None
    status: Literal["active", "inactive"] = "active"


class EmployeeUpdateRequest(BaseModel):
    employee_id: str
    name: Optional[str] = None
    department: Optional[str] = None
    face_label: Optional[str] = None
    face_embedding: Optional[List[float]] = None
    face_embeddings: Optional[List[List[float]]] = None
    face_image_base64: Optional[str] = None
    embedding_engine: Optional[str] = None
    face_registered_at: Optional[datetime] = None
    status: Optional[Literal["active", "inactive"]] = None


class DeviceRegisterRequest(BaseModel):
    device_id: str
    device_name: str


class AttendanceMarkRequest(BaseModel):
    employee_id: str
    device_id: str
    timestamp: datetime


class FaceAttendanceMarkRequest(BaseModel):
    image_base64: str
    device_id: str
    timestamp: datetime


class AttendanceSyncRecord(BaseModel):
    employee_id: str
    device_id: str
    timestamp: datetime


class AttendanceSyncRequest(BaseModel):
    records: List[AttendanceSyncRecord]


class CompanySettingsUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    subscription_plan: Optional[str] = None
    work_schedule: Optional[WorkSchedule] = None
    kiosk_admin_pin: Optional[str] = None


class ApiResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Any = None
    meta: Any = None
