# backend/schemas.py
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime

# ---------- Assignment output (used inside SectionOut) ----------
class AssignmentOut(BaseModel):
    id: int
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    reference_filename: Optional[str] = None
    created_at: Optional[datetime] = None
    created_by: Optional[int] = None
    section_id: Optional[int] = None

    class Config:
        from_attributes = True  # pydantic v2 replacement for orm_mode

# ---------- User / Auth ----------
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "student"

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# ---------- Section schemas ----------
class SectionCreate(BaseModel):
    subject: str
    access_code: str

class JoinSection(BaseModel):
    code: Optional[str] = None
    access_code: Optional[str] = None

    @model_validator(mode="before")
    def require_one_code(cls, values):
        # values may be dict-like at this stage
        if isinstance(values, dict):
            code = values.get("code")
            access = values.get("access_code")
        else:
            code = getattr(values, "code", None)
            access = getattr(values, "access_code", None)

        if not (code or access):
            raise ValueError("Either 'code' or 'access_code' must be provided")
        return values

class SectionOut(BaseModel):
    id: int
    subject: str
    access_code: str
    created_by: int
    assignments: List[AssignmentOut] = Field(default_factory=list)

    class Config:
        from_attributes = True

# ---------- Submission / Result outputs ----------
class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    filename: str
    similarity_score: Optional[float] = None
    ai_label: Optional[str] = None
    ai_confidence: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
