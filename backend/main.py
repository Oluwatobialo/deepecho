"""
FastAPI backend: analyze text with MentalBERT (model loaded from local disk).
"""
import os
import logging
from pathlib import Path

# Load .env so MODEL_PATH is available
try:
    from dotenv import load_dotenv
    _env = Path(__file__).resolve().parent / ".env"
    if _env.exists():
        load_dotenv(_env)
except ImportError:
    pass

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from config import MODEL_PATH
from database import init_db
import models_db  # noqa: F401 - register models with Base

from routers import auth, patients

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Patient narrative or message to analyze")
    practitioner_notes: str | None = Field(None, description="Optional practitioner notes")


class AnalyzeResponse(BaseModel):
    prediction: str  # "depressed" | "not_depressed"
    confidence: float
    risk_score: int
    sentiment: dict
    detected_patterns: list[str]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables and load MentalBERT at startup (optional; skipped on Python 3.14)."""
    init_db()
    logger.info("Database tables ready")
    try:
        from model_local import load_model
        load_model()
        logger.info("MentalBERT loaded from %s", MODEL_PATH)
    except Exception as e:
        logger.warning(
            "Model not loaded: %s. /api/analyze will return 503 until model is available (use Python 3.11/3.12 for ML).",
            e,
        )
    yield
    # Shutdown: nothing to do


app = FastAPI(
    title="DeepEcho Analysis API",
    description="Text-based mental health analysis using MentalBERT (local)",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
        "http://localhost:3002", "http://127.0.0.1:3002",
        "http://localhost:3003", "http://127.0.0.1:3003",
        "http://localhost:3004", "http://127.0.0.1:3004",
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/db-check")
def db_check():
    """
    Verify database connection and that required tables exist.
    Returns 200 if OK, 503 if connection or schema check fails.
    """
    from sqlalchemy import text
    from database import engine
    from config import DATABASE_URL

    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="DATABASE_URL not configured")
    required_tables = ("user_profiles", "patients", "journal_entries")
    try:
        with engine.connect() as conn:
            if DATABASE_URL.startswith("postgresql"):
                result = conn.execute(
                    text(
                        "SELECT table_name FROM information_schema.tables "
                        "WHERE table_schema = 'public' AND table_name = ANY(:names)"
                    ),
                    {"names": list(required_tables)},
                )
            else:
                result = conn.execute(
                    text(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name IN (:t1,:t2,:t3)"
                    ),
                    {"t1": required_tables[0], "t2": required_tables[1], "t3": required_tables[2]},
                )
            found = {row[0] for row in result}
        missing = set(required_tables) - found
        if missing:
            raise HTTPException(
                status_code=503,
                detail=f"Missing tables: {sorted(missing)}. Run the SQL in SUPABASE_SETUP.md to create them.",
            )
        return {
            "status": "ok",
            "database": "postgresql" if DATABASE_URL.startswith("postgresql") else "sqlite",
            "tables": list(required_tables),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("db_check failed")
        raise HTTPException(status_code=503, detail=f"Database check failed: {str(e)}")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Avoid 404 when browser requests favicon."""
    return Response(status_code=204)


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    """Preprocess text, run MentalBERT locally, return depression prediction and sentiment."""
    try:
        from analysis_service import run_analysis
    except Exception as e:
        logger.warning("Analysis service unavailable: %s", e)
        raise HTTPException(status_code=503, detail="Analysis service not available (model not loaded or incompatible Python).")
    result = run_analysis(req.text, req.practitioner_notes)
    return AnalyzeResponse(
        prediction=result["prediction"],
        confidence=result["confidence"],
        risk_score=result["risk_score"],
        sentiment={"polarity": result["sentiment_polarity"], "score": result["sentiment_score"]},
        detected_patterns=result["detected_patterns"],
    )
