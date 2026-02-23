"""Backend config: model path, database, auth and env."""
import os
from pathlib import Path

# Directory of this backend (for resolving paths relative to backend/)
BACKEND_DIR = Path(__file__).resolve().parent

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
# JWT Secret (Settings > API > JWT Secret) – used to verify tokens locally (avoids Python 3.14 supabase client bug)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Database: Supabase PostgreSQL (fallback to SQLite for local dev if not configured)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to SQLite for local dev
    _data_dir = BACKEND_DIR / "data"
    _data_dir.mkdir(exist_ok=True)
    DATABASE_URL = f"sqlite:///{_data_dir / 'deepecho.db'}"

# Legacy JWT config (not used with Supabase Auth, kept for compatibility)
SECRET_KEY = os.getenv("SECRET_KEY", "deepecho-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def get_model_path() -> Path:
    raw = os.getenv("MODEL_PATH", str(BACKEND_DIR / "models" / "mental-bert"))
    p = Path(raw)
    if not p.is_absolute():
        p = BACKEND_DIR / p
    return p.resolve()

MODEL_PATH = get_model_path()
