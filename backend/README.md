# DeepEcho Backend (FastAPI + MentalBERT local)

**Requires Python 3.11 or 3.12.** Python 3.14+ is not supported (transformers/httpcore incompatibility). Use a venv: `py -3.12 -m venv .venv` then activate and `pip install -r requirements.txt`.

The API runs MentalBERT **entirely on your machine**: the model is downloaded once to a folder and loaded from disk at startup. No data is sent to an external inference API.

## 1. Install dependencies

**Windows (PowerShell)** – use the Python launcher `py` so `pip` and Python are found:

```powershell
cd backend
py -m pip install -r requirements.txt
```

**macOS / Linux:**

```bash
cd backend
pip install -r requirements.txt
```

Optional for better preprocessing (stopwords + lemmatization):

```powershell
py -m spacy download en_core_web_sm
```

## 2. Download MentalBERT to your system (one-time)

The model **AIMH/mental-bert-base-cased** is gated. You must:

1. Create a Hugging Face account and accept the model conditions:  
   https://huggingface.co/AIMH/mental-bert-base-cased  
2. Create a token: https://huggingface.co/settings/tokens  
3. Log in (or set `HF_TOKEN`):

   **Option A – Use token (easiest on Windows):**  
   Get a token from https://huggingface.co/settings/tokens, then in PowerShell:
   ```powershell
   $env:HF_TOKEN = "hf_your_token_here"
   py download_mentalbert.py
   ```
   No separate login step needed.

   **Option B – Interactive login:**  
   **Windows (PowerShell):**
   ```powershell
   py -m huggingface_hub auth login
   ```
   **macOS / Linux:**
   ```bash
   python -m huggingface_hub auth login
   # or: huggingface-cli login
   ```

4. Run the download script from the `backend` directory:

   **Windows:**
   ```powershell
   cd backend
   py download_mentalbert.py
   ```

   **macOS / Linux:**
   ```bash
   cd backend
   python download_mentalbert.py
   ```

The model is saved under `backend/models/mental-bert` (or `backend/models/<your-repo-name>` if you use your own model below).

### Using your own fine-tuned model

To download **your** Hugging Face model instead of the default MentalBERT:

1. Set your model’s repo id (username/repo-name), then run the download script:

   **Windows (PowerShell):**
   ```powershell
   $env:HF_TOKEN = "hf_your_token_here"
   $env:HF_MODEL_ID = "your-username/your-model-name"
   py download_mentalbert.py
   ```

   **macOS / Linux:**
   ```bash
   export HF_TOKEN=hf_your_token_here
   export HF_MODEL_ID=your-username/your-model-name
   python download_mentalbert.py
   ```

2. The script saves the model under `backend/models/yourusername__your-model-name`. It will print the path; copy it into `.env` as `MODEL_PATH` if it differs from the default.

3. Your model should be a **BERT-based** sequence classification model (or compatible with `BertForSequenceClassification` with 2 labels: depressed / not_depressed). If it’s a different architecture, you may need to adjust `backend/model_local.py`.

## 3. Configure (optional)

Copy `.env.example` to `.env` and adjust if needed:

- `MODEL_PATH` – path to the folder where MentalBERT was downloaded (default: `./models/mental-bert`).
- `HF_TOKEN` – only needed for `download_mentalbert.py`, not for running the API.

## 4. Run the API

From the `backend` directory:

**Windows:**
```powershell
py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**macOS / Linux:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Health: http://localhost:8000/health  
- Analyze: `POST http://localhost:8000/api/analyze` with body `{"text": "your text here", "practitioner_notes": null}`.

The frontend (Vite on port 3000) is set to call this API.

## Note on classification head

MentalBERT is distributed as a **base BERT** (encoder only). This backend adds a 2-class classification head (depressed / not_depressed). If the downloaded checkpoint does not include a trained classifier, that head is randomly initialized, so predictions will not be meaningful until you **fine-tune** on a depression dataset (e.g. Reddit mental health, DAIC-WOZ). For a production or research setup, fine-tune the model and save the full `BertForSequenceClassification` checkpoint into the same `MODEL_PATH` folder so it is used locally.
