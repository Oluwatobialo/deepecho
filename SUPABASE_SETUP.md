# Supabase Setup Guide

This project now uses Supabase for authentication and database. Follow these steps to set it up:

## 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: DeepEcho (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
5. Wait for the project to be created (takes 1-2 minutes)

## 2. Get Your Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

3. Go to **Settings** → **Database** → **Connection string**
   - Select **URI** tab
   - Copy the connection string (replace `[YOUR-PASSWORD]` with your database password)

## 3. Configure Backend

Edit `backend/.env` (create it if it doesn't exist):

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database connection string (PostgreSQL from Supabase)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Model path (optional, defaults to ./models/mental-bert)
MODEL_PATH=./models/mental-bert
```

## 4. Configure Frontend

Edit `.env` in the project root:

```env
# Backend API URL
VITE_API_URL=http://localhost:8002

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 5. Create Database Tables

Run this SQL in Supabase SQL Editor (**SQL Editor** → **New Query**):

```sql
-- User profiles table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_of_birth TEXT,
    initial_concern TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    practitioner_notes TEXT,
    prediction TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    risk_score INTEGER NOT NULL,
    sentiment_polarity TEXT,
    sentiment_score INTEGER,
    detected_patterns TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_patient_id ON journal_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
```

## 6. Enable Row Level Security (RLS)

In Supabase SQL Editor, run:

```sql
-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Enable RLS on patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own patients
CREATE POLICY "Users can view own patients" ON patients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patients" ON patients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patients" ON patients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patients" ON patients
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on journal_entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit entries for their own patients
CREATE POLICY "Users can view own entries" ON journal_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = journal_entries.patient_id
            AND patients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own entries" ON journal_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = journal_entries.patient_id
            AND patients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own entries" ON journal_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = journal_entries.patient_id
            AND patients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own entries" ON journal_entries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = journal_entries.patient_id
            AND patients.user_id = auth.uid()
        )
    );
```

## 7. Install Dependencies

**Backend:**
```bash
cd backend
py -m pip install -r requirements.txt
```

**Frontend:**
```bash
npm install
```

## 8. Start the Application

**Backend:**
```bash
cd backend
py -m uvicorn main:app --host 127.0.0.1 --port 8002
```

**Frontend:**
```bash
npm run dev
```

## Notes

- **Email Confirmation**: By default, Supabase requires email confirmation. To disable it for development:
  - Go to **Authentication** → **Settings** → **Email Auth**
  - Toggle off "Confirm email"
  
- **Service Role Key**: Never expose this in frontend code! It bypasses RLS and should only be used in backend.

- **Migration from SQLite**: If you have existing SQLite data, you'll need to export and import it manually into Supabase.
