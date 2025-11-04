import Constants from 'expo-constants';

// Prefer runtime public env var, with fallbacks to app.json extra
export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra as any)?.API_URL ||
    // Default dev fallback (adjust to your LAN IP if using a physical device)
    'http://localhost:8080/api/v1';

export const REQUEST_TIMEOUT_MS = 15000;
