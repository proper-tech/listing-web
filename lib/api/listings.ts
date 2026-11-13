// Listings against listing-server (/api/posts, /api/uploads). Same function names and shapes as the old
// lib/mock/api.ts, so pages only swap their import. The server's `post` is converted to the app's `Listing` here.
import { CENTERS, UB } from '../constants';
import type {
  AdminListing, Category, DealType, Img, Listing, ListingStatus, Placement, SearchResult, SellerType, Stats, Tour,
} from '../types';
import { API_BASE_URL, ApiError, api, apiDelete, apiGet, apiPatch, apiPost } from './client';

/* ---------- server shapes ---------- */
interface ApiImage { key: string; url: string; width: number | null; height: number | null }
export interface ApiPost {
  id: number; agentId: number | null; title: string; description: string; dealType: DealType; category: Category;
  district: string; khoroo: string; address: string; lat: number | null; lng: number | null;
  price: number; area: number; rooms: number | null; floor: number | null; totalFloors: number | null;
  yearInUse: number | null; floorMaterial: string | null; balconies: number | null; windowType: string | null;
  windowCount: number | null; doorType: string | null; garage: boolean; leasing: boolean; paymentTerms: string[];
  tour: Tour | null; sellerName: string; sellerType: SellerType; contactPhone: string;
  placement: Placement; placementUntil: string | null; status: ListingStatus; views: number; createdAt: string;
  agent: { id: number; name: string; phone: string } | null; images: ApiImage[];
}
interface PostList { posts: ApiPost[]; total: number; page: number; limit: number; pages: number }

/** `/api/uploads/...` → absolute when the browser talks to the API directly (NEXT_PUBLIC_API_URL). */
const abs = (url: string) => (url.startsWith('/api/') ? API_BASE_URL + url : url);
/** Public R2 bucket URL (e.g. https://pub-….r2.dev). When set, photos load straight from R2 instead of via the API. */
const IMAGE_PUBLIC_URL = (process.env.NEXT_PUBLIC_IMAGE_PUBLIC_URL || '').replace(/\/+$/, '');
/** Inverse: the R2 key the server expects back in `images`. Accepts API URLs and public R2 URLs. */
const keyOf = (src: string) => {
  const i = src.indexOf('/api/uploads/');
  if (i >= 0) return src.slice(i + '/api/uploads/'.length);
  if (IMAGE_PUBLIC_URL && src.startsWith(IMAGE_PUBLIC_URL + '/')) return src.slice(IMAGE_PUBLIC_URL.length + 1);
  return src;
};
/** Photo URL: the public R2 URL when configured, else through the API. Panoramas stay on the API (`abs`):
 *  the 360° viewer loads them as WebGL textures, which needs CORS headers the r2.dev bucket doesn't send. */
export const photoUrl = (url: string) => (IMAGE_PUBLIC_URL && url.startsWith('/api/uploads/') ? `${IMAGE_PUBLIC_URL}/${keyOf(url)}` : abs(url));

const undef = <T,>(v: T | null) => (v === null ? undefined : v);
// phone numbers of listings seen in this tab, so the "call" button needn't fetch the post again
const phones = new Map<string, string>();

export function toListing(p: ApiPost): Listing {
  const id = String(p.id);
  const phone = p.contactPhone || p.agent?.phone || '';
  if (phone) phones.set(id, phone);
  const [cLat, cLng] = CENTERS[p.district] ?? UB; // posts made without a map pin fall back to the district centre
  const until = p.placementUntil ? Date.parse(p.placementUntil) : 0;
  const promo = until > Date.now() ? (p.placement === 'top' ? 2 : p.placement === 'vip' ? 1 : 0) : 0;
  const tour = p.tour ? { ...p.tour, rooms: p.tour.rooms.map((r) => ({ ...r, panorama: r.panorama && { ...r.panorama, src: abs(r.panorama.src) } })) } : undefined;
  return {
    id, title: p.title, description: p.description, dealType: p.dealType, category: p.category,
    sellerName: p.sellerName || p.agent?.name || '', sellerType: p.sellerType,
    price: p.price, area: p.area, pricePerM2: p.area > 0 ? Math.round(p.price / p.area) : undefined,
    rooms: undef(p.rooms), floor: undef(p.floor), buildingFloors: undef(p.totalFloors), yearInUse: undef(p.yearInUse),
    floorMaterial: undef(p.floorMaterial), balconies: undef(p.balconies), windowType: undef(p.windowType),
    windowCount: undef(p.windowCount), doorType: undef(p.doorType), garage: p.garage, leasing: p.leasing, paymentTerms: p.paymentTerms,
    location: { city: 'Улаанбаатар', district: p.district, khoroo: p.khoroo, address: p.address, lat: p.lat ?? cLat, lng: p.lng ?? cLng },
    photos: p.images.map((im): Img => ({ src: photoUrl(im.url), width: im.width ?? 0, height: im.height ?? 0 })),
    tour, hasTour: !!tour?.rooms.some((r) => r.status === 'ready'),
    placement: p.placement, placementUntil: undef(p.placementUntil), promo,
    status: p.status, views: p.views, createdAt: p.createdAt,
  };
}

/* ---------- public listings ---------- */
// The search page's URL params → the server's query names
const PARAM_MAP: Record<string, string> = {
  deal: 'dealType', cat: 'category', district: 'district', placement: 'placement', q: 'q', rooms: 'rooms',
  priceMin: 'minPrice', priceMax: 'maxPrice', ppmMin: 'minPpm', ppmMax: 'maxPpm', areaMin: 'minArea', areaMax: 'maxArea',
  floorMin: 'minFloor', floorMax: 'maxFloor', bfMin: 'minTotalFloors', bfMax: 'maxTotalFloors', yearMin: 'minYear', yearMax: 'maxYear',
  notFirst: 'notFirst', notLast: 'notLast', leasing: 'leasing', garage: 'garage', tour: 'hasTour',
  posted: 'postedDays', seller: 'sellerType', plain: 'plain', page: 'page', per: 'limit',
};
const SORT_MAP: Record<string, string> = { new: 'newest', cheap: 'price_asc', expensive: 'price_desc', ppm2: 'ppm_asc', area: 'area_desc' };

export async function searchListings(params: URLSearchParams | Record<string, string>): Promise<SearchResult> {
  const q = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  const out = new URLSearchParams();
  q.forEach((v, k) => {
    if (v === '') return;
    // negative values only make sense for floors (old URLs may still carry them)
    if (/(Min|Max)$/.test(k) && !k.startsWith('floor') && Number(v) < 0) return;
    if (k === 'sort') { if (SORT_MAP[v]) out.set('sort', SORT_MAP[v]); return; }
    // "Хэдэн давхарт": one exact floor → the server's floor range
    if (k === 'floor') { if (/^-?\d+$/.test(v)) { out.set('minFloor', v); out.set('maxFloor', v); } return; }
    if (k === 'roomsMin') return; // handled below together with `rooms`
    if (PARAM_MAP[k]) out.set(PARAM_MAP[k], v);
  });
  // "Өрөөний тоо: N+": the server only knows a room list (rooms=1,2,5 where 5 means 5+), so N+ becomes N..5,
  // narrowed by any rooms already picked
  const rMin = Math.min(5, Number(q.get('roomsMin')));
  if (Number.isInteger(rMin) && rMin > 0) {
    const plus = Array.from({ length: 6 - rMin }, (_, i) => rMin + i); // e.g. 3 → [3, 4, 5]
    const picked = (out.get('rooms') || '').split(',').map(Number).filter((r) => plus.includes(r));
    out.set('rooms', (picked.length ? picked : plus).join(','));
  }
  if (!out.has('limit')) out.set('limit', '24');
  const r = await apiGet<PostList>(`/api/posts?${out}`);
  return { total: r.total, page: r.page, per: r.limit, items: r.posts.map(toListing) };
}

export const getStats = () => apiGet<Stats>('/api/posts/stats');

/** One listing. Non-active ones only come back for their owner and admins (404 otherwise). */
export async function getListing(id: string, { countView = false } = {}): Promise<Listing> {
  if (!/^\d+$/.test(id)) throw new ApiError('Зар олдсонгүй', 404); // e.g. an old demo id saved in favourites
  const { post } = await apiGet<{ post: ApiPost }>(`/api/posts/${id}${countView ? '' : '?view=0'}`);
  return toListing(post);
}

export async function getPhone(id: string): Promise<string> {
  if (!phones.has(id)) await getListing(id);
  const phone = phones.get(id);
  if (!phone) throw new ApiError('Утасны дугаар бүртгэгдээгүй байна', 404);
  return phone;
}

/* ---------- posting & own ads ---------- */
export interface NewListingInput {
  dealType: string; category: string; title: string; price: string | number; description?: string;
  [field: string]: unknown;
  photos: Partial<Img>[]; tour?: { startRoomId: string | null; rooms: Partial<Tour['rooms'][number]>[] };
  location: { district: string; khoroo?: string; address?: string; lat: number | null; lng: number | null };
  sellerName: string; sellerPhone: string; sellerType: SellerType; placement: Placement;
}

/** '' / undefined → null, otherwise a number (the form keeps every field as a string). */
const n = (v: unknown) => (v === '' || v == null ? null : Number(v));
const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** The wizard's form values → the server's post body (shared by create and admin edit). */
function toApiBody(b: NewListingInput) {
  const tourRooms = (b.tour?.rooms ?? []).filter((r) => r.panorama?.src);
  return {
    title: b.title, description: b.description ?? '', dealType: b.dealType, category: b.category,
    district: b.location.district, khoroo: b.location.khoroo ?? '', address: b.location.address ?? '',
    lat: b.location.lat, lng: b.location.lng,
    price: Math.round(Number(b.price)), area: Number(b.area),
    rooms: n(b.rooms), floor: n(b.floor), totalFloors: n(b.buildingFloors), yearInUse: n(b.yearInUse),
    balconies: n(b.balconies), windowCount: n(b.windowCount),
    floorMaterial: s(b.floorMaterial), windowType: s(b.windowType), doorType: s(b.doorType),
    garage: !!b.garage, leasing: !!b.leasing, paymentTerms: Array.isArray(b.paymentTerms) ? b.paymentTerms : [],
    sellerName: b.sellerName, sellerType: b.sellerType, contactPhone: b.sellerPhone.replace(/\D/g, ''),
    placement: b.placement,
    images: b.photos.filter((p) => p.src).map((p) => ({ key: keyOf(p.src!), width: p.width, height: p.height })),
    tour: tourRooms.length
      ? { startRoomId: b.tour!.startRoomId, rooms: tourRooms.map((r) => ({ ...r, panorama: { ...r.panorama!, src: '/api/uploads/' + keyOf(r.panorama!.src) } })) }
      : null,
  };
}

export async function createListing(b: NewListingInput): Promise<{ id: string; status: ListingStatus }> {
  const { post } = await apiPost<{ post: ApiPost }>('/api/posts', toApiBody(b));
  return { id: String(post.id), status: post.status };
}

/** Admin edit: rewrites the post's content. Placement is left out: changing it is a payment, not an edit,
 *  and re-sending it would restart a paid VIP/Top period. Status is left as is. */
export async function updateListing(id: string, b: NewListingInput): Promise<Listing> {
  const { placement: _placement, ...body } = toApiBody(b);
  const { post } = await apiPatch<{ post: ApiPost }>(`/api/posts/${id}`, body);
  return toListing(post);
}

/** Every page of a list query (the server caps a page at 60). */
async function allPosts(query: string): Promise<ApiPost[]> {
  const out: ApiPost[] = [];
  for (let page = 1; ; page++) {
    const r = await apiGet<PostList>(`/api/posts?${query}&limit=60&page=${page}`);
    out.push(...r.posts);
    if (page >= r.pages) return out;
  }
}

export const myListings = async (): Promise<Listing[]> => (await allPosts('mine=1&plain=1')).map(toListing);

export type OwnerAction = 'sold' | 'archive' | 'restore' | 'delete';
/** `restore` sends an archived/sold ad back for review (an admin's goes straight back to active). */
export async function ownerAction(id: string, action: OwnerAction, isAdmin = false): Promise<void> {
  if (action === 'delete') { await apiDelete(`/api/posts/${id}`); return; }
  const status: ListingStatus = action === 'sold' ? 'sold' : action === 'archive' ? 'archived' : isAdmin ? 'active' : 'pending';
  await apiPatch(`/api/posts/${id}`, { status });
}

/* ---------- admin ---------- */
/** All posts in every status (the server shows admins everything). Reports still come from the mock store. */
export async function adminListings(): Promise<AdminListing[]> {
  return (await allPosts('plain=1')).map((p) => ({
    ...toListing(p), ownerName: p.agent?.name ?? null, ownerPhone: p.contactPhone || p.agent?.phone || '', reports: 0,
  }));
}

export async function adminUpdateListing(id: string, body: { status?: ListingStatus; action?: 'delete' }): Promise<void> {
  if (body.action === 'delete') await apiDelete(`/api/posts/${id}`);
  else if (body.status) await apiPatch(`/api/posts/${id}`, { status: body.status });
}

/* ---------- uploads ---------- */
/** Uploads an image to R2 through the API; returns its URL — the public R2 URL for a listing photo
 *  (`asPhoto`), otherwise the API URL (GET /api/uploads/...), which panoramas need. */
export async function uploadImage(blob: Blob, asPhoto = false): Promise<string> {
  const form = new FormData();
  form.append('file', blob, blob.type === 'image/png' ? 'image.png' : 'image.jpg');
  const { data } = await api.post<{ key: string; url: string }>('/api/uploads', form, { timeout: 120_000 });
  return asPhoto ? photoUrl(data.url) : abs(data.url);
}
