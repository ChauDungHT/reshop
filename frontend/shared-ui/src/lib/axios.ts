import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const TOKEN_KEY = 'reshop_token';

// ─── Axios Instance ───────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Auto-attach Bearer Token ────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`[axios]: Interceptor Request - Attaching Bearer Token to ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.log(`[Error - axios]: Request Interceptor Failed - ${error.message}`);
    return Promise.reject(error);
  }
);

// ─── Response Interceptor: Auto-logout on 401 ────────────────────────────
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || 'unknown';

    if (status === 401) {
      console.log(`[auth-context]: Logout triggered - 401 Unauthorized intercepted on ${url}`);
      // Clear stored token and redirect to login
      localStorage.removeItem(TOKEN_KEY);
      // Dispatch custom event so AuthContext can update state
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      window.location.href = '/login';
    } else {
      console.log(`[Error - axios]: Response Error - ${status} - ${url}`);
    }

    return Promise.reject(error);
  }
);

export default api;
