import axios, { AxiosInstance } from 'axios';

// Base URL comes from the environment. Falls back to a sane default so the
// frontend works standalone with demo data before the backend is connected.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Simple in-memory token holder. The backend can set this via login flow later.
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize errors so callers can read a clean message.
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Unexpected network error';
    return Promise.reject(new Error(message));
  }
);

export const api = {
  baseUrl: API_BASE_URL,
  // Health check — useful when connecting a real backend.
  ping: () => apiClient.get('/health').then((r) => r.data),
};
