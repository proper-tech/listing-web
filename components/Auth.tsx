'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, logout as apiLogout } from '@/lib/api/auth';
import { setUnauthorizedHandler } from '@/lib/api/client';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthCtx = createContext<AuthState>({ user: null, loading: true, setUser: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback(async (u: User | null) => { setUserState(u); }, []);

  useEffect(() => {
    getMe()
      .catch(() => null) // API unreachable: treat as signed out
      .then((u) => setUserState(u))
      .finally(() => setLoading(false));
  }, []);

  // any 401 from the API (session expired, password changed on another device) signs out here too
  useEffect(() => {
    setUnauthorizedHandler(() => { void setUser(null); });
    return () => setUnauthorizedHandler(null);
  }, [setUser]);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch { /* clear the local state anyway */ }
    await setUser(null);
    router.push('/');
  }, [router, setUser]);

  return <AuthCtx.Provider value={{ user, loading, setUser, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
