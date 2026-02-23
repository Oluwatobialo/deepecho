"""Patients and journal entries API (auth required)."""
import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models_db import User, Patient, JournalEntry
from schemas import PatientCreate, PatientResponse, JournalEntryCreate, JournalEntryResponse
from auth_supabase import get_current_user

router = APIRouter(prefix="/api/patients", tags=["patients"])


def _patient_response(p: Patient, last_entry: JournalEntry | None = None, total_entries: int = 0) -> PatientResponse:
    return PatientResponse(
        id=p.id,
        name=p.name,
        date_of_birth=p.date_of_birth,
        initial_concern=p.initial_concern,
        created_at=p.created_at,
        last_entry_date=last_entry.created_at.strftime("%Y-%m-%d") if last_entry else None,
        latest_status=last_entry.prediction if last_entry else None,
        risk_score=last_entry.risk_score if last_entry else None,
        confidence=last_entry.confidence if last_entry else None,
        total_entries=total_entries,
    )


@router.get("", response_model=list[PatientResponse])
def list_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patients = db.query(Patient).filter(Patient.user_id == current_user.id).order_by(Patient.created_at.desc()).all()
    out = []
    for p in patients:
        entries = db.query(JournalEntry).filter(JournalEntry.patient_id == p.id).order_by(desc(JournalEntry.created_at)).limit(1).all()
        count = db.query(JournalEntry).filter(JournalEntry.patient_id == p.id).count()
        last = entries[0] if entries else None
        out.append(_patient_response(p, last, count))
    return out


@router.post("", response_model=PatientResponse)
def create_patient(
    data: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = Patient(
        user_id=current_user.id,
        name=data.name,
        date_of_birth=data.date_of_birth,
        initial_concern=data.initial_concern,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return _patient_response(patient)


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    count = db.query(JournalEntry).filter(JournalEntry.patient_id == patient.id).count()
    last = db.query(JournalEntry).filter(JournalEntry.patient_id == patient.id).order_by(desc(JournalEntry.created_at)).first()
    return _patient_response(patient, last, count)


@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(
  patient_id: int,
  data: PatientCreate,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    patient.name = data.name
    patient.date_of_birth = data.date_of_birth
    patient.initial_concern = data.initial_concern
    db.commit()
    db.refresh(patient)
    count = db.query(JournalEntry).filter(JournalEntry.patient_id == patient.id).count()
    last = db.query(JournalEntry).filter(JournalEntry.patient_id == patient.id).order_by(desc(JournalEntry.created_at)).first()
    return _patient_response(patient, last, count)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
  patient_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    db.delete(patient)
    db.commit()
    return None


@router.get("/{patient_id}/entries", response_model=list[JournalEntryResponse])
def list_entries(
  patient_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    entries = db.query(JournalEntry).filter(JournalEntry.patient_id == patient_id).order_by(desc(JournalEntry.created_at)).all()
    return [JournalEntryResponse.model_validate(e) for e in entries]


@router.post("/{patient_id}/entries", response_model=JournalEntryResponse)
def create_entry(
  patient_id: int,
  data: JournalEntryCreate,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    try:
        from analysis_service import run_analysis
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analysis service not available (model not loaded or incompatible Python).",
        )
    result = run_analysis(data.text, data.practitioner_notes)
    entry = JournalEntry(
        patient_id=patient_id,
        text=data.text,
        practitioner_notes=data.practitioner_notes,
        prediction=result["prediction"],
        confidence=result["confidence"],
        risk_score=result["risk_score"],
        sentiment_polarity=result["sentiment_polarity"],
        sentiment_score=result["sentiment_score"],
        detected_patterns=json.dumps(result["detected_patterns"]) if result.get("detected_patterns") else None,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return JournalEntryResponse.model_validate(entry)
