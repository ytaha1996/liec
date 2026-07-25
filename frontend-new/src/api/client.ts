import { DataService } from './DataService';
import { getUserToken } from '@/helpers/user-token';
import { ApiError, type ApiErrorPayload } from './parseApiError';

// Installed by App.tsx at mount so `unwrap` can dispatch a logout +
// redirect when the backend says 401. Loosely coupled to keep this
// file framework-agnostic and easy to test.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: () => void): void => {
  onUnauthorized = handler;
};

// Convert a fetch Response into the parsed JSON body (or throw ApiError).
// Note: 204 No Content returns `undefined as T` — pages that expect no body
// should type the call as `unwrap<void>(...)`.
export async function unwrap<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  // Only treat 401 as session expiry when the caller HAD a token — an
  // anonymous 401 (failed login attempt) must not trigger the
  // "session expired" logout/redirect flow.
  if (res.status === 401 && getUserToken()) {
    onUnauthorized?.();
  }

  let payload: ApiErrorPayload = {
    status: res.status,
    message: res.statusText || 'Request failed',
  };
  try {
    const body = await res.json();
    if (body && typeof body === 'object') {
      payload = {
        ...payload,
        ...body,
        message: typeof body.message === 'string' ? body.message : payload.message,
      };
    }
  } catch {
    // body is not JSON — keep statusText fallback
  }
  throw new ApiError(payload);
}

// Ergonomic wrappers so pages can write
//   await getJson<Shipment[]>('/api/shipments')
// instead of `unwrap(await DataService.get(...))`.

export const getJson = <T>(url: string): Promise<T> =>
  DataService.get(url).then(unwrap<T>);

export const postJson = <T>(url: string, body?: unknown): Promise<T> =>
  DataService.post(url, body).then(unwrap<T>);

export const putJson = <T>(url: string, body?: unknown): Promise<T> =>
  DataService.put(url, body).then(unwrap<T>);

export const patchJson = <T>(url: string, body?: unknown): Promise<T> =>
  DataService.patch(url, body).then(unwrap<T>);

export const deleteJson = <T>(url: string, body?: unknown): Promise<T> =>
  DataService.delete(url, body).then(unwrap<T>);

export const uploadMultipart = <T>(url: string, form: FormData): Promise<T> =>
  DataService.postForm(url, form).then(unwrap<T>);
