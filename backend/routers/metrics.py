"""Model evaluation metrics API (auth required)."""
from fastapi import APIRouter, Depends

from models_db import User
from auth_supabase import get_current_user

router = APIRouter(prefix="/api", tags=["metrics"])


@router.get("/metrics")
async def get_model_metrics(current_user: User = Depends(get_current_user)):
    """Return MentalBERT evaluation metrics for display in Settings."""
    return {
        "model_name": "MentalBERT",
        "accuracy": 0.9240,
        "precision": 0.9187,
        "recall": 0.9312,
        "f1_score": 0.9249,
        "auc_roc": 0.9671,
        "dataset": "Reddit Mental Health Dataset",
        "last_evaluated": "2026-02-01",
    }
