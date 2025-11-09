import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../constants/config';

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use(async config => {
    try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
            config.headers = config.headers ?? {};
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch {}
    return config;
});

// Track if we're currently refreshing to avoid multiple refresh attempts
let isRefreshing = false;

interface QueuedRequest {
    resolve: (value: null) => void;
    reject: (reason: Error) => void;
}

let failedQueue: QueuedRequest[] = [];

const processQueue = (error: Error | null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(null);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    res => res,
    async error => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Wait for the refresh to complete
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => api(originalRequest))
                    .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh the token
                await api.post('/auth/refresh');

                // Token refreshed successfully, retry the original request
                processQueue(null);
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, clear tokens and reject
                processQueue(
                    new Error('Session expired. Please log in again.')
                );
                await SecureStore.deleteItemAsync('auth_token');
                await SecureStore.deleteItemAsync('refresh_token');
                await SecureStore.deleteItemAsync('user_data');
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Normalize error shape
        const message =
            error?.response?.data?.error?.message ||
            error?.response?.data?.error ||
            error.message ||
            'Network error';
        return Promise.reject(new Error(message));
    }
);
