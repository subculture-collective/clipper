import { Page, BrowserContext, Route } from '@playwright/test';

/**
 * Session and Token Management Utilities
 *
 * Provides utilities for testing session persistence, token refresh,
 * and token lifecycle management:
 * - Session cookies and storage
 * - Token expiry simulation
 * - Token refresh flows
 * - Multi-tab session management
 *
 * @example
 * ```typescript
 * import { setSessionTokens, verifySessionPersistence } from '@utils/session-mock';
 *
 * // Set session tokens
 * await setSessionTokens(page, { accessToken: 'token123' });
 *
 * // Verify session persists
 * await verifySessionPersistence(page);
 * ```
 */

export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
}

export interface SessionData {
  tokens: SessionTokens;
  user?: any;
  lastActivity?: number;
}

/**
 * Set session tokens in storage
 *
 * Stores tokens in localStorage, sessionStorage, and cookies
 *
 * @param page - Playwright Page object
 * @param tokens - Session tokens to set
 * @param storage - Storage type ('local', 'session', 'cookie', 'all')
 */
export async function setSessionTokens(
  page: Page,
  tokens: SessionTokens,
  storage: 'local' | 'session' | 'cookie' | 'all' = 'all'
): Promise<void> {
  const tokenData = JSON.stringify(tokens);

  if (storage === 'local' || storage === 'all') {
    await page.evaluate(
      (data) => {
        localStorage.setItem('auth_tokens', data);
        localStorage.setItem('auth_token', JSON.parse(data).accessToken || '');
      },
      tokenData
    );
  }

  if (storage === 'session' || storage === 'all') {
    await page.evaluate(
      (data) => {
        sessionStorage.setItem('auth_tokens', data);
        sessionStorage.setItem('auth_token', JSON.parse(data).accessToken || '');
      },
      tokenData
    );
  }

  if (storage === 'cookie' || storage === 'all') {
    await page.context().addCookies([
      {
        name: 'access_token',
        value: tokens.accessToken,
        domain: new URL(page.url()).hostname || 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    if (tokens.refreshToken) {
      await page.context().addCookies([
        {
          name: 'refresh_token',
          value: tokens.refreshToken,
          domain: new URL(page.url()).hostname || 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ]);
    }
  }
}

/**
 * Get session tokens from storage
 *
 * @param page - Playwright Page object
 * @returns Session tokens or null if not found
 */
export async function getSessionTokens(page: Page): Promise<SessionTokens | null> {
  try {
    // Try localStorage first
    const localTokens = await page.evaluate(() => {
      const data = localStorage.getItem('auth_tokens');
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    });

    if (localTokens) return localTokens;

    // Try sessionStorage
    const sessionTokens = await page.evaluate(() => {
      const data = sessionStorage.getItem('auth_tokens');
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    });

    if (sessionTokens) return sessionTokens;

    // Try cookies
    const cookies = await page.context().cookies();
    const accessToken = cookies.find((c) => c.name === 'access_token');
    const refreshToken = cookies.find((c) => c.name === 'refresh_token');

    if (accessToken) {
      return {
        accessToken: accessToken.value,
        refreshToken: refreshToken?.value,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get session tokens:', error);
    return null;
  }
}

/**
 * Clear session tokens from all storage
 *
 * @param page - Playwright Page object
 */
export async function clearSessionTokens(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth_tokens');
    sessionStorage.removeItem('auth_tokens');
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.context().clearCookies();
}

/**
 * Verify session persists across page navigation
 *
 * @param page - Playwright Page object
 * @param navigateTo - URL to navigate to
 * @returns true if session persisted
 */
export async function verifySessionPersistence(
  page: Page,
  navigateTo: string = '/'
): Promise<boolean> {
  const tokensBefore = await getSessionTokens(page);

  await page.goto(navigateTo);
  await page.waitForLoadState('networkidle');

  const tokensAfter = await getSessionTokens(page);

  return (
    tokensBefore?.accessToken === tokensAfter?.accessToken &&
    tokensBefore?.refreshToken === tokensAfter?.refreshToken
  );
}

/**
 * Verify session persists across page reload
 *
 * @param page - Playwright Page object
 * @returns true if session persisted
 */
export async function verifySessionPersistsOnReload(page: Page): Promise<boolean> {
  const tokensBefore = await getSessionTokens(page);

  await page.reload();
  await page.waitForLoadState('networkidle');

  const tokensAfter = await getSessionTokens(page);

  return (
    tokensBefore?.accessToken === tokensAfter?.accessToken &&
    tokensBefore?.refreshToken === tokensAfter?.refreshToken
  );
}

/**
 * Verify session persists across multiple tabs
 *
 * @param context - Browser context
 * @param baseUrl - Base URL for pages
 * @returns true if session shared across tabs
 */
export async function verifySessionAcrossTabs(
  context: BrowserContext,
  baseUrl: string = 'http://localhost:5173'
): Promise<boolean> {
  // Create first page and set session
  const page1 = await context.newPage();
  await page1.goto(baseUrl);

  const tokens: SessionTokens = {
    accessToken: `token_${Date.now()}`,
    refreshToken: `refresh_${Date.now()}`,
    expiresAt: Date.now() + 3600000,
  };

  await setSessionTokens(page1, tokens);

  // Create second page
  const page2 = await context.newPage();
  await page2.goto(baseUrl);

  // Check if session is shared
  const tokens2 = await getSessionTokens(page2);

  const sessionShared = tokens.accessToken === tokens2?.accessToken;

  // Cleanup
  await page1.close();
  await page2.close();

  return sessionShared;
}

/**
 * Mock token refresh endpoint
 *
 * @param page - Playwright Page object
 * @param options - Refresh options
 */
export async function mockTokenRefresh(
  page: Page,
  options: {
    shouldSucceed?: boolean;
    newTokens?: Partial<SessionTokens>;
    delay?: number;
  } = {}
): Promise<void> {
  const { shouldSucceed = true, newTokens = {}, delay = 0 } = options;

  await page.route('**/api/v1/auth/refresh', async (route: Route) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (shouldSucceed) {
      const tokens: SessionTokens = {
        accessToken: newTokens.accessToken || `new_access_${Date.now()}`,
        refreshToken: newTokens.refreshToken || `new_refresh_${Date.now()}`,
        expiresAt: newTokens.expiresAt || Date.now() + 3600000,
        tokenType: newTokens.tokenType || 'Bearer',
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          tokens,
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid refresh token',
        }),
      });
    }
  });
}

/**
 * Simulate token expiry
 *
 * Sets token with past expiry time
 *
 * @param page - Playwright Page object
 */
export async function simulateTokenExpiry(page: Page): Promise<void> {
  const expiredTokens: SessionTokens = {
    accessToken: `expired_token_${Date.now()}`,
    refreshToken: `refresh_${Date.now()}`,
    expiresAt: Date.now() - 60000, // Expired 1 minute ago
  };

  await setSessionTokens(page, expiredTokens);
}

/**
 * Mock 401 unauthorized response
 *
 * Simulates expired token API response
 *
 * @param page - Playwright Page object
 * @param endpoint - API endpoint to mock
 */
export async function mock401Response(
  page: Page,
  endpoint: string | RegExp = '**/api/v1/**'
): Promise<void> {
  await page.route(endpoint, async (route: Route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: 'Token expired or invalid',
      }),
    });
  });
}

/**
 * Verify token refresh on 401
 *
 * Sets up mock to return 401, then success after refresh
 *
 * @param page - Playwright Page object
 */
export async function mockTokenRefreshOn401(page: Page): Promise<void> {
  let requestCount = 0;

  await page.route('**/api/v1/auth/me', async (route: Route) => {
    requestCount++;

    if (requestCount === 1) {
      // First request: return 401
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Unauthorized',
        }),
      });
    } else {
      // After refresh: return success
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
        }),
      });
    }
  });

  // Mock refresh endpoint
  await mockTokenRefresh(page, { shouldSucceed: true });
}

/**
 * Mock logout endpoint
 *
 * @param page - Playwright Page object
 * @param options - Logout options
 */
export async function mockLogout(
  page: Page,
  options: {
    shouldSucceed?: boolean;
    revokeTokens?: boolean;
  } = {}
): Promise<void> {
  const { shouldSucceed = true, revokeTokens = true } = options;

  await page.route('**/api/v1/auth/logout', async (route: Route) => {
    if (shouldSucceed) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          tokensRevoked: revokeTokens,
        }),
      });
    } else {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Logout failed',
        }),
      });
    }
  });
}

/**
 * Verify logout clears all session data
 *
 * @param page - Playwright Page object
 * @returns true if all session data cleared
 */
export async function verifyLogoutClearsSession(page: Page): Promise<boolean> {
  const tokens = await getSessionTokens(page);

  if (tokens) {
    return false;
  }

  // Check localStorage
  const hasLocalStorage = await page.evaluate(() => {
    return localStorage.getItem('auth_tokens') !== null;
  });

  if (hasLocalStorage) {
    return false;
  }

  // Check sessionStorage
  const hasSessionStorage = await page.evaluate(() => {
    return sessionStorage.getItem('auth_tokens') !== null;
  });

  if (hasSessionStorage) {
    return false;
  }

  return true;
}

/**
 * Simulate concurrent sessions
 *
 * Creates multiple browser contexts with sessions
 *
 * @param contexts - Array of browser contexts
 * @param baseUrl - Base URL
 * @returns Array of pages with sessions
 */
export async function simulateConcurrentSessions(
  contexts: BrowserContext[],
  baseUrl: string = 'http://localhost:5173'
): Promise<Page[]> {
  const pages: Page[] = [];

  for (let i = 0; i < contexts.length; i++) {
    const page = await contexts[i].newPage();
    await page.goto(baseUrl);

    const tokens: SessionTokens = {
      accessToken: `token_session_${i}_${Date.now()}`,
      refreshToken: `refresh_session_${i}_${Date.now()}`,
      expiresAt: Date.now() + 3600000,
    };

    await setSessionTokens(page, tokens);
    pages.push(page);
  }

  return pages;
}

/**
 * Clear all session mocks
 *
 * @param page - Playwright Page object
 */
export async function clearSessionMocks(page: Page): Promise<void> {
  await page.unroute('**/api/v1/auth/refresh');
  await page.unroute('**/api/v1/auth/logout');
  await page.unroute('**/api/v1/auth/me');
}
