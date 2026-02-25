import axios from 'axios';
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5173'
});
api.interceptors.request.use((c) => {
    const t = localStorage.getItem('token');
    if (t)
        c.headers.Authorization = `Bearer ${t}`;
    return c;
});
export const parseApiError = (e) => e?.response?.data ?? { message: e?.message ?? 'Unknown error' };
export const getJson = (url) => api.get(url).then((r) => r.data);
export const postJson = (url, body) => api.post(url, body).then((r) => r.data);
export const putJson = (url, body) => api.put(url, body).then((r) => r.data);
export const uploadMultipart = (url, form) => api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
