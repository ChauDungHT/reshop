import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const BASE_URL = API_URL.replace('/api', '');

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: gắn token vào header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('reshop_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: xử lý 401
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('reshop_token');
      localStorage.removeItem('reshop_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
