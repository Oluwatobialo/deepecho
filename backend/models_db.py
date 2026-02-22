"""SQLAlchemy models for User, Patient, JournalEntry."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    """User profile (linked to Supabase auth.users via id)."""
    __tablename__ = "user_profiles"

    id = Column(String(36), primary_key=True, index=True)  # Supabase auth.users.id (UUID string)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    patients = relationship("Patient", back_populates="user", cascade="all, delete-orphan")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("user_profiles.id"), nullable=False)
    name = Column(String(255), nullable=False)
    date_of_birth = Column(String(50), nullable=True)
    initial_concern = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="patients")
    entries = relationship("JournalEntry", back_populates="patient", cascade="all, delete-orphan")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    text = Column(Text, nullable=False)
    practitioner_notes = Column(Text, nullable=True)
    prediction = Column(String(50), nullable=False)  # depressed | not_depressed
    confidence = Column(Float, nullable=False)
    risk_score = Column(Integer, nullable=False)
    sentiment_polarity = Column(String(50), nullable=True)
    sentiment_score = Column(Integer, nullable=True)
    detected_patterns = Column(Text, nullable=True)  # JSON array as string
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="entries")
