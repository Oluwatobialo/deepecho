"""
Load MentalBERT from a local directory and run sequence classification (depressed / not_depressed).
Model is stored on disk and used locally (no inference API calls).
"""
import logging
from pathlib import Path
from typing import Optional

import torch
from transformers import AutoConfig, AutoTokenizer, BertForSequenceClassification

from config import MODEL_PATH

logger = logging.getLogger(__name__)

# Module-level singleton so we load once per process
_tokenizer = None
_model = None
_device: Optional[torch.device] = None

# Label index -> label name (match frontend)
ID2LABEL = {0: "not_depressed", 1: "depressed"}
LABEL2ID = {"not_depressed": 0, "depressed": 1}


def _get_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def load_model(model_path: Optional[Path] = None) -> None:
    """Load tokenizer and MentalBERT (with classification head) from local path."""
    global _tokenizer, _model, _device
    path = model_path or MODEL_PATH
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"Model not found at {path}. Run: python download_mentalbert.py"
        )
    path = path.resolve()

    _device = _get_device()
    logger.info("Loading tokenizer from %s", path)
    _tokenizer = AutoTokenizer.from_pretrained(str(path), local_files_only=True)

    # MentalBERT is BERT-base; we add a 2-class head for depression.
    # If the dir already has a config with num_labels, it will be used.
    logger.info("Loading MentalBERT (sequence classification) from %s", path)
    config = AutoConfig.from_pretrained(str(path), local_files_only=True)
    if getattr(config, "num_labels", None) is None:
        config.num_labels = 2
        config.id2label = ID2LABEL
        config.label2id = LABEL2ID

    _model = BertForSequenceClassification.from_pretrained(
        str(path),
        config=config,
        local_files_only=True,
    )
    _model.to(_device)
    _model.eval()
    logger.info("Model loaded on %s", _device)


def get_model_and_tokenizer():
    """Return (model, tokenizer). Load if not already loaded."""
    global _tokenizer, _model
    if _model is None or _tokenizer is None:
        load_model()
    return _model, _tokenizer


def predict(text: str, max_length: int = 512) -> dict:
    """
    Run MentalBERT on cleaned text. Returns prediction and confidence.
    """
    model, tokenizer = get_model_and_tokenizer()
    assert text is not None and isinstance(text, str)
    if not text.strip():
        return {
            "prediction": "not_depressed",
            "confidence": 0.0,
            "risk_score": 0,
            "probabilities": {"not_depressed": 1.0, "depressed": 0.0},
        }

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=max_length,
        padding=True,
    )
    inputs = {k: v.to(_device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits[0]
    probs = torch.softmax(logits, dim=-1).cpu().numpy()
    pred_id = int(torch.argmax(logits).item())
    pred_label = ID2LABEL.get(pred_id, "not_depressed")
    confidence = float(probs[pred_id])

    # Map to 0–100 risk score (depressed class probability)
    risk_score = int(round(probs[1] * 100))

    return {
        "prediction": pred_label,
        "confidence": round(confidence, 4),
        "risk_score": min(100, max(0, risk_score)),
        "probabilities": {
            "not_depressed": round(float(probs[0]), 4),
            "depressed": round(float(probs[1]), 4),
        },
    }
