"""Pydantic schemas for API."""
from datetime import datetime
from pydantic import BaseModel, EmailStr


# Auth
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserResponse(BaseModel):
    id: str  # UUID string from Supabase
    email: str
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Patients
class PatientCreate(BaseModel):
    name: str
    date_of_birth: str | None = None
    initial_concern: str | None = None
    force: bool = False  # If True, skip duplicate check and create anyway


class PatientResponse(BaseModel):
    id: int
    name: str
    date_of_birth: str | None
    initial_concern: str | None
    created_at: datetime
    last_entry_date: str | None = None
    latest_status: str | None = None
    risk_score: int | None = None
    confidence: float | None = None
    total_entries: int = 0
    flagged_for_followup: bool = False

    class Config:
        from_attributes = True


class PatientFlagUpdate(BaseModel):
    flagged: bool


# Journal entries
class JournalEntryCreate(BaseModel):
    text: str
    practitioner_notes: str | None = None


class JournalEntryResponse(BaseModel):
    id: int
    patient_id: int
    text: str
    practitioner_notes: str | None
    prediction: str
    confidence: float
    risk_score: int
    sentiment_polarity: str | None
    sentiment_score: int | None
    detected_patterns: str | None
    created_at: datetime

    class Config:
        from_attributes = True
