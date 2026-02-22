/**
 * Supabase client for authentication and database.
 * Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 */
import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = (): string => {
  try {
    const env = (import.meta as { env?: { VITE_SUPABASE_URL?: string } }).env;
    if (env?.VITE_SUPABASE_URL) return env.VITE_SUPABASE_URL;
  } catch {
    // ignore
  }
  throw new Error('VITE_SUPABASE_URL is not set in .env');
};

const getSupabaseAnonKey = (): string => {
  try {
    const env = (import.meta as { env?: { VITE_SUPABASE_ANON_KEY?: string } }).env;
    if (env?.VITE_SUPABASE_ANON_KEY) return env.VITE_SUPABASE_ANON_KEY;
  } catch {
    // ignore
  }
  throw new Error('VITE_SUPABASE_ANON_KEY is not set in .env');
};

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
