// Shared axios instance for the real backend (listing-server: Cloudflare Worker + Hono, Neon, R2).
// Used by sign-in (lib/api/auth.ts); other pages still read lib/mock/api.ts. Move a call over by replacing
// the mock function with e.g. `apiGet<SearchResult>('/api/listings', { params })`.
//
// Where requests go:
//  - Browser: a relative `/api/...` by default. next.config.ts forwards /api/* to API_URL, so the
//    session cookie stays same-origin. Set NEXT_PUBLIC_API_URL only to call the API directly instead
//    (cross-origin: the server must then allow credentials via CORS).
//  - Server (Server Components, route handlers): straight to API_URL (default http://localhost:4000).
//    The browser's cookie is NOT sent automatically there; pass it through with `headers: { cookie }`.
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

const isServer = typeof window === 'undefined';

export const API_BASE_URL = isServer
  ? process.env.API_URL || 'http://localhost:4000'
  : process.env.NEXT_PUBLIC_API_URL || '';

/** Error thrown by every failed request: HTTP status (0 = no response) plus a message ready to show the user. */
export class ApiError extends Error {
  readonly status: number;
  readonly data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
  get isNotFound() { return this.status === 404; }
  get isUnauthorized() { return this.status === 401; }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true, // the session is an HttpOnly cookie
  headers: { Accept: 'application/json' },
});

/* Called on any 401 from the browser (session expired, or signed out elsewhere).
   AuthProvider can register a handler to clear the user and send them to /login. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn; }

api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isCancel(err)) return Promise.reject(err); // aborted on purpose: let the caller ignore it
    if (!(err instanceof AxiosError)) return Promise.reject(err);

    const status = err.response?.status ?? 0;
    const data = err.response?.data;
    // the backend answers errors as { error: "..." } (already in Mongolian)
    const serverMsg = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : '';

    let message: string;
    if (serverMsg) message = serverMsg;
    else if (err.code === AxiosError.ECONNABORTED || err.code === AxiosError.ETIMEDOUT) message = 'Сервер хариу өгөхгүй удаж байна. Дахин оролдоно уу.';
    else if (!err.response) message = isServer ? `API сервер (${err.config?.baseURL || API_BASE_URL}) ажиллахгүй байна.` : 'Сүлжээний алдаа. Интернэт холболтоо шалгана уу.';
    else if (status === 404) message = 'Олдсонгүй';
    else if (status === 401) message = 'Нэвтрэх шаардлагатай';
    else if (status === 403) message = 'Эрх хүрэхгүй байна';
    else if (status >= 500) message = `Серверийн алдаа (${status})`;
    else message = `Алдаа (${status})`;

    if (status === 401 && !isServer) onUnauthorized?.();
    return Promise.reject(new ApiError(message, status, data));
  },
);

/* Thin helpers that return the response body directly */
export const apiGet = <T>(url: string, config?: AxiosRequestConfig) => api.get<T>(url, config).then((r) => r.data);
export const apiPost = <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => api.post<T>(url, body, config).then((r) => r.data);
export const apiPut = <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => api.put<T>(url, body, config).then((r) => r.data);
export const apiPatch = <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => api.patch<T>(url, body, config).then((r) => r.data);
export const apiDelete = <T>(url: string, config?: AxiosRequestConfig) => api.delete<T>(url, config).then((r) => r.data);
