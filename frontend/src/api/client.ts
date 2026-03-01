import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:53095'
});

api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export type GateError = {
  code: 'PHOTO_GATE_FAILED';
  message: string;
  missing: Array<{ packageId: number; stage: string }>;
};

export const parseApiError = (e: any) => e?.response?.data ?? { message: e?.message ?? 'Unknown error' };

export const getJson = <T,>(url: string) => api.get<T>(url).then((r) => r.data);
export const postJson = <T,>(url: string, body?: any) => api.post<T>(url, body).then((r) => r.data);
export const putJson = <T,>(url: string, body?: any) => api.put<T>(url, body).then((r) => r.data);
export const patchJson = <T,>(url: string, body?: any) => api.patch<T>(url, body).then((r) => r.data);

export const uploadMultipart = <T,>(url: string, form: FormData) =>
  api.post<T>(url, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
