'use client';
// Images picked in "Зар нэмэх" stay on this device until the listing is actually submitted: nothing is uploaded
// to R2 for drafts that are never published. Each pending image is kept in memory (fast) and in IndexedDB, so a
// draft restored after a reload or a closed tab still has its photos. Keys are prefixed with the user id, so one
// user's files are never handed to another. Every call fails soft: without IndexedDB (private mode) images still
// work for the current visit, they just aren't restored after a reload.

const DB_NAME = 'propertech-local-files';
const STORE = 'files';
const mem = new Map<string, Blob>();

let dbp: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  dbp ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}
function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then((d) => new Promise<T | undefined>((resolve) => {
    if (!d) return resolve(undefined);
    try {
      const t = d.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = t.onabort = () => resolve(undefined);
    } catch { resolve(undefined); }
  }));
}

const newId = (userId: string) => `${userId}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Keeps a blob on this device; returns its id (store it in the draft as `localId`). */
export function keepLocal(userId: string, blob: Blob): string {
  const id = newId(userId);
  mem.set(id, blob);
  void tx('readwrite', (s) => { s.put(blob, id); });
  return id;
}

/** The kept blob, or null if it is gone (storage cleared, or never persisted and the page was reloaded). */
export async function getLocal(id: string): Promise<Blob | null> {
  const m = mem.get(id);
  if (m) return m;
  const b = await tx<Blob>('readonly', (s) => s.get(id));
  if (b instanceof Blob) { mem.set(id, b); return b; }
  return null;
}

export function dropLocal(id: string) {
  mem.delete(id);
  void tx('readwrite', (s) => { s.delete(id); });
}

/** Removes every kept file of this user (draft published or started over). */
export function dropAllLocal(userId: string) {
  for (const k of [...mem.keys()]) if (k.startsWith(userId + ':')) mem.delete(k);
  void tx('readwrite', (s) => { s.delete(IDBKeyRange.bound(userId + ':', userId + ':￿')); });
}
