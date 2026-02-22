"""Auth: register, login using Supabase Auth."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from supabase_client import get_supabase
from database import get_db
from models_db import User
from schemas import UserCreate, UserResponse, Token, LoginRequest
from auth_supabase import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Register user via Supabase Auth and create profile."""
    supabase = get_supabase()
    
    try:
        # Sign up with Supabase Auth
        auth_response = supabase.auth.sign_up(
            email=data.email,
            password=data.password,
            options={
                "data": {
                    "full_name": data.full_name,
                }
            }
        )
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )
        
        user_id = auth_response.user.id  # UUID string from Supabase
        
        # Create user profile in our database
        existing = db.query(User).filter(User.id == user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )
        
        user = User(
            id=user_id,
            email=data.email,
            full_name=data.full_name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Return token from Supabase Auth
        token = auth_response.session.access_token if auth_response.session else None
        if not token:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get access token"
            )
        
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg.lower() or "email" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {error_msg}"
        )


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login via Supabase Auth."""
    supabase = get_supabase()
    
    try:
        # Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password(
            email=data.email,
            password=data.password
        )
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user_id = auth_response.user.id  # UUID string from Supabase
        
        # Get or create user profile
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Create profile if missing
            user = User(
                id=user_id,
                email=auth_response.user.email or data.email,
                full_name=auth_response.user.user_metadata.get("full_name", auth_response.user.email or "User"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        token = auth_response.session.access_token if auth_response.session else None
        if not token:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get access token"
            )
        
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e).lower()
        if "invalid" in error_msg or "password" in error_msg or "email" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {error_msg}"
        )


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user
