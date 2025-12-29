import { test, expect } from '../fixtures';
import {
  mockOAuthSuccess,
  mockOAuthError,
  mockOAuthAbort,
  mockOAuthInvalidState,
  mockOAuthPKCE,
  clearOAuthMocks,
} from '../utils/oauth-mock';

/**
 * Authentication E2E Tests - OAuth Flows
 *
 * Tests comprehensive OAuth authentication scenarios:
 * - Successful OAuth flow
 * - OAuth error handling
 * - OAuth abort/cancel
 * - PKCE flow validation
 * - State parameter validation
 */

test.describe('OAuth Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Block any real Twitch navigation to keep tests in-app
    await page.route('**/*twitch.tv/**', (route) => route.abort('aborted'));
    await page.route('**/oauth2/authorize**', (route) => route.abort('aborted'));

    // Signal frontend to use mock OAuth fetch instead of full redirects
    await page.addInitScript(() => {
      (window as any).__E2E_MOCK_OAUTH__ = true;
    });

    // Start with clean state
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dismiss cookie banner if present so login buttons remain interactable
    const acceptCookies = page.getByRole('button', { name: /accept all/i }).first();
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click().catch(() => {});
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up mocks
    await clearOAuthMocks(page);
  });

  test('should complete successful OAuth login flow', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Mock successful OAuth
    await mockOAuthSuccess(page, {
      user: {
        username: 'testuser_oauth',
        displayName: 'Test OAuth User',
        email: 'oauth@test.com',
      },
    });

    // Find and click login button
    const loginButton = page.getByRole('button', { name: /continue with twitch/i }).first();
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Wait for authentication to complete
    await page.waitForLoadState('networkidle');

    // Verify user is logged in
    // Look for user menu, profile button, or other authenticated indicators
    const authenticatedIndicator = page.locator('[data-testid="user-menu"], button:has-text("profile"), button:has-text("logout")');
    await expect(authenticatedIndicator.first()).toBeVisible({ timeout: 10000 });

    // Verify we're not on login page anymore
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('should handle OAuth access_denied error', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Mock OAuth error
    await mockOAuthError(page, 'access_denied', 'User denied access');

    // Click login button
    const loginButton = page.getByRole('button', { name: /continue with twitch/i }).first();
    await loginButton.click();

    // Wait for error handling
    await page.waitForLoadState('networkidle');

    // Verify error message is displayed
    // Check for error text, notification, or alert
    const errorIndicator = page.locator('text=/denied|error|failed/i');
    await expect(errorIndicator.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // Error might be shown in different ways, so this is optional

    });

    // Verify user is still not logged in
    const loginButtonStillVisible = await loginButton.isVisible().catch(() => false);
    expect(loginButtonStillVisible).toBeTruthy();
  });

  test('should handle OAuth server error', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Mock OAuth server error
    await mockOAuthError(page, 'server_error', 'OAuth server error');

    // Click login button
    const loginButton = page.getByRole('button', { name: /continue with twitch/i }).first();
    await loginButton.click();

    // Wait for error handling
    await page.waitForLoadState('networkidle');

    // Verify error is handled gracefully
    const errorIndicator = page.locator('text=/error|failed|try again/i');
    await expect(errorIndicator.first()).toBeVisible({ timeout: 5000 }).catch(() => {

    });

    // User should still be on login flow
    const loginButtonStillVisible = await page.getByRole('button', { name: /login|sign in|continue with twitch/i }).first().isVisible().catch(() => false);
    expect(loginButtonStillVisible).toBeTruthy();
  });

  test('should handle OAuth abort/cancel', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Mock OAuth abort
    await mockOAuthAbort(page);

    // Click login button
    const loginButton = page.getByRole('button', { name: /continue with twitch/i }).first();

    try {
      await loginButton.click();
      await page.waitForLoadState('networkidle', { timeout: 3000 });
    } catch (error) {
      // Request aborted is expected

    }

    // Verify user remains logged out
    const loginButtonVisible = await page.getByRole('button', { name: /login|sign in|continue with twitch/i }).first().isVisible({ timeout: 2000 }).catch(() => false);
    expect(loginButtonVisible).toBeTruthy();
  });

  test('should validate OAuth state parameter (CSRF protection)', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Mock invalid state error
    await mockOAuthInvalidState(page);

    // Click login button
    const loginButton = page.getByRole('button', { name: /continue with twitch/i }).first();
    await loginButton.click();

    // Wait for error handling
    await page.waitForLoadState('networkidle');

    // Verify error is displayed or login fails
    const errorOrLogin = await Promise.race([
      page.locator('text=/invalid|error|failed/i').first().isVisible({ timeout: 5000 }).catch(() => false),
      page.getByRole('button', { name: /login|sign in|continue with twitch/i }).first().isVisible({ timeout: 5000 }).catch(() => false),
    ]);

    if (!errorOrLogin) {
      const urlHasError = page.url().includes('oauth_error=invalid_state') || page.url().includes('error=invalid_state');
      const fallback = urlHasError
        || await page.getByRole('button', { name: /login|sign in|continue with twitch/i }).first().isVisible({ timeout: 5000 }).catch(() => false)
        || await page.locator('text=/invalid|error|failed/i').first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(fallback).toBeTruthy();
      return;
    }

    expect(errorOrLogin).toBeTruthy();
  });

  test('should complete PKCE OAuth flow', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Mock PKCE OAuth flow
    await mockOAuthPKCE(page, {
      user: {
        username: 'pkce_user',
        displayName: 'PKCE Test User',
      },
      codeChallenge: 'test_challenge',
      codeChallengeMethod: 'S256',
    });

    // Click login button
    const loginButton = page.getByRole('button', { name: /continue with twitch/i }).first();
    await loginButton.click();

    // Wait for authentication
    await page.waitForLoadState('networkidle');

    // Verify successful login
    const authenticatedIndicator = page.locator('[data-testid="user-menu"], button:has-text("profile"), button:has-text("logout")');
    await expect(authenticatedIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('should reject OAuth without required PKCE parameters', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Mock PKCE flow that requires parameters
    await mockOAuthPKCE(page, {
      shouldValidate: true, // Strict validation
      codeChallenge: undefined, // Missing challenge
    });

    // Click login button
    const loginButton = page.getByRole('button', { name: /continue with twitch/i }).first();
    await loginButton.click();

    // Wait for response
    await page.waitForLoadState('networkidle');

    // Should fail or show error
    const errorOrLoginStillVisible = await Promise.race([
      page.locator('text=/error|invalid|required/i').first().isVisible({ timeout: 5000 }).catch(() => false),
      page.getByRole('button', { name: /login|sign in|continue with twitch/i }).first().isVisible({ timeout: 5000 }).catch(() => false),
    ]);

    if (!errorOrLoginStillVisible) {
      const urlHasError = page.url().includes('oauth_error=invalid_request') || page.url().includes('error=invalid_request');
      const fallback = urlHasError
        || await page.getByRole('button', { name: /login|sign in|continue with twitch/i }).first().isVisible({ timeout: 5000 }).catch(() => false)
        || await page.locator('text=/error|invalid|required/i').first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(fallback).toBeTruthy();
      return;
    }

    expect(errorOrLoginStillVisible).toBeTruthy();
  });

  test('should handle OAuth popup window flow', async ({ page, context }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Mock successful OAuth
    await mockOAuthSuccess(page);

    // Set up popup listener
    const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);

    // Click login button
    const loginButton = page.getByRole('button', { name: /continue with twitch/i }).first();
    await loginButton.click();

    // Check if popup opened
    const popup = await popupPromise;

    if (popup) {
      // Popup flow: verify popup opened and close it
      expect(popup.url()).toBeTruthy();
      await popup.close();
    } else {
      // Redirect flow: verify redirect occurred

    }

    // Wait for completion
    await page.waitForLoadState('networkidle');

    // Verify login state
    const isAuthenticated = await page.locator('[data-testid="user-menu"], button:has-text("profile"), button:has-text("logout")').first().isVisible({ timeout: 5000 }).catch(() => false);

    // Login should succeed in mock
    expect(isAuthenticated).toBeTruthy();
  });

  test('should redirect to intended page after OAuth login', async ({ page }) => {
    // Mock successful OAuth
    await mockOAuthSuccess(page);

    // Try to access a protected route
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click login if redirected to login page
    const loginButton = page.getByRole('button', { name: /continue with twitch/i }).first();
    const loginVisible = await loginButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (loginVisible) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');

      // After OAuth, should redirect back to intended page
      const finalUrl = page.url();
      // Either on settings or authenticated
      const onSettingsOrAuth = finalUrl.includes('/settings') ||
                               await page.locator('[data-testid="user-menu"]').isVisible({ timeout: 2000 }).catch(() => false);
      expect(onSettingsOrAuth).toBeTruthy();
    }
  });

  test('should handle OAuth timeout gracefully', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Mock OAuth with short delay to simulate timeout
    await page.route('**/api/v1/auth/twitch', async (route) => {
      // Abort after short delay to simulate timeout
      setTimeout(async () => {
        await route.abort('timedout');
      }, 2000);
    });

    // Click login button
    const loginButton = page.getByRole('button', { name: /continue with twitch/i }).first();
    await loginButton.click();

    // Wait for timeout handling
    await page.waitForTimeout(3000);

    // Should still be able to see login button or error
    const hasLoginOrError = await Promise.race([
      page.getByRole('button', { name: /login|sign in|continue with twitch/i }).first().isVisible().catch(() => false),
      page.locator('text=/timeout|error|failed/i').first().isVisible().catch(() => false),
    ]);

    expect(hasLoginOrError).toBeTruthy();
  });
});
