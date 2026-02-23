"""
Verify Supabase integration: env vars, client, auth, and database.
Run from backend folder: py check_supabase.py
"""
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
DATABASE_URL = os.getenv("DATABASE_URL")

def main():
    ok = True

    # 1. Env vars
    print("1. Environment variables")
    if not SUPABASE_URL or not SUPABASE_URL.startswith("https://"):
        print("   FAIL: SUPABASE_URL missing or invalid in backend/.env")
        ok = False
    else:
        print("   OK: SUPABASE_URL is set")

    if not SUPABASE_SERVICE_ROLE_KEY or len(SUPABASE_SERVICE_ROLE_KEY) < 20:
        print("   FAIL: SUPABASE_SERVICE_ROLE_KEY missing or invalid in backend/.env")
        ok = False
    else:
        print("   OK: SUPABASE_SERVICE_ROLE_KEY is set")

    if not SUPABASE_ANON_KEY or len(SUPABASE_ANON_KEY) < 20:
        print("   WARN: SUPABASE_ANON_KEY missing (optional for backend)")
    else:
        print("   OK: SUPABASE_ANON_KEY is set")

    if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
        print("   FAIL: DATABASE_URL missing or not PostgreSQL (Supabase). Set in backend/.env")
        ok = False
    else:
        print("   OK: DATABASE_URL is set (PostgreSQL)")

    if not SUPABASE_JWT_SECRET or len(SUPABASE_JWT_SECRET) < 10:
        print("   WARN: SUPABASE_JWT_SECRET missing (required for /api/auth/me). Add from Dashboard > API > JWT Secret.")
    else:
        print("   OK: SUPABASE_JWT_SECRET is set")

    if not ok:
        print("\nFix backend/.env using backend/.env.example and Supabase Dashboard > Settings > API & Database.")
        sys.exit(1)

    # 2. Database connection and tables (auth uses direct HTTP + JWT, no supabase client)
    print("\n2. Database (Supabase PostgreSQL)")
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        required = ("user_profiles", "patients", "journal_entries")
        with engine.connect() as conn:
            r = conn.execute(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_name = ANY(:names)"
                ),
                {"names": list(required)},
            )
            found = {row[0] for row in r}
        missing = set(required) - found
        if missing:
            print("   FAIL: Missing tables:", sorted(missing), "- Run the SQL in SUPABASE_SETUP.md (Section 5 & 6).")
            ok = False
        else:
            print("   OK: All required tables exist (user_profiles, patients, journal_entries)")
    except Exception as e:
        print(f"   FAIL: Database connection failed: {e}")
        print("   Check DATABASE_URL and that the password in the URL is correct.")
        ok = False

    if ok:
        print("\n--- Supabase integration OK ---")
    else:
        print("\n--- Fix the issues above ---")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
