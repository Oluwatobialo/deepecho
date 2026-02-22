"""Shared analysis logic: preprocess + MentalBERT, returns result dict for API or DB."""
import json

from fastapi import HTTPException

from preprocess import preprocess
from model_local import predict


def run_analysis(text: str, practitioner_notes: str | None = None) -> dict:
    """Run MentalBERT analysis. Returns dict with prediction, confidence (0-100), risk_score, sentiment_*, detected_patterns (list)."""
    try:
        from model_local import _model
        if _model is None:
            raise HTTPException(status_code=503, detail="Model not loaded.")
    except Exception:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    text_to_analyze = text
    if practitioner_notes and practitioner_notes.strip():
        text_to_analyze = f"{text}\n{practitioner_notes}"

    cleaned = preprocess(text_to_analyze)
    if not cleaned:
        return {
            "prediction": "not_depressed",
            "confidence": 0.0,
            "risk_score": 0,
            "sentiment_polarity": "neutral",
            "sentiment_score": 50,
            "detected_patterns": ["No analyzable text provided"],
        }

    out = predict(cleaned)
    pred = out["prediction"]
    conf = out["confidence"]
    risk = out["risk_score"]
    probs = out.get("probabilities", {})

    if probs.get("depressed", 0) > 0.6:
        polarity = "negative"
        score = int((1 - probs["depressed"]) * 100)
    elif probs.get("not_depressed", 0) > 0.6:
        polarity = "positive"
        score = int(probs["not_depressed"] * 100)
    else:
        polarity = "neutral"
        score = 50
    sentiment_score = min(100, max(0, score))

    if pred == "depressed":
        detected_patterns = [
            "Significant distress indicators present",
            "Model suggests elevated depression-related language",
        ]
    else:
        detected_patterns = [
            "No significant distress indicators",
            "Neutral to positive emotional tone",
        ]

    return {
        "prediction": pred,
        "confidence": round(conf * 100, 1),
        "risk_score": risk,
        "sentiment_polarity": polarity,
        "sentiment_score": sentiment_score,
        "detected_patterns": detected_patterns,
    }
