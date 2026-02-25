"""Auth: register, login using Supabase Auth (direct HTTP; Python 3.14 compatible)."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from supabase_auth_http import sign_up, sign_in_with_password
from database import get_db
from models_db import User
from schemas import UserCreate, UserResponse, Token, LoginRequest
from auth_supabase import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# When Supabase has "Confirm email" enabled, signup returns user but no access_token until the user confirms.
REGISTER_CONFIRM_MESSAGE = "Check your email to confirm your account, then sign in."


def _user_obj_from_response(response: dict) -> dict:
    """Extract user object from Supabase auth response (user may be under 'user' or at top level)."""
    if response.get("user") and response["user"].get("id"):
        return response["user"]
    if response.get("id") and response.get("email"):
        return response
    return {}


def _auth_response_to_token_no_db(response: dict, email_fallback: str = "", full_name_fallback: str | None = None) -> Token:
    """Build Token from Supabase Auth API response without database. Uses user data from auth response."""
    access_token = response.get("access_token")
    user_obj = _user_obj_from_response(response)
    user_id = user_obj.get("id")
    if not access_token or not user_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get access token",
        )
    email = user_obj.get("email") or email_fallback
    full_name = (
        full_name_fallback
        or (user_obj.get("user_metadata") or {}).get("full_name")
        or email
        or "User"
    )
    user_response = UserResponse(
        id=user_id,
        email=email,
        full_name=full_name,
        created_at=datetime.now(timezone.utc),
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response,
    )


@router.post("/register")
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Register user via Supabase Auth (HTTP) and create profile. If Supabase requires email confirmation, returns requires_confirmation and message instead of a token."""
    try:
        response = sign_up(data.email, data.password, data.full_name)
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e).strip()
        logger.warning("Supabase sign_up error: %s", error_msg)
        if "already" in error_msg.lower() or "registered" in error_msg.lower() or "already been registered" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        if "invalid" in error_msg.lower() or "password" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email or password")
        if "not configured" in error_msg.lower() or "supabase" in error_msg.lower() and "missing" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg or "Registration failed")
    user_obj = _user_obj_from_response(response)
    user_id = user_obj.get("id")
    if not user_id:
        logger.warning("Supabase signup response missing user id: keys=%s", list(response.keys()))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Registration succeeded but invalid response from auth. Try signing in, or contact support.",
        )
    email = user_obj.get("email") or data.email
    full_name = (user_obj.get("user_metadata") or {}).get("full_name") or data.full_name or email
    # Ensure user_profiles row exists (required for patients FK). Create on first registration.
    try:
        existing = db.query(User).filter(User.id == user_id).first()
        if not existing:
            user = User(id=user_id, email=email, full_name=full_name)
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user = existing
    except IntegrityError as ie:
        db.rollback()
        err_text = str(getattr(ie, "orig", ie)).lower()
        if "unique" in err_text or "duplicate" in err_text:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        logger.exception("DB error on register")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Account created but profile could not be saved. Try signing in.")
    access_token = response.get("access_token")
    if not access_token:
        return JSONResponse(
            status_code=200,
            content={
                "requires_confirmation": True,
                "message": REGISTER_CONFIRM_MESSAGE,
            },
        )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=Token)
def login(data: LoginRequest):
    """Login via Supabase Auth (HTTP). Uses auth response directly (no database) to avoid DB connection issues."""
    try:
        response = sign_in_with_password(data.email, data.password)
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e).lower()
        if "invalid" in error_msg or "password" in error_msg or "email" in error_msg:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return _auth_response_to_token_no_db(response, email_fallback=data.email)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user
