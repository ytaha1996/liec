import axios from 'axios';
import { humanizeStatusInText } from '../helpers/humanize-status';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://liec-shipment.azurewebsites.net/'
});

api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export type GateError = {
  code: 'PHOTO_GATE_FAILED';
  message: string;
  missing: Array<{ packageId: number; customerName?: string; stage: string }>;
};

export const parseApiError = (e: any) => {
  const payload = e?.response?.data ?? { message: e?.message ?? 'Unknown error' };
  // Humanise CamelCase status tokens (e.g. "ReadyToShip" → "Ready to Ship")
  // so backend transition errors surface readable text in toasts.
  if (typeof payload.message === 'string') {
    return { ...payload, message: humanizeStatusInText(payload.message) };
  }
  return payload;
};

export const getJson = <T,>(url: string) => api.get<T>(url).then((r) => r.data);
export const postJson = <T,>(url: string, body?: any) => api.post<T>(url, body).then((r) => r.data);
export const putJson = <T,>(url: string, body?: any) => api.put<T>(url, body).then((r) => r.data);
export const patchJson = <T,>(url: string, body?: any) => api.patch<T>(url, body).then((r) => r.data);

export const uploadMultipart = <T,>(url: string, form: FormData) =>
  api.post<T>(url, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
