"""Database: Supabase PostgreSQL (or SQLite fallback)."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config import DATABASE_URL

# Create engine (PostgreSQL for Supabase, or SQLite for local dev)
if DATABASE_URL.startswith("postgresql"):
    # PostgreSQL (Supabase)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    # SQLite fallback
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables (only for SQLite; Supabase tables created via migrations)."""
    if not DATABASE_URL.startswith("postgresql"):
        Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
