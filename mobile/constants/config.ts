import Constants from 'expo-constants';

// Prefer runtime public env var, with fallbacks to app.json extra
export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra as any)?.API_URL ||
    // Default dev fallback (adjust to your LAN IP if using a physical device)
    'http://localhost:8080/api/v1';

export const REQUEST_TIMEOUT_MS = 15000;

// Twitch OAuth configuration
export const TWITCH_CLIENT_ID =
    process.env.EXPO_PUBLIC_TWITCH_CLIENT_ID ||
    (Constants.expoConfig?.extra as any)?.TWITCH_CLIENT_ID ||
    '';

// Expo project ID for push notifications
export const EXPO_PROJECT_ID =
    process.env.EXPO_PUBLIC_PROJECT_ID ||
    (Constants.expoConfig?.extra as any)?.eas?.projectId ||
    '';
