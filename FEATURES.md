# DeepEcho — Implemented Features

Checklist of features implemented for the AI-driven mental health monitoring platform.

---

## Authentication & Security

- **Clinician authentication (Supabase + JWT ES256)**  
  Login and registration via Supabase Auth; backend verifies JWTs (HS256 fallback and ES256 with JWKS).

- **Protected routes with session management**  
  Dashboard, patient detail, settings, and analysis results require login; unauthenticated users are redirected to the login page. Session is maintained via JWT in localStorage.

- **Error boundary for graceful error handling**  
  The app is wrapped in an error boundary so uncaught errors show a friendly message instead of a blank screen.

---

## Patients & Workflow

- **Patient registration with duplicate detection**  
  Add patient by name and DOB; backend checks for duplicates and returns 409 with matches; frontend supports “Register anyway” with a force flag.

- **Flag patients for follow-up (persisted to database)**  
  Toggle “Flag for follow-up” on the patient detail page; value is stored in the database and shown on the dashboard with a yellow flag icon and a “Flagged for Follow-up” filter.

- **Patient search and filtering**  
  Dashboard supports search by name and filters: All, High-Risk, Low-Risk, Newest First, and Flagged for Follow-up.

---

## AI & Analysis

- **Real-time depression analysis using MentalBERT**  
  Submit patient narrative (and optional practitioner notes); backend runs MentalBERT locally and returns depressed/not_depressed, confidence, risk score, and sentiment.

- **Risk score tracking with historical trend chart**  
  Patient detail page shows a line chart of risk score over time (e.g. last 30 days) based on journal entries.

- **Emotion breakdown (joy, sadness, fear)**  
  Analysis results include sentiment polarity and score; UI can surface emotion-related signals from the model output.

- **Confidence gauge for AI predictions**  
  Confidence meter (e.g. radial or bar) displays the model’s certainty for the current prediction.

- **Practitioner notes with confirm/override workflow**  
  Practitioners can add notes and either confirm or override the AI result; state is reflected in the UI (e.g. “Confirmed” / “Overridden”).

---

## Reporting & Settings

- **PDF report generation**  
  “Download PDF Report” opens a print-friendly view (patient info, risk score, latest status, journal entries table, practitioner notes) and triggers the browser print dialog so users can save as PDF.

- **Model performance metrics**  
  Settings → AI Preferences tab fetches `/api/metrics` and displays MentalBERT evaluation metrics (accuracy, precision, recall, F1, AUC-ROC), dataset name, and a note that metrics are on held-out test data.

---

## UX & Performance

- **Loading skeletons and session caching**  
  Dashboard shows skeleton placeholders while data loads; patients list is cached in sessionStorage and refreshed in the background for faster return visits. Patient detail shows a centered spinner while loading.

- **Parallel data fetching**  
  Patient detail loads patient and entries in parallel via `Promise.all` for faster initial render.

---

## Technical Summary

| Area           | Implementation |
|----------------|----------------|
| Frontend       | React 18, TypeScript, Vite, React Router, Tailwind, shadcn-style UI |
| Backend        | FastAPI, Python 3.12, SQLAlchemy, Supabase auth (JWT verification) |
| Database       | Supabase PostgreSQL (or SQLite fallback); patients, journal_entries, user_profiles |
| NLP            | MentalBERT (mental-bert-base-uncased) for depression classification |
| Auth           | Supabase Auth (sign up / sign in); JWT with ES256/HS256 verification and clock skew leeway |

For setup and run instructions, see [README.md](README.md).
