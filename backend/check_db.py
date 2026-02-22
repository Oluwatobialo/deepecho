"""
Verify database connection and that required tables exist.
Run from backend folder: py check_db.py
"""
import os
import sys
from pathlib import Path

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

DATABASE_URL = os.getenv("DATABASE_URL")
REQUIRED_TABLES = ("user_profiles", "patients", "journal_entries")


def check_sqlite():
    import sqlite3
    path = DATABASE_URL.replace("sqlite:///", "")
    if not Path(path).exists():
        print(f"FAIL: Database file not found: {path}")
        return False
    conn = sqlite3.connect(path)
    try:
        cur = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN (?,?,?)",
            REQUIRED_TABLES,
        )
        found = {row[0] for row in cur.fetchall()}
    finally:
        conn.close()
    missing = set(REQUIRED_TABLES) - found
    if missing:
        print(f"FAIL: Missing tables: {missing}")
        return False
    print("OK: SQLite connected, all required tables exist:", list(REQUIRED_TABLES))
    return True


def check_postgres():
    from sqlalchemy import create_engine, text
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_name = ANY(:names)"
                ),
                {"names": list(REQUIRED_TABLES)},
            )
            found = {row[0] for row in result}
    except Exception as e:
        print(f"FAIL: Could not connect to PostgreSQL: {e}")
        return False
    missing = set(REQUIRED_TABLES) - found
    if missing:
        print(f"FAIL: Missing tables: {missing}. Expected: {list(REQUIRED_TABLES)}")
        return False
    print("OK: PostgreSQL (Supabase) connected, all required tables exist:", list(REQUIRED_TABLES))
    return True


def main():
    if not DATABASE_URL:
        print("FAIL: DATABASE_URL is not set in .env")
        sys.exit(1)
    if DATABASE_URL.startswith("postgresql"):
        ok = check_postgres()
    else:
        ok = check_sqlite()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
