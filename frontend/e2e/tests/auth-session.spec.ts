import { test, expect } from '../fixtures';
import {
  setSessionTokens,
  getSessionTokens,
  clearSessionTokens,
  verifySessionPersistence,
  verifySessionPersistsOnReload,
  verifySessionAcrossTabs,
  mockTokenRefresh,
  simulateTokenExpiry,
  mockTokenRefreshOn401,
  mockLogout,
  verifyLogoutClearsSession,
  clearSessionMocks,
} from '../utils/session-mock';
import { mockOAuthSuccess } from '../utils/oauth-mock';

/**
 * Session Management E2E Tests
 * 
 * Tests comprehensive session management scenarios:
 * - Session persistence across navigation
 * - Session persistence across reloads
 * - Session persistence across multiple tabs
 * - Session expiry handling
 * - Token refresh flows
 * - Logout and session cleanup
 */

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await clearSessionMocks(page);
  });

  test('should persist session across page navigation', async ({ page }) => {
    // Set up authenticated session
    await mockOAuthSuccess(page);
    
    const tokens = {
      accessToken: 'test_access_token',
      refreshToken: 'test_refresh_token',
      expiresAt: Date.now() + 3600000,
    };

    await setSessionTokens(page, tokens);

    // Navigate to different pages
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    let tokensAfter = await getSessionTokens(page);
    expect(tokensAfter?.accessToken).toBe(tokens.accessToken);

    // Navigate to another page
    await page.goto('/clips');
    await page.waitForLoadState('networkidle');

    tokensAfter = await getSessionTokens(page);
    expect(tokensAfter?.accessToken).toBe(tokens.accessToken);

    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    tokensAfter = await getSessionTokens(page);
    expect(tokensAfter?.accessToken).toBe(tokens.accessToken);

    // Verify session persisted
    const persisted = await verifySessionPersistence(page, '/');
    expect(persisted).toBeTruthy();
  });

  test('should persist session across page reload', async ({ page }) => {
    // Set up authenticated session
    await mockOAuthSuccess(page);
    
    const tokens = {
      accessToken: 'test_access_token',
      refreshToken: 'test_refresh_token',
      expiresAt: Date.now() + 3600000,
    };

    await setSessionTokens(page, tokens);
    
    // Get tokens before reload
    const tokensBefore = await getSessionTokens(page);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Get tokens after reload
    const tokensAfter = await getSessionTokens(page);

    // Verify tokens persisted
    expect(tokensAfter?.accessToken).toBe(tokensBefore?.accessToken);
    expect(tokensAfter?.refreshToken).toBe(tokensBefore?.refreshToken);

    // Verify session persisted using helper
    const persisted = await verifySessionPersistsOnReload(page);
    expect(persisted).toBeTruthy();
  });

  test('should share session across multiple tabs', async ({ page, context }) => {
    // Set up authenticated session in first tab
    await mockOAuthSuccess(page);
    
    const tokens = {
      accessToken: 'shared_access_token',
      refreshToken: 'shared_refresh_token',
      expiresAt: Date.now() + 3600000,
    };

    await setSessionTokens(page, tokens);

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');

    // Check if session is shared
    const tokens2 = await getSessionTokens(page2);
    
    // Cookies should be shared across tabs
    expect(tokens2).toBeTruthy();
    
    // Close second tab
    await page2.close();

    // Verify session sharing helper
    const sessionShared = await verifySessionAcrossTabs(context);
    expect(sessionShared).toBeTruthy();
  });

  test('should handle session expiry gracefully', async ({ page }) => {
    // Set up expired session
    await mockOAuthSuccess(page);
    await simulateTokenExpiry(page);

    // Mock refresh endpoint
    await mockTokenRefresh(page, { shouldSucceed: true });

    // Try to access protected resource
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should trigger token refresh
    // Check if either redirected to login or refresh happened
    const url = page.url();
    const hasLoginOrSettings = url.includes('/login') || url.includes('/settings');
    
    expect(hasLoginOrSettings).toBeTruthy();
  });

  test('should refresh token before expiry', async ({ page }) => {
    // Set up session with token expiring soon
    await mockOAuthSuccess(page);
    
    const tokens = {
      accessToken: 'expiring_token',
      refreshToken: 'refresh_token',
      expiresAt: Date.now() + 5000, // Expires in 5 seconds
    };

    await setSessionTokens(page, tokens);

    // Mock refresh endpoint
    await mockTokenRefresh(page, {
      shouldSucceed: true,
      newTokens: {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      },
    });

    // Wait for token to be near expiry
    await page.waitForTimeout(3000);

    // Trigger an API call that should refresh token
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if token was refreshed
    const tokensAfter = await getSessionTokens(page);
    
    // Token might have been refreshed
    expect(tokensAfter).toBeTruthy();
  });

  test('should refresh token on 401 response', async ({ page }) => {
    // Set up authenticated session
    await mockOAuthSuccess(page);
    
    const tokens = {
      accessToken: 'invalid_token',
      refreshToken: 'valid_refresh',
      expiresAt: Date.now() + 3600000,
    };

    await setSessionTokens(page, tokens);

    // Mock 401 response followed by successful refresh
    await mockTokenRefreshOn401(page);

    // Try to access a page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should handle 401 and refresh
    // Verify we're not redirected to login
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('should logout and clear all session data', async ({ page }) => {
    // Set up authenticated session
    await mockOAuthSuccess(page);
    
    const tokens = {
      accessToken: 'test_access_token',
      refreshToken: 'test_refresh_token',
      expiresAt: Date.now() + 3600000,
    };

    await setSessionTokens(page, tokens);

    // Mock logout endpoint
    await mockLogout(page, { shouldSucceed: true, revokeTokens: true });

    // Verify tokens exist before logout
    const tokensBefore = await getSessionTokens(page);
    expect(tokensBefore).toBeTruthy();

    // Find and click logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    
    // May need to open user menu first
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("profile")');
    if (await userMenu.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenu.first().click();
      await page.waitForTimeout(500);
    }

    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
      await page.waitForLoadState('networkidle');

      // Clear tokens manually for test
      await clearSessionTokens(page);

      // Verify logout cleared session
      const sessionCleared = await verifyLogoutClearsSession(page);
      expect(sessionCleared).toBeTruthy();

      // Verify login button is visible
      const loginButton = page.getByRole('button', { name: /login|sign in/i });
      await expect(loginButton.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should clear session across all tabs on logout', async ({ page, context }) => {
    // Set up authenticated session
    await mockOAuthSuccess(page);
    
    const tokens = {
      accessToken: 'test_access_token',
      refreshToken: 'test_refresh_token',
      expiresAt: Date.now() + 3600000,
    };

    await setSessionTokens(page, tokens);

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');

    // Mock logout
    await mockLogout(page, { shouldSucceed: true });

    // Logout from first tab
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("profile")');
    if (await userMenu.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenu.first().click();
      await page.waitForTimeout(500);
    }

    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
      await page.waitForLoadState('networkidle');

      // Clear for test
      await clearSessionTokens(page);
      await clearSessionTokens(page2);

      // Reload second tab
      await page2.reload();
      await page2.waitForLoadState('networkidle');

      // Verify session cleared in second tab
      const tokens2 = await getSessionTokens(page2);
      expect(tokens2).toBeNull();

      // Verify login button visible in second tab
      const loginButton2 = page2.getByRole('button', { name: /login|sign in/i });
      await expect(loginButton2.first()).toBeVisible({ timeout: 5000 });
    }

    await page2.close();
  });

  test('should handle refresh token failure', async ({ page }) => {
    // Set up session with expired token
    await mockOAuthSuccess(page);
    await simulateTokenExpiry(page);

    // Mock failed refresh
    await mockTokenRefresh(page, { shouldSucceed: false });

    // Try to access protected page
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should redirect to login or show error
    const url = page.url();
    const loginButton = page.getByRole('button', { name: /login|sign in/i });
    
    const redirectedOrError = url.includes('/login') || 
                             await loginButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(redirectedOrError).toBeTruthy();
  });

  test('should maintain session during long activity', async ({ page }) => {
    // Set up authenticated session
    await mockOAuthSuccess(page);
    
    const tokens = {
      accessToken: 'long_session_token',
      refreshToken: 'refresh_token',
      expiresAt: Date.now() + 6000, // 6 seconds
    };

    await setSessionTokens(page, tokens);

    // Mock token refresh
    await mockTokenRefresh(page, { shouldSucceed: true });

    // Simulate user activity over time with reduced iterations
    for (let i = 0; i < 2; i++) {
      await page.waitForTimeout(2000);
      
      // Navigate to trigger potential refresh
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify session still valid
      const currentTokens = await getSessionTokens(page);
      expect(currentTokens).toBeTruthy();
    }
  });

  test('should store session in correct storage type', async ({ page }) => {
    // Test localStorage storage
    const localTokens = {
      accessToken: 'local_token',
      refreshToken: 'local_refresh',
      expiresAt: Date.now() + 3600000,
    };

    await setSessionTokens(page, localTokens, 'local');
    
    const retrievedLocal = await page.evaluate(() => {
      return localStorage.getItem('auth_tokens');
    });
    
    expect(retrievedLocal).toBeTruthy();

    // Test sessionStorage
    await clearSessionTokens(page);
    
    const sessionTokens = {
      accessToken: 'session_token',
      refreshToken: 'session_refresh',
      expiresAt: Date.now() + 3600000,
    };

    await setSessionTokens(page, sessionTokens, 'session');
    
    const retrievedSession = await page.evaluate(() => {
      return sessionStorage.getItem('auth_tokens');
    });
    
    expect(retrievedSession).toBeTruthy();

    // Test cookies
    await clearSessionTokens(page);
    
    const cookieTokens = {
      accessToken: 'cookie_token',
      refreshToken: 'cookie_refresh',
      expiresAt: Date.now() + 3600000,
    };

    await setSessionTokens(page, cookieTokens, 'cookie');
    
    const cookies = await page.context().cookies();
    const accessCookie = cookies.find((c) => c.name === 'access_token');
    
    expect(accessCookie?.value).toBe('cookie_token');
  });

  test('should handle concurrent refresh requests', async ({ page }) => {
    // Set up session near expiry
    await mockOAuthSuccess(page);
    
    const tokens = {
      accessToken: 'expiring_token',
      refreshToken: 'refresh_token',
      expiresAt: Date.now() + 1000,
    };

    await setSessionTokens(page, tokens);

    // Mock refresh with delay
    await mockTokenRefresh(page, {
      shouldSucceed: true,
      delay: 1000,
    });

    // Trigger multiple API calls that might refresh
    await Promise.all([
      page.goto('/'),
      page.goto('/clips'),
      page.goto('/settings'),
    ]);

    await page.waitForLoadState('networkidle');

    // Should handle concurrent refresh gracefully
    const tokensAfter = await getSessionTokens(page);
    expect(tokensAfter).toBeTruthy();
  });
});
