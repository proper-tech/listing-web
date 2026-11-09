'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}
const AuthCtx = createContext<AuthState>({ user: null, loading: true, setUser: () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ user: User | null }>('/api/auth/me').then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  const logout = useCallback(async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* cookie is cleared anyway on next login */ }
    setUser(null);
    router.push('/');
    router.refresh();
  }, [router]);
  return <AuthCtx.Provider value={{ user, loading, setUser, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
