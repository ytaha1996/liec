import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000' });
api.interceptors.request.use((c) => { const t=localStorage.getItem('token'); if(t){ c.headers.Authorization=`Bearer ${t}`;} return c; });
export const parseApiError = (e:any) => e?.response?.data ?? { message: e.message };
