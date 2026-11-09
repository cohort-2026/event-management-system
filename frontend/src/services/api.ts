import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.API_URL ?? 'https://event-management-system-backend-beta.vercel.app/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export default api;
