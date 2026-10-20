import axios, { AxiosInstance } from 'axios';

// Base URL comes from the environment.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'plantsight_token';

// Read initial token from localStorage if present
let authToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

export function getAuthToken(): string | null {
  return authToken;
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      delete apiClient.defaults.headers.common.Authorization;
    }
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize header if initial token is present
if (authToken) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${authToken}`;
}

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 Unauthorized occurs on an authenticated resource (not during login/signup attempt)
    if (error?.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/signup')) {
        setAuthToken(null);
      }
    }

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
  ping: () => apiClient.get('/health').then((r) => r.data),
};
