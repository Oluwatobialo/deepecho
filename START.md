# Start the full DeepEcho system

The project is configured to use **port 8002** for the API (see `.env`: `VITE_API_URL=http://localhost:8002`) so it doesn't conflict with other apps on 8000.

## Run backend + frontend (quick reference)

1. **Backend** (Terminal 1):  
   `cd backend` → `py -m uvicorn main:app --host 127.0.0.1 --port 8002`  
   Wait for *Application startup complete* and *Uvicorn running on http://127.0.0.1:8002*.
2. **Frontend** (Terminal 2, or double‑click `run-frontend.bat`):  
   From project root: `npm run dev` or `npm.cmd run dev` (or run **run-frontend.bat**).  
   Wait for *Local: http://localhost:5173/* (or the URL Vite prints).
3. **Open** that URL in your browser. Use **Register** to create an account, then sign in.

---

**If "Analyze" or API calls show "Failed to fetch"** → the backend is not running. Start the backend first, then use the app.

Run **both** of these in **separate** terminals (Command Prompt or PowerShell).

## Terminal 1 – Backend (API + MentalBERT)

```powershell
cd "C:\Users\alool\OneDrive\Desktop\DeepEcho Clinical SaaS Platform\backend"
py -m uvicorn main:app --host 127.0.0.1 --port 8002
```

Wait until you see: **Application startup complete.** and **Uvicorn running on http://127.0.0.1:8002**

## Terminal 2 – Frontend (React app)

**Option A:** Double‑click **run-frontend.bat** in the project folder (uses `npm.cmd` so it works even if PowerShell script execution is disabled).

**Option B:** In Command Prompt (not PowerShell if you get script errors):

```cmd
cd "C:\Users\alool\OneDrive\Desktop\DeepEcho Clinical SaaS Platform"
npm run dev
```

Wait until you see the *Local: http://localhost:5173/* (or similar) line.

## Open the app

In your browser go to the URL Vite printed (e.g. **http://localhost:5173**).

- Register or log in.
- Add a journal entry → **Analyze** (uses your fine-tuned model) → **Save Entry** → view results.

API health check: **http://localhost:8002/health**

---

## Troubleshooting

**"Only one usage of each socket address" / Port 8000 in use**

Another process (often a previous backend) is using port 8000. Free it:

```powershell
# Find process using port 8000 (last column is PID)
netstat -ano | findstr :8000

# Kill it (replace 12345 with the PID you see)
taskkill /PID 12345 /F
```

Then run the backend again.

**Use a different port (e.g. 8002) if 8000/8001 are in use:**

- Set in project root `.env`: `VITE_API_URL=http://localhost:8002` (or the port you use).
- Start the backend on that port, e.g. `--port 8002`.
- Restart the frontend so it picks up `VITE_API_URL`. Health check: **http://localhost:8002/health**

**PowerShell blocks npm ("running scripts is disabled"):** Use **Command Prompt** (cmd) to run `npm run dev`, or run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`. Or call `npm.cmd run dev` instead of `npm run dev`.
