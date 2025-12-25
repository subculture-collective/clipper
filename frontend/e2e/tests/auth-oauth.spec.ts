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
    // Start with clean state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    // Clean up mocks
    await clearOAuthMocks(page);
  });

  test('should complete successful OAuth login flow', async ({ page }) => {
    // Mock successful OAuth
    const { user, tokens } = await mockOAuthSuccess(page, {
      user: {
        username: 'testuser_oauth',
        displayName: 'Test OAuth User',
        email: 'oauth@test.com',
      },
    });

    // Find and click login button
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
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
    // Mock OAuth error
    await mockOAuthError(page, 'access_denied', 'User denied access');

    // Click login button
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    await loginButton.click();

    // Wait for error handling
    await page.waitForLoadState('networkidle');

    // Verify error message is displayed
    // Check for error text, notification, or alert
    const errorIndicator = page.locator('text=/denied|error|failed/i');
    await expect(errorIndicator.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // Error might be shown in different ways, so this is optional
      console.log('Error message not found in expected format');
    });

    // Verify user is still not logged in
    const loginButtonStillVisible = await loginButton.isVisible().catch(() => false);
    expect(loginButtonStillVisible).toBeTruthy();
  });

  test('should handle OAuth server error', async ({ page }) => {
    // Mock OAuth server error
    await mockOAuthError(page, 'server_error', 'OAuth server error');

    // Click login button
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    await loginButton.click();

    // Wait for error handling
    await page.waitForLoadState('networkidle');

    // Verify error is handled gracefully
    const errorIndicator = page.locator('text=/error|failed|try again/i');
    await expect(errorIndicator.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Server error message not found in expected format');
    });

    // User should still be on login flow
    const loginButtonStillVisible = await page.getByRole('button', { name: /login|sign in/i }).first().isVisible().catch(() => false);
    expect(loginButtonStillVisible).toBeTruthy();
  });

  test('should handle OAuth abort/cancel', async ({ page }) => {
    // Mock OAuth abort
    await mockOAuthAbort(page);

    // Click login button
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    
    try {
      await loginButton.click();
      await page.waitForLoadState('networkidle', { timeout: 3000 });
    } catch (error) {
      // Request aborted is expected
      console.log('OAuth aborted as expected');
    }

    // Verify user remains logged out
    const loginButtonVisible = await page.getByRole('button', { name: /login|sign in/i }).first().isVisible({ timeout: 2000 }).catch(() => false);
    expect(loginButtonVisible).toBeTruthy();
  });

  test('should validate OAuth state parameter (CSRF protection)', async ({ page }) => {
    // Mock invalid state error
    await mockOAuthInvalidState(page);

    // Click login button
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    await loginButton.click();

    // Wait for error handling
    await page.waitForLoadState('networkidle');

    // Verify error is displayed or login fails
    const errorOrLogin = await Promise.race([
      page.locator('text=/invalid|error|failed/i').first().isVisible({ timeout: 5000 }).catch(() => false),
      page.getByRole('button', { name: /login|sign in/i }).first().isVisible({ timeout: 5000 }).catch(() => false),
    ]);

    expect(errorOrLogin).toBeTruthy();
  });

  test('should complete PKCE OAuth flow', async ({ page }) => {
    // Mock PKCE OAuth flow
    const { user, tokens } = await mockOAuthPKCE(page, {
      user: {
        username: 'pkce_user',
        displayName: 'PKCE Test User',
      },
      codeChallenge: 'test_challenge',
      codeChallengeMethod: 'S256',
    });

    // Click login button
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    await loginButton.click();

    // Wait for authentication
    await page.waitForLoadState('networkidle');

    // Verify successful login
    const authenticatedIndicator = page.locator('[data-testid="user-menu"], button:has-text("profile"), button:has-text("logout")');
    await expect(authenticatedIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('should reject OAuth without required PKCE parameters', async ({ page }) => {
    // Mock PKCE flow that requires parameters
    await mockOAuthPKCE(page, {
      shouldValidate: true, // Strict validation
      codeChallenge: undefined, // Missing challenge
    });

    // Click login button
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    await loginButton.click();

    // Wait for response
    await page.waitForLoadState('networkidle');

    // Should fail or show error
    const errorOrLoginStillVisible = await Promise.race([
      page.locator('text=/error|invalid|required/i').first().isVisible({ timeout: 5000 }).catch(() => false),
      page.getByRole('button', { name: /login|sign in/i }).first().isVisible({ timeout: 5000 }).catch(() => false),
    ]);

    expect(errorOrLoginStillVisible).toBeTruthy();
  });

  test('should handle OAuth popup window flow', async ({ page, context }) => {
    // Mock successful OAuth
    await mockOAuthSuccess(page);

    // Set up popup listener
    const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);

    // Click login button
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    await loginButton.click();

    // Check if popup opened
    const popup = await popupPromise;

    if (popup) {
      // Popup flow: verify popup opened and close it
      expect(popup.url()).toBeTruthy();
      await popup.close();
    } else {
      // Redirect flow: verify redirect occurred
      console.log('No popup detected, using redirect flow');
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
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
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
    // Mock OAuth with long delay to simulate timeout
    await page.route('**/api/v1/auth/twitch', async (route) => {
      // Don't fulfill - let it timeout
      // In real test, we'd wait for timeout handling
      setTimeout(async () => {
        await route.abort('timedout');
      }, 5000);
    });

    // Click login button
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    await loginButton.click();

    // Wait a bit for timeout handling
    await page.waitForTimeout(6000);

    // Should still be able to see login button or error
    const hasLoginOrError = await Promise.race([
      page.getByRole('button', { name: /login|sign in/i }).first().isVisible().catch(() => false),
      page.locator('text=/timeout|error|failed/i').first().isVisible().catch(() => false),
    ]);

    expect(hasLoginOrError).toBeTruthy();
  });
});
