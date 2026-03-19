import * as SecureStore from 'expo-secure-store';
import ENV from '@/constants/env';
import type { ApiError } from '@/types';

const BASE_URL = `${ENV.API_URL}/api/${ENV.API_VERSION}`;

const TOKEN_KEY = 'clipper_access_token';
const REFRESH_TOKEN_KEY = 'clipper_refresh_token';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    await clearTokens();
    return null;
  }

  const data = await res.json();
  await setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, params, auth = true } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    let token = await getToken();
    if (!token) {
      token = await refreshAccessToken();
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      const retry = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      if (!retry.ok) {
        const err: ApiError = await retry.json().catch(() => ({
          error: 'request_failed',
          message: retry.statusText,
          status_code: retry.status,
        }));
        throw err;
      }
      return retry.json();
    }
  }

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      error: 'request_failed',
      message: res.statusText,
      status_code: res.status,
    }));
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
