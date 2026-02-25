"""Supabase Auth: get current user by verifying JWT locally (no supabase client; Python 3.14 compatible)."""
import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import SUPABASE_JWT_SECRET, SUPABASE_URL
from supabase_auth_http import verify_jwt

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


class _UserFromJWT:
    """User-like object built from JWT payload (no database). Used when DB connection is unavailable."""

    def __init__(self, user_id: str, email: str, full_name: str):
        self.id = user_id
        self.email = email
        self.full_name = full_name
        self.created_at = datetime.now(timezone.utc)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> _UserFromJWT:
    """Get current user by verifying Supabase JWT locally. Uses JWT payload only (no database)."""
    if not credentials or not credentials.credentials:
        logger.debug("get_current_user: no credentials or empty token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not SUPABASE_URL and not SUPABASE_JWT_SECRET:
        logger.warning("get_current_user: SUPABASE_URL or SUPABASE_JWT_SECRET not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase auth not configured (SUPABASE_URL or SUPABASE_JWT_SECRET required)",
        )
    token = credentials.credentials.strip()
    try:
        payload = verify_jwt(token)
        user_id = payload.get("sub")
        if not user_id:
            logger.warning("get_current_user: JWT payload missing 'sub' claim")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except ValueError as e:
        logger.warning("get_current_user: config error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        logger.warning("get_current_user: JWT verification failed: %s: %s", type(e).__name__, e)
        if unverified := _decode_jwt_unverified(token):
            logger.warning("get_current_user: unverified payload (for debug): aud=%s, sub=%s", unverified.get("aud"), unverified.get("sub"))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    email = payload.get("email") or ""
    full_name = (payload.get("user_metadata") or {}).get("full_name") or email or "User"
    return _UserFromJWT(user_id=user_id, email=email, full_name=full_name)


def _decode_jwt_unverified(token: str) -> dict | None:
    """Decode JWT without verification (for debug logging only)."""
    try:
        import jwt
        return jwt.decode(
            token,
            "",
            algorithms=["HS256", "ES256"],
            options={"verify_signature": False},
        )
    except Exception:
        return None
