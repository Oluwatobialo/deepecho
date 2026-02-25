"""
Supabase Auth via direct HTTP + local JWT verification.
Avoids the supabase-py client so we work on Python 3.14 (no httpx/httpcore bug).
Supports both HS256 (legacy JWT secret) and ES256 (Supabase JWKS).
"""
import json
import logging
import urllib.request
import urllib.error
from config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET

logger = logging.getLogger(__name__)

# Cached JWKS client for ES256 verification (Supabase now signs with ES256)
_jwk_client = None


def _parse_error_body(e: urllib.error.HTTPError) -> str:
    """Extract user-facing message from Supabase error response (JSON or text)."""
    try:
        body = e.read().decode()
    except Exception:
        return str(e)
    if not body:
        return str(e)
    try:
        data = json.loads(body)
        return (
            data.get("error_description")
            or data.get("msg")
            or data.get("message")
            or (data.get("error") if isinstance(data.get("error"), str) else None)
            or body
        ) or str(e)
    except Exception:
        return body or str(e)


def _post(path: str, body: dict, apikey: str) -> dict:
    if not (SUPABASE_URL and apikey):
        raise RuntimeError("Supabase is not configured (missing SUPABASE_URL or SUPABASE_ANON_KEY in backend .env)")
    url = f"{SUPABASE_URL.rstrip('/')}{path}"
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "apikey": apikey,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def sign_up(email: str, password: str, full_name: str) -> dict:
    """Call Supabase Auth signup. Returns response with access_token and user (or user at top level when confirmation required)."""
    body = {
        "email": email,
        "password": password,
        "data": {"full_name": full_name},
    }
    try:
        out = _post("/auth/v1/signup", body, SUPABASE_ANON_KEY)
    except urllib.error.HTTPError as e:
        raise RuntimeError(_parse_error_body(e))
    if "error" in out and out.get("error_description"):
        raise RuntimeError(out["error_description"])
    if "error" in out:
        raise RuntimeError(out.get("msg", str(out["error"])))
    return out


def sign_in_with_password(email: str, password: str) -> dict:
    """Call Supabase Auth token (password grant). Returns response with access_token and user or raises."""
    body = {
        "grant_type": "password",
        "email": email,
        "password": password,
    }
    try:
        out = _post("/auth/v1/token?grant_type=password", body, SUPABASE_ANON_KEY)
    except urllib.error.HTTPError as e:
        msg = ""
        try:
            msg = e.read().decode()
        except Exception:
            pass
        raise RuntimeError(msg or str(e))
    if "error" in out and out.get("error_description"):
        raise RuntimeError(out["error_description"])
    if "error" in out:
        raise RuntimeError(out.get("msg", str(out["error"])))
    return out


def _get_jwk_client():
    """Get or create cached PyJWKClient for Supabase JWKS (ES256)."""
    global _jwk_client
    if _jwk_client is None:
        from jwt import PyJWKClient
        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwk_client = PyJWKClient(jwks_url, cache_keys=True)
        logger.info("JWKS client initialized for %s", jwks_url)
    return _jwk_client


def verify_jwt(token: str) -> dict:
    """Verify Supabase JWT locally. Supports HS256 (legacy) and ES256 (JWKS)."""
    import jwt
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")

    if alg == "ES256":
        if not SUPABASE_URL:
            raise ValueError("SUPABASE_URL required for ES256 JWT verification")
        jwk_client = _get_jwk_client()
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        try:
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
            )
        except jwt.InvalidAudienceError:
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                options={"verify_aud": False},
            )
    elif alg == "HS256":
        if not SUPABASE_JWT_SECRET:
            raise ValueError("SUPABASE_JWT_SECRET required for HS256 JWT verification")
        try:
            return jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                audience="authenticated",
                algorithms=["HS256"],
            )
        except jwt.InvalidAudienceError:
            return jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
    else:
        raise jwt.InvalidAlgorithmError(f"Algorithm {alg} is not allowed")
