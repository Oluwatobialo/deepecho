# Fix backend/.env – Step-by-step guide

Do these in order. You’ll need your **Supabase project** open in the browser.

---

## Part 1: Get the keys and URL from Supabase

### Step 1 – Open API settings

1. Go to **https://app.supabase.com** and sign in.
2. Open your project (e.g. the one with URL `https://rqclqrmakzgbwmqcqvsr.supabase.co`).
3. In the left sidebar, click the **gear icon** (Settings).
4. Click **API** under “Project Settings”.

You should see:

- **Project URL** (e.g. `https://rqclqrmakzgbwmqcqvsr.supabase.co`)
- **Project API keys** with two keys:
  - **anon** **public** – long string starting with `eyJ...`
  - **service_role** **secret** – another long string starting with `eyJ...` (often labeled “secret” or “Do not expose”)

### Step 2 – Copy the correct keys

- **anon key**  
  - Copy the **anon** **public** key (the full long string starting with `eyJ...`).  
  - Ignore any shorter “publishable” style key like `sb_publishable_...`.  
  - This is for `SUPABASE_ANON_KEY` (optional for backend but good to have correct).

- **service_role key**  
  - Copy the **service_role** key (the one that is **not** the anon key).  
  - It’s usually under “service_role” or “secret” and also starts with `eyJ...`.  
  - This is for `SUPABASE_SERVICE_ROLE_KEY` – **this one is required**.

Keep the API page open; you’ll use the same project for the database URL next.

---

## Part 2: Get the database connection string

### Step 3 – Open Database settings

1. In the same Supabase project, go to **Settings** (gear icon).
2. Click **Database** in the left sidebar.
3. Scroll to the **Connection string** section.

### Step 4 – Copy the URI and add your password

1. Open the **URI** tab (not “Transaction” or “Session”).
2. Copy the connection string. It looks like one of these:
   - `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - or `postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres`
3. Find the part that says **`[YOUR-PASSWORD]`**.
4. Replace **`[YOUR-PASSWORD]`** with the **database password** you chose when you created the project.  
   - If you don’t remember it: same Database settings page often has a “Reset database password” option (use with care).
5. If your password contains special characters (e.g. `@`, `#`, `%`, `&`), they must be **URL-encoded** in the string:
   - `@` → `%40`
   - `#` → `%23`
   - `%` → `%25`
   - `&` → `%26`
   - `+` → `%2B`
   - `/` → `%2F`
   - `=` → `%3D`

The result is your full **DATABASE_URL** (one line, no spaces).

---

## Part 3: Edit backend/.env

### Step 5 – Open backend/.env

1. In your project, open the file **`backend/.env`** (in the `backend` folder, not the root `.env`).

### Step 6 – Set each variable

Replace or add these lines with **your** values (no quotes unless your editor requires them):

```env
# Supabase – from Settings > API
SUPABASE_URL=https://rqclqrmakzgbwmqcqvsr.supabase.co
SUPABASE_ANON_KEY=<paste the long anon key starting with eyJ...>
SUPABASE_SERVICE_ROLE_KEY=<paste the service_role key starting with eyJ...>

# Database – from Settings > Database > Connection string > URI (password replaced)
DATABASE_URL=<paste the full URI with [YOUR-PASSWORD] replaced by your real password>
```

- **SUPABASE_URL**  
  - You can keep as is if it’s already `https://rqclqrmakzgbwmqcqvsr.supabase.co`, or copy from Dashboard → API → Project URL.

- **SUPABASE_ANON_KEY**  
  - Paste the **anon public** key (long, starts with `eyJ...`).  
  - Remove any old value like `sb_publishable_...`.

- **SUPABASE_SERVICE_ROLE_KEY**  
  - Paste the **service_role** key (the secret one, not the anon key).  
  - This must be the key that in the JWT payload has `"role":"service_role"` (you can decode it at jwt.io to double-check if needed).

- **DATABASE_URL**  
  - Paste the full PostgreSQL URI from Step 4, with your real password (and special characters encoded) in place of `[YOUR-PASSWORD]`.  
  - It should look like:  
    `postgresql://postgres:YourActualPassword@db.rqclqrmakzgbwmqcqvsr.supabase.co:5432/postgres`  
    (with your real password and project ref).

### Step 7 – Save the file

Save **backend/.env**. Make sure:

- There are no spaces around the `=` signs.
- No quotes around the values unless your setup requires them.
- The file is named exactly `.env` and is in the `backend` folder.

---

## Part 4: Verify

### Step 8 – Run the check script

1. Open a terminal.
2. Go to the backend folder:
   ```bash
   cd backend
   ```
3. Run:
   ```bash
   py check_supabase.py
   ```

If everything is correct, you’ll see something like:

- `OK: SUPABASE_URL is set`
- `OK: SUPABASE_SERVICE_ROLE_KEY is set`
- `OK: DATABASE_URL is set (PostgreSQL)`
- `OK: Supabase client created`
- `OK: All required tables exist`
- `--- Supabase integration OK ---`

If any step fails, the script will say what’s wrong (e.g. wrong key, wrong password, or missing tables). Fix that line in `backend/.env` and run the script again.

---

## Quick checklist

- [ ] Opened Supabase Dashboard → Settings → API.
- [ ] Copied **anon public** key (long `eyJ...`) → `SUPABASE_ANON_KEY`.
- [ ] Copied **service_role** key (secret, `eyJ...`) → `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Opened Settings → Database → Connection string → URI.
- [ ] Replaced `[YOUR-PASSWORD]` with real DB password (and URL-encoded any special characters).
- [ ] Pasted full URI → `DATABASE_URL` in `backend/.env`.
- [ ] Saved `backend/.env`.
- [ ] Ran `py check_supabase.py` from `backend` and saw “Supabase integration OK”.

Once all are done, your backend can use Supabase for auth and the database correctly.
