# Supabase Quick Setup (DeepEcho)

Follow these steps in order. You’ll need a Supabase account (free at [app.supabase.com](https://app.supabase.com)).

---

## Step 1: Create a Supabase project (in browser)

1. Open **https://app.supabase.com** and sign in (or sign up with GitHub/email).
2. Click **“New project”**.
3. Fill in:
   - **Organization**: use default or create one.
   - **Name**: e.g. `DeepEcho`.
   - **Database password**: choose a strong password and **save it** (you need it for `DATABASE_URL`).
   - **Region**: pick one close to you.
4. Click **“Create new project”** and wait 1–2 minutes until it’s ready.

---

## Step 2: Get your credentials

### A) API keys and URL

1. In the left sidebar: **Settings** (gear) → **API**.
2. Copy and save:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
   - **service_role** key (another long string) — **keep this secret; only use in backend.**

### B) Database connection string

1. In the left sidebar: **Settings** → **Database**.
2. Scroll to **“Connection string”**.
3. Open the **“URI”** tab.
4. Copy the URI. It looks like:
   `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
   or
   `postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres`
5. Replace `[YOUR-PASSWORD]` with the **database password** you set in Step 1.  
   If the password contains special characters, URL-encode them (e.g. `@` → `%40`, `#` → `%23`).

---

## Step 3: Configure backend `.env`

1. In your project, open (or create) **`backend/.env`**.
2. Paste the block below and replace the placeholders with your real values:

```env
# Supabase (from Settings → API)
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# Database (from Settings → Database → Connection string → URI)
# Replace [YOUR-PASSWORD] with your database password
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.YOUR-PROJECT-REF.supabase.co:5432/postgres

# Optional: model path (defaults to ./models/mental-bert)
MODEL_PATH=./models/mental-bert
```

- `SUPABASE_URL` = **Project URL** from Step 2A.  
- `SUPABASE_ANON_KEY` = **anon public** from Step 2A.  
- `SUPABASE_SERVICE_ROLE_KEY` = **service_role** from Step 2A.  
- `DATABASE_URL` = the URI from Step 2B with the password filled in.

---

## Step 4: Configure frontend `.env`

1. In the **project root** (same folder as `package.json`), open **`.env`**.
2. Set the Supabase values (same URL and anon key as backend; **do not** put the service_role key here):

```env
VITE_API_URL=http://localhost:8002

VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

Replace `YOUR-PROJECT-REF` and the anon key with your real values from Step 2A.

---

## Step 5: Create database tables in Supabase

1. In Supabase dashboard: **SQL Editor** → **New query**.
2. Paste and run the SQL from **“Database tables”** in **`SUPABASE_SETUP.md`** (the `CREATE TABLE` and index statements).
3. Then run the **RLS** section in **`SUPABASE_SETUP.md`** (the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements).

(Or copy the full SQL blocks from `SUPABASE_SETUP.md` and run them one after the other.)

---

## Step 6: Fix "Failed to fetch" — URL Configuration

If login or signup shows **"Failed to fetch"**, add your app URL in Supabase:

1. In Supabase: **Authentication** → **URL Configuration**.
2. Set **Site URL** to your app origin, e.g. `http://localhost:5173` or `http://localhost:3000` (use the port Vite shows when you run `npm run dev`).
3. Under **Redirect URLs**, add the same URL(s), e.g. `http://localhost:5173/**` and `http://localhost:3000/**`.
4. Save. Then try login/signup again.

Also ensure `.env` at the project root has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (from Project Settings → API). Restart the dev server after changing `.env`.

---

## Step 7: (Optional) Turn off email confirmation for local dev

If you want to sign up and log in without confirming email:

1. In Supabase: **Authentication** → **Providers** → **Email**.
2. Turn **off** “Confirm email” and save.

---

## Step 8: Run the app

- **Backend:**  
  `cd backend`  
  `py -m uvicorn main:app --host 127.0.0.1 --port 8002`

- **Frontend:**  
  From project root:  
  `npm run dev`

Then open the app in the browser, register a user, and log in.

---

## Checklist

- [ ] Supabase project created
- [ ] Project URL, anon key, and service_role key copied
- [ ] Database connection string copied and password replaced
- [ ] `backend/.env` filled with Supabase and `DATABASE_URL`
- [ ] Root `.env` filled with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Tables and RLS SQL run in Supabase SQL Editor
- [ ] (Optional) Email confirmation disabled for dev
- [ ] Backend and frontend started; sign up / login tested

If something doesn’t work, double-check that **Project URL** and **anon key** match in both `.env` files and that **DATABASE_URL** has the correct password (and encoding for special characters).
