'use client';
import { useMemo, useSyncExternalStore } from 'react';

// localStorage wrapper: storage may be unavailable (private mode), so every access is guarded.
const EVENT = 'ger360-store';

export const store = {
  get<T>(k: string, d: T): T {
    try { const v = localStorage.getItem(k); return v == null ? d : (JSON.parse(v) as T); } catch { return d; }
  },
  set(k: string, v: unknown) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ }
    window.dispatchEvent(new Event(EVENT));
  },
};

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); };
}
function rawGetter(k: string) {
  return () => { try { return localStorage.getItem(k); } catch { return null; } };
}

/** Reactive value from localStorage (null on the server and during hydration). */
export function useStored<T>(k: string, d: T): T {
  const raw = useSyncExternalStore(subscribe, rawGetter(k), () => null);
  return useMemo(() => { try { return raw == null ? d : (JSON.parse(raw) as T); } catch { return d; } }, [raw]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useFavs(): string[] { return useStored<string[]>('favs', []); }

export function toggleFav(id: string): boolean {
  const f = store.get<string[]>('favs', []);
  const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  store.set('favs', f);
  return i < 0;
}
