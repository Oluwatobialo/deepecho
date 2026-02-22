"""Supabase Auth: register, login, get current user."""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from supabase_client import get_supabase
from database import get_db
from models_db import User
from schemas import UserResponse

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get current user from Supabase JWT token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    supabase = get_supabase()
    try:
        # Verify token and get user from Supabase Auth
        user_data = supabase.auth.get_user(credentials.credentials)
        if not user_data or not user_data.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        
        supabase_user = user_data.user
        user_id = supabase_user.id  # UUID string
        
        # Get or create user profile in our database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Create profile if it doesn't exist
            user = User(
                id=user_id,
                email=supabase_user.email or "",
                full_name=supabase_user.user_metadata.get("full_name", supabase_user.email or "User"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )
