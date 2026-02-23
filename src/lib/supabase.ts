/**
 * Supabase client for authentication and database.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env at project root.
 * Get these from Supabase Dashboard → Project Settings → API.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string)?.trim() || '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim() || '';

const isValid = url.length > 0 && !url.startsWith('https://YOUR-') && anonKey.length >= 20;

if (!isValid && import.meta.env.DEV) {
  console.error(
    'Supabase env missing or invalid. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (from Supabase Dashboard → Settings → API). Restart the dev server after changing .env.'
  );
}

// Always create a client so the app mounts; auth will fail with a clear error if env is invalid
export const supabase: SupabaseClient = createClient(
  isValid ? url : 'https://placeholder.supabase.co',
  isValid ? anonKey : 'placeholder-key'
);
