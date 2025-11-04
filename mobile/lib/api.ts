import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/constants/config';

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

api.interceptors.response.use(
    res => res,
    error => {
        // Normalize error shape
        const message =
            error?.response?.data?.error?.message ||
            error.message ||
            'Network error';
        return Promise.reject(new Error(message));
    }
);
