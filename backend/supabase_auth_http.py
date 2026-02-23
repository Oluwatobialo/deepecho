"""
Supabase Auth via direct HTTP + local JWT verification.
Avoids the supabase-py client so we work on Python 3.14 (no httpx/httpcore bug).
"""
import json
import urllib.request
import urllib.error
from config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET


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


def verify_jwt(token: str) -> dict:
    """Verify Supabase JWT locally and return payload (e.g. sub=user_id). Uses SUPABASE_JWT_SECRET."""
    import jwt
    payload = jwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        audience="authenticated",
        algorithms=["HS256"],
    )
    return payload
