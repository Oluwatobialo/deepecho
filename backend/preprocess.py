"""
Text preprocessing for mental health analysis (thesis: tokenization, stopwords, lemmatization).
Output is cleaned text suitable for MentalBERT.
"""
import re

# Optional: use spaCy for lemmatization and stopwords (run: python -m spacy download en_core_web_sm)
try:
    import spacy
    _nlp = spacy.load("en_core_web_sm", disable=["ner", "parser"])
except Exception:
    _nlp = None

# Fallback stopwords if spaCy not available
_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
    "i", "me", "my", "myself", "we", "our", "you", "your", "it", "its", "they", "them",
}


def _clean_text(text: str) -> str:
    """Lowercase, remove URLs, normalize punctuation/whitespace."""
    if not text or not text.strip():
        return ""
    t = text.strip().lower()
    # Remove URLs
    t = re.sub(r"https?://\S+|www\.\S+", " ", t, flags=re.IGNORECASE)
    # Keep letters, numbers, basic punctuation; collapse spaces
    t = re.sub(r"[^\w\s.,!?']", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def preprocess(text: str) -> str:
    """
    Clean and normalize text for the NLP model.
    - Lowercase, remove URLs, normalize spaces
    - If spaCy is available: remove stopwords and lemmatize
    - Otherwise: only basic cleaning
    """
    cleaned = _clean_text(text)
    if not cleaned:
        return ""

    if _nlp is not None:
        doc = _nlp(cleaned)
        tokens = [
            t.lemma_ for t in doc
            if t.is_alpha and t.lemma_.lower() not in _STOPWORDS and len(t.lemma_) > 1
        ]
        return " ".join(tokens).strip()

    # Fallback: simple word tokenize and remove stopwords
    words = cleaned.split()
    words = [w for w in words if w.lower() not in _STOPWORDS and len(w) > 1]
    return " ".join(words).strip() or cleaned
