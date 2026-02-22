# DeepEcho – Implementation Guide from Final Year Project

This document summarizes your **Text-Based Mental Health Monitoring System** from Chapters 1–3 and maps it to the DeepEcho Clinical SaaS Platform so you can implement the full system.

---

## 1. Project summary (from your thesis)

### Aim and objectives
- **Aim:** Design, implement, and test a **text-based mental health monitoring system** using **Natural Language Processing (NLP)**.
- **Objectives:**
  - Build an NLP model that detects signs of mental distress **in real time**.
  - Evaluate the system using relevant datasets and validation (e.g. Accuracy, Precision, Recall, F1, AUC-ROC, human-in-the-loop).

### Problem addressed
- Mental health conditions (e.g. depression, anxiety) are rising; early detection is hard due to stigma, limited resources, and delayed reporting.
- People often express distress in digital text (e.g. chats, forums); current systems do not fully use NLP to monitor and interpret these cues at scale.
- Your system provides **real-time, non-intrusive, scalable** text analysis to support early detection and timely intervention.

### Methodology (high level)
- **Build:** Choose/design an NLP model (e.g. compare SVM/Naive Bayes vs BERT/RoBERTa); use datasets such as Reddit Mental Health, DAIC-WOZ, GoEmotions.
- **System:** Preprocessing (tokenization, stopwords, lemmatization) → feature extraction → classification → feedback.
- **Stack:** Python, scikit-learn, spaCy, Hugging Face Transformers; human-in-the-loop validation with mental health professionals.

---

## 2. System architecture (from Chapter 3)

### Conceptual flow
1. **Input:** User enters a text message/chat via web or mobile UI.
2. **NLP model:**
   - **Sentiment analysis** – emotional tone (positive / neutral / negative).
   - **Emotion analysis** – specific emotions (e.g. sadness, anger, fear).
   - **Depression risk detection** – trained model to detect signs of depression or distress.
3. **Output:** Interpreted as **Depressed** or **Not Depressed** (plus confidence).
4. **Feedback:** Mental health report and recommendations.

### Four-layer architecture
| Layer | Role |
|-------|------|
| **User layer** | Web/Mobile UI – input text, view analysis (e.g. emotional state, depression level). |
| **API service (middle)** | Receives requests from UI, forwards to application layer, returns results. |
| **Application layer** | Text preprocessing → Depression detection model (sentiment + emotion) → Result generation. |
| **Backend layer** | Model repository – stores trained models/parameters; model loads from here for each analysis. |

### Sequence (MentalBERT pipeline)
1. User enters text in UI.
2. UI sends text to **Application Server (API)**.
3. **Preprocessing:** lowercase, remove punctuation/URLs, tokenize, remove stopwords, lemmatize.
4. Cleaned text → **MentalBERT** (or equivalent) → classification: **Depressed / Not Depressed** + confidence.
5. **Feedback module** formats result → API → UI displays result.

### Use cases
- **User:** Input message/chat; receive feedback or report.
- **System:** Analyze sentiment; analyze emotion; generate mental health report.

---

## 3. How this maps to the current DeepEcho app

### Already in the UI (frontend)
- **Login** → **Dashboard** (patient list, risk scores, “high risk”).
- **Add journal entry** modal: patient narrative + practitioner notes.
- **Analysis pipeline UI:** Step 1 – Preprocessing; Step 2 – MentalBERT (“Analyzing mood”); Step 3 – Complete.
- **Results:** Prediction (Depressed / Not Depressed), confidence, risk score, sentiment (e.g. joy, sadness, fear).
- **Patient detail** and **Analysis results** pages; data structures for patients and journal entries.

### Currently mocked (no real backend)
- **Analysis:** `handleAnalyze()` in `Dashboard.tsx` and `PatientDetail.tsx` uses `setTimeout` to simulate preprocessing → MentalBERT → complete, then builds a **mock** result and stores it in `sessionStorage`.
- **Data:** `src/lib/mockData.ts` – static patients and journal entries; no real NLP or database.

### Implemented: FastAPI + MentalBERT (local)
- **Backend:** `backend/` – FastAPI app that loads **MentalBERT from a folder on your machine** (no cloud inference).
- **Download script:** `backend/download_mentalbert.py` – one-time download of **AIMH/mental-bert-base-cased** to `backend/models/mental-bert` (Hugging Face login required for gated model).
- **Preprocessing:** `backend/preprocess.py` – cleaning, optional spaCy lemmatization/stopwords.
- **Frontend:** Dashboard and Patient Detail “Analyze” now call `POST http://localhost:8000/api/analyze`; results are shown and “Save Entry” navigates to Analysis Results.
- See **`backend/README.md`** for install, download, and run steps.

### Optional next steps (thesis alignment)

1. **Fine-tune the classification head** – MentalBERT is loaded with a 2-class head; fine-tune on a depression dataset (e.g. Reddit, DAIC-WOZ) and save the full checkpoint to `MODEL_PATH` for better predictions.
2. **Data persistence** – Replace or complement `mockData` with a database and API for patients and journal entries so the app supports real-time monitoring and professional workflows.

---

## 4. Suggested implementation steps

1. **Backend (Python)**  
   - Use **FastAPI** or **Flask** for the API.  
   - One endpoint, e.g. `POST /api/analyze`: body `{ "text": "..." }`, response `{ "prediction", "confidence", "riskScore", "sentiment", ... }`.  
   - Inside the endpoint: run preprocessing → load model from your “model repository” (e.g. local path or cloud) → run inference → build result.

2. **NLP pipeline**  
   - Preprocessing: implement the steps from Chapter 3 (lowercase, remove punctuation/URLs, tokenize, stopwords, lemmatize) in Python.  
   - Model: integrate MentalBERT or a Hugging Face model (e.g. `mental/mental-bert-base-uncased` or similar); output Depressed/Not Depressed + confidence; map to risk score and sentiment if needed.

3. **Frontend**  
   - Add a small API client (e.g. `src/lib/api.ts`): `analyzeText(text: string): Promise<AnalysisResult>`.  
   - In `Dashboard.tsx` and `PatientDetail.tsx`, replace the mock `handleAnalyze()` with: call `analyzeText(patientNarrative)`, then set the same state/result and navigate to Analysis Results (or show results in the same flow).  
   - Keep existing types (e.g. `prediction`, `confidence`, `riskScore`, `sentiment`) so the rest of the UI stays unchanged.

4. **Evaluation (thesis)**  
   - Use your chosen metrics (Accuracy, Precision, Recall, F1, AUC-ROC) on a held-out or standard dataset.  
   - Document results and, if possible, include human-in-the-loop validation (e.g. mental health professional reviewing a sample of outputs) as in your methodology.

---

## 5. Quick reference – data shapes

**Request (from frontend to API):**
```json
{
  "text": "Patient narrative or chat message",
  "practitionerNotes": "Optional"
}
```

**Response (from API to frontend):**
```json
{
  "prediction": "depressed" | "not_depressed",
  "confidence": 0.92,
  "riskScore": 65,
  "sentiment": {
    "polarity": "negative",
    "score": 0.3,
    "joy": 0.1,
    "sadness": 0.8,
    "fear": 0.2
  },
  "detectedPatterns": ["Low mood indicators", "..."],
  "report": "Optional mental health report text"
}
```

Your existing `AnalysisResult` in `AnalysisResults.tsx` and `JournalEntry` in `mockData.ts` can be aligned with this shape so that switching from mock to real API only requires changing the source of the result.

---

## 6. Summary

- Your **thesis** defines a text-based mental health monitoring system with a 4-layer architecture, preprocessing, MentalBERT-style classification, and feedback.
- **DeepEcho** already implements the **user layer** and the **flow** (preprocessing → MentalBERT → complete → results); it currently uses **mock** analysis and mock data.
- To **implement the full project**: add a **Python backend** (API + preprocessing + model), then **wire the frontend** to that API and optionally add a database for patients and journal entries. This document gives you the mapping and steps to do that while staying aligned with your Chapters 1–3.

If you tell me your preferred stack (e.g. FastAPI vs Flask, MentalBERT vs another Hugging Face model), I can outline concrete code changes (e.g. exact endpoints, request/response types, and where to call them in `Dashboard.tsx` and `PatientDetail.tsx`).
