-- Add flagged_for_followup to patients (run once if table already exists)
-- PostgreSQL:
ALTER TABLE patients ADD COLUMN IF NOT EXISTS flagged_for_followup BOOLEAN NOT NULL DEFAULT FALSE;

-- SQLite (no IF NOT EXISTS for columns; run only if column missing):
-- ALTER TABLE patients ADD COLUMN flagged_for_followup INTEGER NOT NULL DEFAULT 0;
