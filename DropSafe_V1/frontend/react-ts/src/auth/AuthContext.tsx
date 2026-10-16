import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SessionUser } from '../types/models';
import { tokenStore } from './token';
import { login as apiLogin, me as apiMe, logout as apiLogout } from '../api/services/auth';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
  /** true when the user holds ANY of the given permissions */
  canAny: (...perms: string[]) => boolean;
  /** true when the user holds ALL of the given permissions */
  canAll: (...perms: string[]) => boolean;
  hasRole: (role: string) => boolean;
  isAdmin: boolean;
  isMentor: boolean;
  isTeacher: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const u = await apiMe();
        if (!cancelled) setUser(u);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    void apiLogout().catch(() => undefined);
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(() => {
    const perms = new Set(user?.permissions ?? []);
    const roles = new Set(user?.roles ?? []);
    return {
      user,
      loading,
      login,
      logout,
      canAny: (...p: string[]) => p.some((x) => perms.has(x)),
      canAll: (...p: string[]) => p.every((x) => perms.has(x)),
      hasRole: (r: string) => roles.has(r),
      isAdmin: roles.has('ORG_ADMIN'),
      isMentor: roles.has('MENTOR'),
      isTeacher: roles.has('TEACHER'),
    };
  }, [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
