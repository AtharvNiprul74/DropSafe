/**
 * HTTP transport.
 * - Demo mode  → routes the call to the in-browser demo adapter (same endpoint
 *   registry), so the UI runs standalone with PRD-consistent data.
 * - Real mode  → fetch against VITE_API_BASE_URL with the JWT attached.
 *   401 responses clear the session and bounce the user to /login.
 */
import { tokenStore } from '../auth/token';
import { demoRequest } from './demo/router';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000/api';
export const DEMO_MODE: boolean = String(import.meta.env.VITE_DEMO_MODE ?? 'true') === 'true';

type Query = Record<string, string | number | boolean | undefined | null>;

function toQueryString(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function api<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  if (DEMO_MODE) {
    return demoRequest<T>(method, path, body, query ?? {});
  }

  const res = await fetch(`${BASE_URL}${path}${toQueryString(query)}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tokenStore.get() ? { Authorization: `Bearer ${tokenStore.get()}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401) {
    tokenStore.clear();
    if (!location.pathname.startsWith('/login')) {
      location.assign('/login');
    }
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? `Request failed (${res.status})`, data);
  }
  return data as T;
}

/** Convenience wrappers keep call-sites readable. */
export const get = <T>(path: string, query?: Query) => api<T>('GET', path, undefined, query);
export const post = <T>(path: string, body?: unknown) => api<T>('POST', path, body);
export const patch = <T>(path: string, body?: unknown) => api<T>('PATCH', path, body);
