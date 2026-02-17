/**
 * Auth storage utilities
 * These helpers ensure that any auth/session-related values stored in
 * web storage are cleaned up correctly on logout in the current context.
 */

/**
 * Clears auth/session entries in localStorage and sessionStorage
 * without touching unrelated preferences.
 *
 * Uses an explicit allowlist of known auth key names plus the `secure_` prefix
 * (from secure-storage.ts). Update AUTH_KEYS if new auth storage keys are added.
 */
export async function clearAuthStorage(): Promise<void> {
  try {
    // Explicit keys that are known auth/session storage entries.
    // An allowlist avoids accidentally removing unrelated keys
    // (e.g., a "tokenizer" preference) that match broad substrings.
    const AUTH_KEYS = new Set([
      'token',
      'accessToken',
      'refreshToken',
      'access_token',
      'refresh_token',
      'expiresAt',
      'expires_at',
      'auth_state',
      'oauth_state',
      'session_id',
    ]);

    const shouldRemove = (key: string) => {
      if (AUTH_KEYS.has(key)) return true;
      // Also remove secure_* prefixed keys (from secure-storage.ts)
      if (key.startsWith('secure_')) return true;
      return false;
    };

    // Remove matching keys from localStorage
    const localKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) localKeys.push(key);
    }
    for (const key of localKeys) {
      if (shouldRemove(key)) {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore per-key errors
        }
      }
    }

    // Remove matching keys from sessionStorage (ephemeral per-tab/session)
    const sessionKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) sessionKeys.push(key);
    }
    for (const key of sessionKeys) {
      if (shouldRemove(key)) {
        try {
          sessionStorage.removeItem(key);
        } catch {
          // ignore per-key errors
        }
      }
    }
  } catch (err) {
    // Log and continue; logout should not be blocked by storage cleanup
    console.warn('[auth-storage] Failed to clear auth storage:', err);
  }
}
