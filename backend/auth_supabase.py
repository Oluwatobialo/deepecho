"""Supabase Auth: get current user by verifying JWT locally (no supabase client; Python 3.14 compatible)."""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from config import SUPABASE_JWT_SECRET
from database import get_db
from models_db import User
from supabase_auth_http import verify_jwt

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get current user by verifying Supabase JWT locally (no network call)."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPABASE_JWT_SECRET not configured in .env",
        )
    try:
        payload = verify_jwt(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Create profile if missing (e.g. first time after signup)
        email = payload.get("email") or ""
        full_name = (payload.get("user_metadata") or {}).get("full_name") or email or "User"
        user = User(id=user_id, email=email, full_name=full_name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
