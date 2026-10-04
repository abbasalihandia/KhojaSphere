import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AUTH_EXPIRED_EVENT, authApi, tokenStore, type AccountType, type User } from '../api';

interface AuthState {
  user: User | null;
  /** false until the stored token (if any) has been checked */
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; city: string; accountType: AccountType }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    authApi.me()
      .then((u) => alive && setUser(u))
      .catch(() => { /* invalid token is cleared by the client; network errors keep the token for the next try */ })
      .finally(() => alive && setReady(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authApi.login(email, password);
    setUser(u);
    return u;
  }, []);
  const register = useCallback(async (input: Parameters<typeof authApi.register>[0]) => {
    const u = await authApi.register(input);
    setUser(u);
    return u;
  }, []);
  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* token is cleared regardless */ }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout, setUser }), [user, ready, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
