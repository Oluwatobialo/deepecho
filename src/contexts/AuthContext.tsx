import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMe, type UserResponse } from '../lib/api';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthState {
  user: UserResponse | null;
  session: Session | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      // Get current session from Supabase
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (!currentSession) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Get user profile from backend (which syncs with Supabase Auth)
      try {
        const profile = await getMe();
        setUser(profile);
      } catch (error) {
        console.error('Failed to load user profile:', error);
        // If profile doesn't exist, create it via backend
        // For now, just set user from Supabase metadata
        const supabaseUser = currentSession.user;
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email || 'User',
          created_at: supabaseUser.created_at,
        });
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        try {
          const profile = await getMe();
          setUser(profile);
        } catch {
          // Fallback to Supabase user metadata
          const supabaseUser = session.user;
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email || 'User',
            created_at: supabaseUser.created_at,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('Login failed: No session');

      setSession(data.session);
      
      // Get user profile from backend
      try {
        const profile = await getMe();
        setUser(profile);
      } catch {
        // Fallback to Supabase user metadata
        const supabaseUser = data.user;
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email || 'User',
          created_at: supabaseUser.created_at,
        });
      }
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (!data.session) {
        // Supabase may require email confirmation
        throw new Error('Registration successful. Please check your email to confirm your account.');
      }

      setSession(data.session);
      
      // Get user profile from backend (backend will create it)
      try {
        const profile = await getMe();
        setUser(profile);
      } catch {
        // Fallback to Supabase user metadata
        const supabaseUser = data.user;
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          full_name: fullName,
          created_at: supabaseUser.created_at,
        });
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!session && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
