/**
 * Auth utilities for the Clipper browser extension.
 *
 * Authentication strategy:
 * - The extension reads the `access_token` JWT cookie set by the Clipper backend
 *   from the API domain using chrome.cookies.get().
 * - This token is sent as `Authorization: Bearer <token>` on all API requests.
 * - If no token is present, the user is prompted to log in via the Clipper website.
 */

import type { ExtensionConfig, UserProfile } from '../types';

/** Retrieves the JWT access token from the Clipper API domain cookie. */
export async function getAccessToken(config: ExtensionConfig): Promise<string | null> {
  return new Promise(resolve => {
    const apiOrigin = new URL(config.apiBaseUrl).origin;
    chrome.cookies.get({ url: apiOrigin, name: 'access_token' }, cookie => {
      resolve(cookie?.value ?? null);
    });
  });
}

/** Verifies the token is still valid by calling GET /auth/me. */
export async function verifyAuth(
  token: string,
  config: ExtensionConfig
): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${config.apiBaseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { success: boolean; data?: UserProfile; user?: UserProfile };
    return data.data ?? data.user ?? null;
  } catch {
    return null;
  }
}

/** Opens the Clipper frontend login page in a new tab. */
export function openLoginPage(config: ExtensionConfig): void {
  chrome.tabs.create({ url: `${config.frontendUrl}/login` });
}
