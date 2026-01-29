/**
 * Auth storage utilities
 * These helpers ensure that any auth/session-related values stored in
 * web storage are cleaned up correctly on logout in the current context.
 */

/**
 * Clears auth/session entries in localStorage and sessionStorage
 * without touching unrelated preferences.
 *
 * Heuristics:
 * - Removes keys containing substrings commonly used for auth/session
 *   such as: 'token', 'auth', 'session', 'expires'
 * - Also removes known test keys that may be used by E2E suites
 *   (e.g., 'accessToken', 'refreshToken', 'expiresAt') when present.
 */
export async function clearAuthStorage(): Promise<void> {
  try {
    const shouldRemove = (key: string) => {
      const lower = key.toLowerCase();
      return (
        lower.includes('token') ||
        lower.includes('auth') ||
        lower.includes('session') ||
        lower.includes('expires') ||
        key === 'accessToken' ||
        key === 'refreshToken' ||
        key === 'expiresAt'
      );
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
