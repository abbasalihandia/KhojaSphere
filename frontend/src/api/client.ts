// Single place that talks HTTP to the KhojaSphere backend.
const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) || 'https://khojasphere-api.onrender.com').replace(/\/$/, '');
const TOKEN_KEY = 'khojasphere.token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t: string) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage unavailable */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
  },
};

export interface FieldError { field: string; message: string }

export class ApiError extends Error {
  status: number;
  code: string;
  details: FieldError[];
  constructor(status: number, code: string, message: string, details: FieldError[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  /** message for one form field (backend field names are camelCase) */
  fieldError(field: string): string | undefined {
    return this.details.find((d) => d.field === field)?.message;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function qs(query?: Query): string {
  if (!query) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const AUTH_EXPIRED_EVENT = 'khojasphere:auth-expired';

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  opts: { body?: unknown; query?: Query; form?: FormData; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api${path}${qs(opts.query)}`, { method, headers, body, signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'network_error', "Can't reach the KhojaSphere server. Check your connection and that the backend is running.");
  }

  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: FieldError[] } } | null)?.error;
    const apiErr = new ApiError(
      res.status,
      err?.code ?? 'http_error',
      err?.message ?? (res.status >= 500 ? 'Something went wrong on our side. Please try again.' : `Request failed (${res.status})`),
      err?.details ?? [],
    );
    if (res.status === 401 && token && ['token_expired', 'token_revoked', 'invalid_token'].includes(apiErr.code)) {
      tokenStore.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw apiErr;
  }
  return data as T;
}

export const get = <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal });
export const post = <T>(path: string, body?: unknown) => request<T>('POST', path, { body: body ?? {} });
export const put = <T>(path: string, body?: unknown) => request<T>('PUT', path, { body });
export const patch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body });
export const del = <T>(path: string) => request<T>('DELETE', path);

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return e instanceof ApiError ? e.message : fallback;
}
