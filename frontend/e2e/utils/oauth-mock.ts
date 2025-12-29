import { Page, Route, BrowserContext } from '@playwright/test';

/**
 * OAuth Mock Utilities
 *
 * Provides comprehensive mocking for Twitch OAuth flows:
 * - Success, error, and abort scenarios
 * - PKCE flow support
 * - State validation
 * - Token generation
 *
 * @example
 * ```typescript
 * import { mockOAuthSuccess, mockOAuthError } from '@utils/oauth-mock';
 *
 * // Mock successful OAuth
 * await mockOAuthSuccess(page, { username: 'testuser' });
 *
 * // Mock OAuth error
 * await mockOAuthError(page, 'access_denied');
 * ```
 */

export interface MockOAuthUser {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role?: 'user' | 'moderator' | 'admin';
  mfaEnabled?: boolean;
}

export interface MockOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType?: string;
}

export interface OAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * Generate mock OAuth tokens
 */
export function generateMockTokens(): MockOAuthTokens {
  return {
    accessToken: `mock_access_token_${Date.now()}`,
    refreshToken: `mock_refresh_token_${Date.now()}`,
    expiresIn: 3600, // 1 hour
    tokenType: 'Bearer',
  };
}

/**
 * Generate mock OAuth user
 */
export function generateMockUser(overrides: Partial<MockOAuthUser> = {}): MockOAuthUser {
  return {
    id: `user_${Date.now()}`,
    username: `testuser_${Date.now()}`,
    displayName: 'Test User',
    email: `test_${Date.now()}@example.com`,
    avatarUrl: 'https://via.placeholder.com/150',
    role: 'user',
    mfaEnabled: false,
    ...overrides,
  };
}

/**
 * Mock successful Twitch OAuth flow
 *
 * Intercepts OAuth endpoints and simulates successful authentication
 *
 * @param page - Playwright Page object
 * @param options - OAuth user and token overrides
 */
export async function mockOAuthSuccess(
  page: Page,
  options: {
    user?: Partial<MockOAuthUser>;
    tokens?: Partial<MockOAuthTokens>;
    requireMfa?: boolean;
  } = {}
): Promise<{ user: MockOAuthUser; tokens: MockOAuthTokens }> {
  const mockUser = generateMockUser(options.user);
  const mockTokens = { ...generateMockTokens(), ...options.tokens };

  // Track the state from the OAuth request so we can use it in the callback
  let capturedState: string | null = null;

  // Mock /auth/me endpoint to return authenticated user
  await page.route('**/api/v1/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    });
  });

  // Mock /auth/twitch/callback POST endpoint
  await page.route('**/api/v1/auth/twitch/callback', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const response: any = {
        success: true,
        user: mockUser,
        tokens: mockTokens,
      };

      if (options.requireMfa) {
        response.requireMfa = true;
        response.mfaRequired = true;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    } else {
      await route.continue();
    }
  });

  // Mock /auth/twitch endpoint - intercept OAuth initiation
  // When user clicks login, initiateOAuth() sets window.location.href which we intercept here
  // The PKCE parameters (code_verifier, state) are already stored by initiateOAuth()
  // We just need to simulate the OAuth flow by navigating to the callback page
  await page.route('**/api/v1/auth/twitch**', async (route: Route) => {
    const url = new URL(route.request().url());
    const state = url.searchParams.get('state');
    const code = `mock_code_${Date.now()}`;

    // Capture state for the callback
    capturedState = state;

    // Abort the original request (don't actually navigate to the auth endpoint)
    await route.abort('aborted');

    // Drive navigation in the page context for reliability
    const callbackUrl = `/auth/callback?code=${code}&state=${state}`;
    await page.evaluate((url) => {
      try {
        window.location.assign(url);
      } catch {}
    }, callbackUrl);
  });

  // Mock /auth/refresh endpoint to return tokens
  await page.route('**/api/v1/auth/refresh', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        tokens: mockTokens,
      }),
    });
  });

  return { user: mockUser, tokens: mockTokens };
}

/**
 * Mock OAuth error flow
 *
 * Simulates OAuth errors like access_denied, server_error, etc.
 *
 * @param page - Playwright Page object
 * @param error - OAuth error code
 * @param errorDescription - Optional error description
 */
export async function mockOAuthError(
  page: Page,
  error: 'access_denied' | 'invalid_request' | 'server_error' | 'temporarily_unavailable',
  errorDescription?: string
): Promise<void> {
  await page.route('**/api/v1/auth/twitch', async (route: Route) => {
    const state = `state_${Date.now()}`;
    // Prevent real navigation to backend and drive app to callback explicitly
    await route.abort('aborted');
    const url = `/auth/callback?error=${error}&error_description=${encodeURIComponent(errorDescription || error)}&state=${state}`;
    await page.evaluate((u) => { try { window.location.assign(u); } catch {} }, url);
  });

  await page.route('**/api/v1/auth/twitch/callback**', async (route: Route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: error,
        errorDescription: errorDescription || error,
      }),
    });
  });
}

/**
 * Mock OAuth abort flow
 *
 * Simulates user canceling/closing OAuth popup
 *
 * @param page - Playwright Page object
 */
export async function mockOAuthAbort(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/twitch', async (route: Route) => {
    // Simulate popup being closed without completing OAuth
    await route.abort('aborted');
  });
}

/**
 * Mock OAuth state validation error
 *
 * Simulates CSRF protection failure
 *
 * @param page - Playwright Page object
 */
export async function mockOAuthInvalidState(page: Page): Promise<void> {
  // Intercept initiation to force navigation to callback with invalid state
  await page.route('**/api/v1/auth/twitch', async (route: Route) => {
    await route.abort('aborted');
    const badState = `bad_state_${Date.now()}`;
    page.goto(`/auth/callback?error=invalid_state&error_description=${encodeURIComponent('State parameter validation failed')}&state=${badState}`, { waitUntil: 'networkidle' }).catch(() => {});
  });

  await page.route('**/api/v1/auth/twitch/callback**', async (route: Route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'invalid_state',
        errorDescription: 'State parameter validation failed',
      }),
    });
  });
}

/**
 * Simulate OAuth popup window
 *
 * Opens and manages OAuth popup for testing
 *
 * @param context - Browser context
 * @param shouldComplete - Whether to complete OAuth or abort
 */
export async function simulateOAuthPopup(
  context: BrowserContext,
  shouldComplete: boolean = true
): Promise<Page | null> {
  try {
    const popup = await context.waitForEvent('page', { timeout: 5000 });

    if (!shouldComplete) {
      // Simulate user closing popup
      await popup.close();
      return null;
    }

    // Simulate OAuth approval
    await popup.waitForLoadState('domcontentloaded');

    // In this mock, we skip the "Authorize" button click and just close the popup
    // The route mocking in mockOAuthSuccess handles the callback automatically
    await popup.close();

    return popup;
  } catch (error) {
    // No popup appeared (redirect flow)
    return null;
  }
}

/**
 * Mock PKCE flow specifically
 *
 * @param page - Playwright Page object
 * @param options - PKCE flow options
 */
export async function mockOAuthPKCE(
  page: Page,
  options: {
    user?: Partial<MockOAuthUser>;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    shouldValidate?: boolean;
  } = {}
): Promise<{ user: MockOAuthUser; tokens: MockOAuthTokens }> {
  const mockUser = generateMockUser(options.user);
  const mockTokens = generateMockTokens();

  // Ensure authenticated user can be fetched after callback
  await page.route('**/api/v1/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    });
  });

  // Mock OAuth initiation with PKCE
  await page.route('**/api/v1/auth/twitch**', async (route: Route) => {
    const url = new URL(route.request().url());
    const codeChallenge = url.searchParams.get('code_challenge');
    const codeChallengeMethod = url.searchParams.get('code_challenge_method');
    const state = url.searchParams.get('state') || `state_${Date.now()}`;

    if (codeChallenge && codeChallengeMethod === 'S256') {
      // Valid PKCE parameters
      const code = `mock_code_${Date.now()}`;
      // Abort and drive navigation to callback explicitly
      await route.abort('aborted');
      const url = `/auth/callback?code=${code}&state=${state}`;
      await page.evaluate((u) => { try { window.location.assign(u); } catch {} }, url);
    } else if (options.shouldValidate === false) {
      // Allow without PKCE for testing
      const code = `mock_code_${Date.now()}`;
      await route.abort('aborted');
      const url = `/auth/callback?code=${code}&state=${state}`;
      await page.evaluate((u) => { try { window.location.assign(u); } catch {} }, url);
    } else {
      // Missing PKCE parameters
      // Drive to callback with error so UI displays failure state
      await route.abort('aborted');
      const url = `/auth/callback?error=invalid_request&error_description=${encodeURIComponent('PKCE parameters required')}&state=${state}`;
      await page.evaluate((u) => { try { window.location.assign(u); } catch {} }, url);
    }
  });

  // Mock callback with code verifier validation
  await page.route('**/api/v1/auth/twitch/callback', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const postData = route.request().postDataJSON();

      if (options.shouldValidate !== false && !postData?.code_verifier) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'invalid_request',
            errorDescription: 'code_verifier required for PKCE flow',
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: mockUser,
          tokens: mockTokens,
        }),
      });
    } else {
      await route.continue();
    }
  });

  return { user: mockUser, tokens: mockTokens };
}

/**
 * Clear all OAuth mocks
 *
 * @param page - Playwright Page object
 */
export async function clearOAuthMocks(page: Page): Promise<void> {
  await page.unroute('**/api/v1/auth/twitch');
  await page.unroute('**/api/v1/auth/twitch/callback**');
  await page.unroute('**/api/v1/auth/me');
}
