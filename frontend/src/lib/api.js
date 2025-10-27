import axios, { AxiosError } from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // Important: Send cookies with requests
});
// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];
const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        }
        else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};
// Response interceptor to handle token refresh on 401
apiClient.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry) {
        // Check if this is a refresh token request failing
        if (originalRequest.url === "/auth/refresh") {
            // Refresh token is invalid, logout user
            isRefreshing = false;
            processQueue(error, null);
            // Let the AuthContext handle the logout
            return Promise.reject(error);
        }
        if (isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then(() => {
                return apiClient(originalRequest);
            })
                .catch((err) => {
                return Promise.reject(err);
            });
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
            // Try to refresh the token
            const response = await apiClient.post('/auth/refresh');
            // Token refreshed successfully (new tokens are in cookies)
            isRefreshing = false;
            processQueue(null, response);
            // Retry the original request
            return apiClient(originalRequest);
        }
        catch (refreshError) {
            // Refresh failed
            isRefreshing = false;
            processQueue(refreshError, null);
            return Promise.reject(refreshError);
        }
    }
    return Promise.reject(error);
});
export default apiClient;
