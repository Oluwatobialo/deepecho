# DeepEcho — AI-Driven Mental Health Monitoring Platform

An NLP-based clinical platform for mental health monitoring that uses **MentalBERT** for depression detection from patient narratives. The system supports clinicians with real-time risk scoring, historical trends, and practitioner workflows.

## Description

DeepEcho is a dissertation-aligned system that applies transformer-based NLP (MentalBERT) to identify depressive language in patient journal entries and clinical notes. It provides:

- **Depression classification** (depressed / not depressed) with confidence scores
- **Risk scoring** (0–100) and trend visualisation over time
- **Practitioner tools**: notes, confirm/override of AI results, and flag-for-follow-up
- **Secure, multi-tenant** access via Supabase auth and PostgreSQL

## Tech Stack

| Layer      | Technology |
|-----------|------------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend   | FastAPI, Python 3.12 |
| Auth & DB | Supabase (PostgreSQL, Auth, JWT ES256) |
| NLP Model | MentalBERT (`mental-bert-base-uncased`) |

## Setup

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python 3.12** (recommended; 3.11 also supported for the model)
- A **Supabase** project (for auth and optional PostgreSQL)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/deepecho.git
cd deepecho
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

### 3. Environment variables

- **Backend:** Copy `backend/.env.example` to `backend/.env` and fill in your Supabase URL, anon key, JWT secret, and (if using Postgres) `DATABASE_URL`. Set `MODEL_PATH` if you have MentalBERT downloaded.
- **Frontend (optional):** Copy root `.env.example` to `.env` in the project root if you need to override the default API URL or Supabase keys for the client.

### 4. Run the application

**Option A — Both at once (Windows)**  
From the project root, run:

```bash
start-all.bat
```

**Option B — Separate terminals**

- Backend: `start-backend.bat` (or from `backend`: activate venv then `py -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload`)
- Frontend: `start-frontend.bat` (or `npm run dev` from project root)

- **Frontend:** http://localhost:5173 (or the port Vite prints)
- **Backend API:** http://127.0.0.1:8002  
- **Health check:** http://127.0.0.1:8002/health

## Features (aligned with dissertation objectives)

- **NLP-based depression detection** using MentalBERT on patient text
- **Structured risk output**: classification, confidence, and 0–100 risk score
- **Historical risk tracking** with trend charts per patient
- **Clinician workflow**: practitioner notes, AI confirm/override, flag for follow-up (persisted)
- **Multi-user, secure access** via Supabase auth and JWT (ES256)
- **Patient management**: registration, duplicate detection, search and filtering
- **Reporting**: PDF-style report generation (print dialog) and model performance metrics in Settings
- **UX**: Protected routes, error boundary, loading skeletons, and session caching for a responsive dashboard

## Project structure

```
├── backend/           # FastAPI app, MentalBERT analysis, Supabase auth
│   ├── routers/      # auth, patients, metrics
│   ├── main.py
│   └── .env.example
├── src/               # React + Vite frontend
│   ├── pages/        # Login, Dashboard, PatientDetail, Settings, etc.
│   ├── components/
│   ├── contexts/     # AuthContext
│   └── lib/          # api.ts, Supabase client
├── start-backend.bat
├── start-frontend.bat
├── start-all.bat
├── README.md
└── FEATURES.md       # Detailed feature checklist
```

## Documentation

- **FEATURES.md** — Full list of implemented features and capabilities.
- **backend/.env.example** — Backend environment variable template (no real secrets).

## License

Proprietary / dissertation project. See repository or author for terms.
