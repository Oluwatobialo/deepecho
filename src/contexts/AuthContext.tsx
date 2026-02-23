import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMe, login as apiLogin, register as apiRegister, setToken, clearToken, getToken, type UserResponse, type RegisterConfirmResponse } from '../lib/api';

interface AuthState {
  user: UserResponse | null;
  session: null;
  loading: boolean;
}

/** Result of register(): token + user, or requires_confirmation + message. */
export type RegisterResult = { access_token: string; user: UserResponse } | RegisterConfirmResponse;

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  /** Returns token+user on full success, or requires_confirmation+message when email confirmation is required. Throws on error. */
  register: (email: string, password: string, fullName: string) => Promise<RegisterResult>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      if (!getToken()) {
        setUser(null);
        setLoading(false);
        return;
      }
      const profile = await getMe();
      setUser(profile);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setToken(data.access_token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string): Promise<RegisterResult> => {
    const data = await apiRegister(email, password, fullName);
    if ("requires_confirmation" in data && data.requires_confirmation) {
      return data as RegisterConfirmResponse;
    }
    const tokenData = data as { access_token: string; user: UserResponse };
    setToken(tokenData.access_token);
    setUser(tokenData.user);
    return tokenData;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    session: null,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
