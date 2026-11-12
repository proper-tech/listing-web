// Mock backend: бүх өгөгдөл хөтөч дотор (IndexedDB) хадгалагдана, ямар ч сервер рүү хүсэлт явуулахгүй.
// Анх ачаалахад seed.ts-ийн жишээ өгөгдлөөр дүүргэнэ. resetMockData() нь анхны төлөвт буцаана.
import type {
  AdminListing, AdminUser, Category, Img, InquiryWithListing, Listing, ListingStatus, Placement, Report, SearchResult, SellerType, Stats, Tour, User,
} from '../types';
import { CAT_KEYS, DISTRICTS, PAY_TERMS } from '../constants';
import { DB_VERSION, seedDB, type MockDB, type StoredListing, type StoredUser } from './seed';

export class NotFoundError extends Error {}

const DAY = 864e5;
const IDB_NAME = 'ger360-mock';
const IDB_STORE = 'kv';
const IDB_KEY = 'db';

/* ---------- persistence (IndexedDB, falls back to memory) ---------- */
function openIdb(): Promise<IDBDatabase | null> {
  return new Promise((res) => {
    try {
      if (typeof indexedDB === 'undefined') return res(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    } catch { res(null); }
  });
}
function idbGet(db: IDBDatabase): Promise<MockDB | undefined> {
  return new Promise((res) => {
    try {
      const req = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => res(req.result as MockDB | undefined);
      req.onerror = () => res(undefined);
    } catch { res(undefined); }
  });
}

let dbPromise: Promise<{ data: MockDB; idb: IDBDatabase | null }> | null = null;
function load() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const idb = await openIdb();
      let data = idb ? await idbGet(idb) : undefined;
      if (!data || data.version !== DB_VERSION) {
        data = seedDB();
        if (idb) persist(idb, data);
      }
      return { data, idb };
    })();
  }
  return dbPromise;
}
function persist(idb: IDBDatabase | null, data: MockDB) {
  if (!idb) return;
  try { idb.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(data, IDB_KEY); } catch { /* keep in memory */ }
}

const wait = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180)); // feels like a network
const clone = <T,>(v: T): T => structuredClone(v);

/** Read-only access. */
async function read<T>(fn: (db: MockDB) => T): Promise<T> {
  const { data } = await load();
  await wait();
  return clone(fn(data));
}
/** Mutation; the DB is saved afterwards. */
async function write<T>(fn: (db: MockDB) => T): Promise<T> {
  const { data, idb } = await load();
  await wait();
  const out = fn(data);
  persist(idb, data);
  return clone(out);
}

export async function resetMockData() {
  const { idb } = await load();
  const fresh = seedDB();
  dbPromise = Promise.resolve({ data: fresh, idb });
  persist(idb, fresh);
}

/* ---------- helpers ---------- */
const fail = (msg: string): never => { throw new Error(msg); };
const notFound = (): never => { throw new NotFoundError('Зар олдсонгүй'); };

const promoRank = (l: StoredListing, t = Date.now()) =>
  !l.placementUntil || Date.parse(l.placementUntil) < t ? 0 : l.placement === 'top' ? 2 : l.placement === 'vip' ? 1 : 0;
const hasTour = (l: Pick<StoredListing, 'tour'>) => !!l.tour?.rooms.some((r) => r.status === 'ready');
const effStatus = (l: StoredListing): ListingStatus =>
  l.status === 'active' && Date.parse(l.expiresAt ?? "") < Date.now() ? 'expired' : l.status;
const isLive = (l: StoredListing) => effStatus(l) === 'active';

// Нийтэд харуулах зарт утасны дугаар хэзээ ч гарахгүй байх ёстой.
// Хуучин хадгалагдсан өгөгдөлд ямар ч талбар үлдсэн байсан ч энд бүгдийг нь хасна.
const PRIVATE_LISTING_KEYS = ['ownerPhone', 'ownerId', 'sellerPhone', 'phone', 'ownerToken'];
function pub(l: StoredListing): Listing {
  const copy: Record<string, unknown> = { ...l };
  for (const k of PRIVATE_LISTING_KEYS) delete copy[k];
  return { ...(copy as unknown as Listing), status: effStatus(l), hasTour: hasTour(l), promo: promoRank(l) };
}
function publicUser(u: StoredUser): User {
  const { password: _pw, ...rest } = u; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}
const me = (db: MockDB) => {
  const u = db.users.find((x) => x.id === db.sessionUserId);
  return u && u.active ? u : null;
};
function requireUser(db: MockDB, roles: User['role'][] = ['admin', 'agent']) {
  const u = me(db);
  if (!u) fail('Нэвтэрнэ үү');
  if (u!.mustChangePassword) fail('Эхлээд нууц үгээ солино уу');
  if (!roles.includes(u!.role)) fail('Эрх хүрэхгүй байна');
  return u!;
}
const findListing = (db: MockDB, id: string) => db.listings.find((l) => l.id === id);
const searchText = (l: StoredListing) =>
  [l.title, l.description, l.location.district, l.location.khoroo, l.location.address].map((s) => s ?? '').join(' ').toLowerCase();
const normEmail = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
const validPassword = (p: unknown) => typeof p === 'string' && p.length >= 8 && p.length <= 200;
const cleanStr = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cleanNum = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  return v !== '' && v != null && Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};
const cleanInt = (v: unknown, min: number, max: number) => { const n = cleanNum(v, min, max); return n === undefined ? undefined : Math.round(n); };
const randomId = () => Math.random().toString(36).slice(2, 10);

/* ---------- public listings ---------- */
const num = (v: string | null) => (v === null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export async function searchListings(params: URLSearchParams | Record<string, string>): Promise<SearchResult> {
  const q = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  return read((db) => {
    const t = Date.now();
    const g = (k: string) => q.get(k);
    let list = db.listings.filter(isLive);
    const by = (f: (l: StoredListing) => boolean) => { list = list.filter(f); };

    if (g('deal')) by((l) => l.dealType === g('deal'));
    if (g('cat')) by((l) => l.category === g('cat'));
    if (g('district')) by((l) => l.location.district === g('district'));
    if (g('placement')) by((l) => l.placement === g('placement') && promoRank(l, t) > 0);
    const range = (lo: string, hi: string, f: (l: StoredListing) => number | undefined) => {
      // Давхараас бусад шүүлтүүрт сөрөг утгыг үл тооцно (хуучин URL-д үлдсэн байж болно).
      const ok = (x: number | null) => (x !== null && (lo === 'floorMin' || x >= 0) ? x : null);
      const a = ok(num(g(lo))), b = ok(num(g(hi)));
      if (a !== null) by((l) => f(l) != null && f(l)! >= a);
      if (b !== null) by((l) => f(l) != null && f(l)! <= b);
    };
    range('priceMin', 'priceMax', (l) => l.price);
    range('ppmMin', 'ppmMax', (l) => l.pricePerM2);
    range('areaMin', 'areaMax', (l) => l.area);
    range('floorMin', 'floorMax', (l) => l.floor);
    // Нэг давхар сонгосон бол яг тэр давхрын зарыг (B1 = -1).
    const fl = num(g('floor'));
    if (fl !== null) by((l) => l.floor === fl);
    range('bfMin', 'bfMax', (l) => l.buildingFloors);
    range('yearMin', 'yearMax', (l) => l.yearInUse);
    if (g('rooms')) {
      const set = g('rooms')!.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
      by((l) => l.rooms != null && set.some((r) => (r >= 5 ? l.rooms! >= 5 : l.rooms === r)));
    }
    if (g('notFirst') === '1') by((l) => (l.floor ?? 0) > 1);
    if (g('notLast') === '1') by((l) => !!l.floor && !!l.buildingFloors && l.floor < l.buildingFloors);
    if (g('leasing') === '1') by((l) => !!l.leasing);
    if (g('tour') === '1') by(hasTour);
    if (g('garage') === '1') by((l) => !!l.garage);
    const posted = num(g('posted'));
    if (posted) by((l) => Date.parse(l.createdAt) >= t - posted * DAY);
    if (g('seller') === 'owner') by((l) => l.sellerType === 'owner');
    if (g('seller') === 'agent') by((l) => l.sellerType !== 'owner');
    if (g('q')) {
      const words = g('q')!.toLowerCase().split(/\s+/).filter(Boolean);
      by((l) => { const s = searchText(l); return words.every((w) => s.includes(w)); });
    }

    const sorters: Record<string, (a: StoredListing, b: StoredListing) => number> = {
      new: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      cheap: (a, b) => a.price - b.price,
      expensive: (a, b) => b.price - a.price,
      ppm2: (a, b) => (a.pricePerM2 ?? Infinity) - (b.pricePerM2 ?? Infinity),
      area: (a, b) => (b.area ?? 0) - (a.area ?? 0),
    };
    const sorter = sorters[g('sort') || ''] || sorters.new;
    const plain = g('plain') === '1';
    list.sort((a, b) => (plain ? 0 : promoRank(b, t) - promoRank(a, t)) || sorter(a, b) || a.id.localeCompare(b.id));

    const per = Math.max(1, Math.min(60, num(g('per')) || 24));
    const page = Math.max(1, Math.floor(num(g('page')) || 1));
    return { total: list.length, page, per, items: list.slice((page - 1) * per, page * per).map(pub) };
  });
}

export async function getStats(): Promise<Stats> {
  return read((db) => {
    const counts: Record<string, number> = {};
    const live = db.listings.filter(isLive);
    for (const l of live) counts[`${l.dealType}:${l.category}`] = (counts[`${l.dealType}:${l.category}`] || 0) + 1;
    return { counts, total: live.length };
  });
}

/** One listing. Non-active ones are visible only to their owner and admins. */
export async function getListing(id: string, { countView = false } = {}): Promise<Listing> {
  return write((db) => {
    const l = findListing(db, id) ?? notFound();
    if (!isLive(l)) {
      const u = me(db);
      if (!u || (u.role !== 'admin' && u.id !== l.ownerId)) notFound();
    }
    if (countView && isLive(l)) l.views++;
    return pub(l);
  });
}

export async function getPhone(id: string): Promise<string> {
  return read((db) => {
    const l = findListing(db, id);
    if (!l || !isLive(l)) notFound();
    return l!.ownerPhone;
  });
}

/* Reports have no API yet: they are kept in this browser's mock store by listing id (real post ids too),
   and the admin panel reads them back with listReports(). */
export async function reportListing(id: string, reason: string, note = ''): Promise<void> {
  await write((db) => {
    db.reports.unshift({ id: randomId(), listingId: cleanStr(id, 40), reason: cleanStr(reason, 40) || 'other', note: cleanStr(note, 500), createdAt: new Date().toISOString() });
  });
}

export async function listReports(): Promise<Report[]> {
  return read((db) => db.reports.slice(0, 500));
}

export async function dismissReports(listingId: string): Promise<void> {
  await write((db) => { db.reports = db.reports.filter((r) => r.listingId !== listingId); });
}

/* ---------- auth ----------
   Sign-in itself is real now (lib/api/auth.ts → listing-server). Listings, "my ads" and the admin panel
   still run on this mock DB, which needs to know who is signed in: AuthProvider mirrors the real session
   here. The agent is matched by email (so a real agent@… keeps the demo listings it owns), otherwise
   added. Remove this once those features call the API too. */
export async function mirrorSession(user: User | null): Promise<void> {
  await write((db) => {
    if (!user) { db.sessionUserId = null; return; }
    const email = normEmail(user.email);
    let u = db.users.find((x) => x.email === email);
    if (!u) {
      u = { ...user, id: `api-${user.id}`, email, password: '' };
      db.users.push(u);
    }
    Object.assign(u, { name: user.name, phone: user.phone, role: user.role, active: user.active, mustChangePassword: user.mustChangePassword });
    db.sessionUserId = u.id;
  });
}

/* ---------- posting & own ads ---------- */
export interface NewListingInput {
  dealType: string; category: string; title: string; price: string | number; description?: string;
  [field: string]: unknown;
  photos: Partial<Img>[]; tour?: { startRoomId: string | null; rooms: Partial<Tour['rooms'][number]>[] };
  location: { district: string; khoroo?: string; address?: string; lat: number | null; lng: number | null };
  sellerName: string; sellerPhone: string; sellerType: SellerType; placement: Placement;
}

function cleanImg(o: Partial<Img> | undefined): Img | null {
  if (!o || typeof o.src !== 'string' || !o.src) return null;
  return { src: o.src, width: cleanNum(o.width, 1, 20000) || 0, height: cleanNum(o.height, 1, 20000) || 0 };
}
function cleanTour(t: NewListingInput['tour']): Tour | undefined {
  if (!t || !Array.isArray(t.rooms)) return undefined;
  const rooms = t.rooms.slice(0, 30).flatMap((r) => {
    const panorama = cleanImg(r.panorama);
    if (!panorama) return [];
    return [{
      id: cleanStr(r.id, 40) || randomId(), name: cleanStr(r.name, 60) || 'Өрөө',
      source: r.source && ['upload360', 'stitched', 'ai', 'splat'].includes(r.source) ? r.source : 'upload360' as const,
      panorama, status: 'ready' as const, startYaw: cleanNum(r.startYaw, -360, 360) || 0,
      hotspots: (r.hotspots || []).slice(0, 20).map((h) => ({
        yaw: cleanNum(h.yaw, -360, 360) || 0, pitch: cleanNum(h.pitch, -90, 90) || 0,
        targetRoomId: cleanStr(h.targetRoomId, 40), label: cleanStr(h.label, 60),
      })),
    }];
  });
  if (!rooms.length) return undefined;
  const ids = new Set(rooms.map((r) => r.id));
  rooms.forEach((r) => { r.hotspots = r.hotspots.filter((h) => ids.has(h.targetRoomId) && h.targetRoomId !== r.id); });
  return { startRoomId: t.startRoomId && ids.has(t.startRoomId) ? t.startRoomId : rooms[0].id, rooms };
}

export async function createListing(b: NewListingInput): Promise<{ id: string; status: ListingStatus }> {
  return write((db) => {
    const user = requireUser(db);
    const errors: string[] = [];
    const category = (CAT_KEYS as string[]).includes(b.category) ? (b.category as Category) : null;
    if (!category) errors.push('Ангилал сонгоно уу');
    const title = cleanStr(b.title, 120);
    if (title.length < 5) errors.push('Гарчиг хамгийн багадаа 5 тэмдэгт');
    const price = cleanNum(b.price, 1, 1e13);
    if (!price) errors.push('Үнэ оруулна уу');
    const area = cleanNum(b.area, 0.5, 1e7);
    if (!area) errors.push('Талбай оруулна уу');
    const loc = b.location || ({} as NewListingInput['location']);
    const district = DISTRICTS.includes(loc.district) ? loc.district : null;
    if (!district) errors.push('Дүүрэг сонгоно уу');
    const lat = cleanNum(loc.lat, 41, 52.5), lng = cleanNum(loc.lng, 87, 120);
    if (lat === undefined || lng === undefined) errors.push('Газрын зураг дээр байршлаа тэмдэглэнэ үү');
    const sellerName = cleanStr(b.sellerName, 60) || user.name;
    const ownerPhone = cleanStr(b.sellerPhone, 20).replace(/\D/g, '') || user.phone;
    if (!/^\d{8}$/.test(ownerPhone)) errors.push('Утасны дугаар 8 оронтой байна');
    if (errors.length) fail(errors.join('. '));

    const placement: Placement = b.placement === 'vip' || b.placement === 'top' ? b.placement : 'free';
    const t = Date.now();
    const l: StoredListing = {
      id: 'L' + db.nextNo++, ownerId: user.id, ownerPhone, sellerName,
      sellerType: user.role === 'agent' ? 'agent' : ['owner', 'agent', 'company'].includes(b.sellerType) ? b.sellerType : 'agent',
      category: category!, dealType: b.dealType === 'rent' ? 'rent' : 'sale', title, price: price!, pricePerM2: Math.round(price! / area!),
      rooms: cleanInt(b.rooms, 0, 100), area, floor: cleanInt(b.floor, -5, 200), buildingFloors: cleanInt(b.buildingFloors, 1, 200),
      yearInUse: cleanInt(b.yearInUse, 1900, 2100), floorMaterial: cleanStr(b.floorMaterial, 40) || undefined,
      balconies: cleanInt(b.balconies, 0, 20), windowType: cleanStr(b.windowType, 40) || undefined,
      windowCount: cleanInt(b.windowCount, 0, 200), doorType: cleanStr(b.doorType, 40) || undefined,
      garage: !!b.garage, leasing: !!b.leasing,
      paymentTerms: (Array.isArray(b.paymentTerms) ? (b.paymentTerms as string[]) : []).filter((p) => PAY_TERMS.includes(p)),
      location: { city: 'Улаанбаатар', district: district!, khoroo: cleanStr(loc.khoroo, 40), address: cleanStr(loc.address, 160), lat: lat!, lng: lng! },
      description: cleanStr(b.description, 5000),
      photos: (b.photos || []).slice(0, 20).map(cleanImg).filter((p): p is Img => !!p),
      tour: cleanTour(b.tour),
      placement, placementUntil: placement === 'free' ? undefined : new Date(t + 7 * DAY).toISOString(),
      // agents' ads wait for admin approval; the admin's own ads go live directly
      status: user.role === 'admin' ? 'active' : 'pending',
      views: 0, createdAt: new Date(t).toISOString(), expiresAt: new Date(t + 30 * DAY).toISOString(),
    };
    db.listings.push(l);
    return { id: l.id, status: l.status };
  });
}

export async function myListings(): Promise<Listing[]> {
  return read((db) => {
    const u = requireUser(db);
    return db.listings.filter((l) => l.ownerId === u.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map(pub);
  });
}

const removeListing = (db: MockDB, id: string) => {
  db.listings = db.listings.filter((l) => l.id !== id);
  db.reports = db.reports.filter((r) => r.listingId !== id);
  db.inquiries = (db.inquiries ?? []).filter((q) => q.listingId !== id);
};

/* ---------- inquiries (зарын талаар холбогдох) ---------- */
/** Утасны дугаарыг 8 оронтой болгоно: +976, зай, зураас зэргийг хасна. Буруу бол ''. */
export function normPhone(v: unknown): string {
  let d = typeof v === 'string' ? v.replace(/\D/g, '') : '';
  if (d.length === 11 && d.startsWith('976')) d = d.slice(3);
  return /^[5-9]\d{7}$/.test(d) ? d : '';
}

export async function sendInquiry(id: string, b: { name: unknown; phone: unknown; email?: unknown; message: unknown }): Promise<void> {
  const name = cleanStr(b.name, 60);
  const phone = normPhone(b.phone);
  const email = normEmail(b.email);
  const message = cleanStr(b.message, 1000);
  if (name.length < 2) fail('Нэрээ оруулна уу.');
  if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(name)) fail('Нэрэнд зөвхөн үсэг бичнэ үү.');
  if (!phone) fail('Утасны дугаар 8 оронтой байна.');
  if (email && !validEmail(email)) fail('Имэйл хаяг буруу байна.');
  if (message.length < 5) fail('Мессежээ бичнэ үү.');
  await write((db) => {
    const l = findListing(db, id);
    if (!l || !isLive(l)) notFound();
    db.inquiries ??= [];
    db.inquiries.unshift({ id: randomId(), listingId: l!.id, name, phone, email: email || undefined, message, createdAt: new Date().toISOString(), read: false });
    db.inquiries = db.inquiries.slice(0, 2000);
  });
}

/** Нэвтэрсэн хэрэглэгчийн зарууд руу ирсэн хүсэлтүүд (админ бүгдийг харна). */
export async function myInquiries(): Promise<InquiryWithListing[]> {
  return read((db) => {
    const u = requireUser(db);
    const mine = new Map(db.listings.filter((l) => u.role === 'admin' || l.ownerId === u.id).map((l) => [l.id, l.title]));
    return (db.inquiries ?? []).filter((q) => mine.has(q.listingId)).map((q) => ({ ...q, listingTitle: mine.get(q.listingId)! }));
  });
}

export async function markInquiryRead(id: string): Promise<void> {
  await write((db) => {
    const u = requireUser(db);
    const q = (db.inquiries ?? []).find((x) => x.id === id);
    const l = q && findListing(db, q.listingId);
    if (!q || !l || (u.role !== 'admin' && l.ownerId !== u.id)) fail('Олдсонгүй');
    q!.read = true;
  });
}

export async function ownerAction(id: string, action: 'bump' | 'renew' | 'sold' | 'delete'): Promise<void> {
  await write((db) => {
    const u = requireUser(db);
    const l = findListing(db, id) ?? notFound();
    if (u.role !== 'admin' && l.ownerId !== u.id) fail('Энэ зар таных биш');
    if (action === 'sold') l.status = 'sold';
    else if (action === 'renew') {
      l.expiresAt = new Date(Date.now() + 30 * DAY).toISOString();
      if (l.status === 'expired') l.status = 'active';
    } else if (action === 'bump') {
      if (!isLive(l)) fail('Зөвхөн идэвхтэй зарыг дээшлүүлнэ');
      l.createdAt = new Date().toISOString();
    } else if (action === 'delete') removeListing(db, id);
    else fail('Үйлдэл буруу');
  });
}

/* ---------- admin ---------- */
export async function adminListings(): Promise<{ items: AdminListing[]; reports: Report[] }> {
  return read((db) => {
    requireUser(db, ['admin']);
    const items = [...db.listings]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id))
      .map((l) => ({
        ...pub(l), ownerPhone: l.ownerPhone,
        ownerName: db.users.find((u) => u.id === l.ownerId)?.name ?? null,
        reports: db.reports.filter((r) => r.listingId === l.id).length,
      }));
    return { items, reports: db.reports.slice(0, 200) };
  });
}

export async function adminUpdateListing(id: string, body: { status?: ListingStatus; action?: 'delete' }): Promise<void> {
  await write((db) => {
    requireUser(db, ['admin']);
    const l = findListing(db, id) ?? notFound();
    if (body.action === 'delete') removeListing(db, id);
    else if (body.status && ['active', 'rejected', 'pending', 'expired', 'sold'].includes(body.status)) {
      l.status = body.status;
      if (body.status === 'active') db.reports = db.reports.filter((r) => r.listingId !== id);
    } else fail('Төлөв буруу');
  });
}

export async function adminUsers(): Promise<AdminUser[]> {
  return read((db) => {
    requireUser(db, ['admin']);
    return db.users.map((u) => ({ ...publicUser(u), listings: db.listings.filter((l) => l.ownerId === u.id).length }));
  });
}

export async function adminCreateUser(b: { name: unknown; email: unknown; phone: unknown; password: unknown }): Promise<User> {
  return write((db) => {
    requireUser(db, ['admin']);
    const name = cleanStr(b.name, 60);
    const email = normEmail(b.email);
    const phone = cleanStr(b.phone, 20).replace(/\D/g, '');
    const errors: string[] = [];
    if (!name) errors.push('Нэр оруулна уу');
    if (!validEmail(email)) errors.push('Имэйл хаяг буруу байна');
    else if (db.users.some((u) => u.email === email)) errors.push('Энэ имэйлтэй хэрэглэгч бүртгэлтэй байна');
    if (!/^\d{8}$/.test(phone)) errors.push('Утасны дугаар (зар дээрх холбоо барих) 8 оронтой байна');
    if (!validPassword(b.password)) errors.push('Нууц үг хамгийн багадаа 8 тэмдэгт');
    if (errors.length) fail(errors.join('. '));
    const u: StoredUser = {
      id: 'u-' + randomId(), name, email, phone, role: 'agent', active: true,
      createdAt: new Date().toISOString(), mustChangePassword: true, password: b.password as string,
    };
    db.users.push(u);
    return publicUser(u);
  });
}

export async function adminUpdateUser(id: string, b: { name?: string; email?: string; active?: boolean; password?: string }): Promise<User> {
  return write((db) => {
    const admin = requireUser(db, ['admin']);
    const u = db.users.find((x) => x.id === id) ?? fail('Хэрэглэгч олдсонгүй');
    if (u.id === admin.id && b.active === false) fail('Өөрийгөө идэвхгүй болгох боломжгүй');
    if (typeof b.name === 'string' && cleanStr(b.name, 60)) u.name = cleanStr(b.name, 60);
    if (b.email !== undefined) {
      const email = normEmail(b.email);
      if (!validEmail(email)) fail('Имэйл хаяг буруу байна');
      if (db.users.some((x) => x.email === email && x.id !== u.id)) fail('Энэ имэйлтэй хэрэглэгч бүртгэлтэй байна');
      u.email = email;
    }
    if (typeof b.active === 'boolean') u.active = b.active;
    if (b.password !== undefined) {
      if (!validPassword(b.password)) fail('Нууц үг хамгийн багадаа 8 тэмдэгт');
      u.password = b.password;
      u.mustChangePassword = true;
    }
    return publicUser(u);
  });
}

/* ---------- uploads ---------- */
/** "Uploads" an image by turning it into a data: URL that is stored with the listing. */
export function uploadImage(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('Зураг уншиж чадсангүй'));
    r.readAsDataURL(blob);
  });
}
