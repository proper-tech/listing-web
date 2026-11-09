// Хөтөч дээрээс дуудах: харьцангуй URL, Next.js /api-г Node сервер рүү дамжуулна.
export async function api<T = unknown>(url: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(url, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || `Алдаа (${r.status})`);
  return j as T;
}

export class NotFoundError extends Error {}

// Server Component-оос дуудах: Node API руу шууд.
export async function serverApi<T = unknown>(path: string): Promise<T> {
  const base = process.env.API_URL || 'http://localhost:4000';
  let r: Response;
  try {
    r = await fetch(base + path, { cache: 'no-store' });
  } catch {
    throw new Error('API сервер ажиллахгүй байна. "npm run dev" командаар хоёуланг нь асаана уу.');
  }
  if (r.status === 404) throw new NotFoundError('Олдсонгүй');
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || `Алдаа (${r.status})`);
  return j as T;
}
