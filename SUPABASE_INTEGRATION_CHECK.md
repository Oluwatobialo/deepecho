# Supabase Integration Check

## How integration works

| Layer | Role |
|-------|------|
| **Frontend** | Does **not** call Supabase directly. It calls your **backend** (`/api/auth/login`, `/api/auth/register`). Token is stored in localStorage. |
| **Backend** | Uses **Supabase** for: (1) Auth – `sign_up` / `sign_in_with_password`, returns JWT; (2) Token check – `get_user(jwt)` for `/api/auth/me` and protected routes; (3) Database – **PostgreSQL** via `DATABASE_URL` (Supabase Postgres). |
| **Supabase** | Auth (users, JWTs) + PostgreSQL (tables: `user_profiles`, `patients`, `journal_entries`). |

## Backend requirements

In **`backend/.env`** you must have:

- `SUPABASE_URL` – Project URL (e.g. `https://xxxx.supabase.co`) from **Supabase Dashboard > Settings > API**
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key from the same API page (keep secret)
- `DATABASE_URL` – PostgreSQL connection string from **Supabase Dashboard > Settings > Database > Connection string (URI)**, with your DB password filled in

Without these, the backend cannot talk to Supabase (auth or database).

## Run the check

From the **backend** folder:

```bash
cd backend
py check_supabase.py
```

This verifies:

1. Env vars are set and look valid  
2. Supabase client can be created  
3. Database connection works and required tables exist  

If anything fails, the script prints what to fix.

## Current status (from your `backend/.env`)

| Variable | Status | Action |
|----------|--------|--------|
| **SUPABASE_URL** | OK | `https://rqclqrmakzgbwmqcqvsr.supabase.co` |
| **SUPABASE_ANON_KEY** | Wrong value | You have `sb_publishable_...` – use the long **anon** JWT (starts with `eyJ...`) from Dashboard > API. |
| **SUPABASE_SERVICE_ROLE_KEY** | Wrong key | Value looks like the **anon** JWT (payload has `"role":"anon"`). Use the **service_role** key from Dashboard > API (different key, role is service_role). |
| **DATABASE_URL** | Placeholder | Still has `YOUR-DB-PASSWORD` and `YOUR-PROJECT-REF`. Replace with your real DB password and project ref (e.g. `rqclqrmakzgbwmqcqvsr`). |

So Supabase is only partly configured. Fix the three items above, then run `py check_supabase.py` from the `backend` folder.

## Frontend

- Auth goes through the backend only; no Supabase env vars are required in the frontend for login/register to work.
- If you use Supabase elsewhere in the frontend later, you would set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the project root `.env`.

## Summary

| Check | Status |
|-------|--------|
| Backend auth (register/login) uses Supabase | Yes – `routers/auth.py` calls `supabase.auth.sign_up` / `sign_in_with_password` |
| Backend token verification uses Supabase | Yes – `auth_supabase.py` uses `supabase.auth.get_user(jwt)` |
| Backend DB uses Supabase Postgres | Yes – when `DATABASE_URL` is PostgreSQL |
| Backend env vars in `.env` | **You must set** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` in `backend/.env` |
| Frontend auth | Uses backend API only; no direct Supabase call for auth |
| Tables in Supabase | Run SQL from `SUPABASE_SETUP.md` (Section 5 & 6) if not done |

To finish integration: fill **`backend/.env`** with the three variables above, then run **`py check_supabase.py`** again until it reports success.
