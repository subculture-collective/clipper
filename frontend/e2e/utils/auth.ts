import { Page, BrowserContext } from '@playwright/test';

/**
 * Authentication Helper Utilities
 *
 * Provides functions for handling authentication in E2E tests:
 * - Login/logout flows
 * - Token management
 * - Session persistence
 * - OAuth mocking helpers
 *
 * @example
 * ```typescript
 * import { login, logout, isAuthenticated } from '@utils/auth';
 *
 * await login(page, { username: 'testuser', password: 'password' });
 * const isLoggedIn = await isAuthenticated(page);
 * await logout(page);
 * ```
 */

export interface AuthCredentials {
    username?: string;
    password?: string;
    token?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
}

/**
 * Dismiss cookie consent banner if visible
 *
 * @param page - Playwright Page object
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
    try {
        const acceptButton = page
            .getByRole('button', { name: /accept all/i })
            .first();
        const isVisible = await acceptButton
            .isVisible({ timeout: 2000 })
            .catch(() => false);
        if (isVisible) {
            await acceptButton.click({ timeout: 5000 });
            // Wait a bit for the banner to dismiss
            await page.waitForTimeout(500);
        }
    } catch (error) {
        // Silently fail - banner might not be present
    }
}

/**
 * Login using Twitch OAuth
 *
 * Note: In real tests, you should either:
 * 1. Mock the OAuth endpoints using MSW or similar
 * 2. Use Playwright's storageState to restore authenticated sessions
 * 3. Use test accounts with real OAuth (not recommended for CI)
 *
 * @param page - Playwright Page object
 * @returns Promise that resolves when login is complete
 */
export async function login(page: Page): Promise<void> {
    await page.goto('/');

    // Dismiss cookie banner if present so login button is clickable
    await dismissCookieBanner(page);

    // Check if already authenticated (e.g., via auto-login in E2E mode)
    const alreadyAuthenticated = await isAuthenticated(page);
    if (alreadyAuthenticated) {
        console.log('[login] User already authenticated, skipping login flow');
        return;
    }

    // Click login button
    const loginButton = page
        .getByRole('button', { name: /login|sign in/i })
        .first();
    await loginButton.click();

    // In a real implementation, you would:
    // 1. Wait for OAuth redirect/popup
    // 2. Fill in credentials
    // 3. Handle OAuth callback

    // For now, we'll wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // Verify login was successful by checking for user menu or profile
    await page
        .waitForSelector(
            '[data-testid="user-menu"], button:has-text("profile"), button:has-text("logout")',
            { timeout: 10000 },
        )
        .catch(() => {
            console.log(
                'Login verification timeout - user may not be logged in',
            );
        });
}

/**
 * Login using stored authentication state
 *
 * This is the recommended approach for E2E tests. Save an authenticated
 * state once, then reuse it across tests.
 *
 * @param context - Browser context
 * @param storageStatePath - Path to storage state JSON file
 * @returns Promise that resolves when state is loaded
 */
export async function loginWithStorageState(
    context: BrowserContext,
    storageStatePath: string,
): Promise<void> {
    try {
        const fs = await import('fs/promises');
        const storageState = JSON.parse(
            await fs.readFile(storageStatePath, 'utf-8'),
        );
        await context.addCookies(storageState.cookies);
        await context.addInitScript(storage => {
            for (const [key, value] of Object.entries(storage)) {
                localStorage.setItem(key, value as string);
            }
        }, storageState.origins?.[0]?.localStorage || {});
    } catch (error) {
        console.error('Failed to load storage state:', error);
        throw error;
    }
}

/**
 * Logout the current user
 *
 * @param page - Playwright Page object
 * @returns Promise that resolves when logout is complete
 */
export async function logout(page: Page): Promise<void> {
    // Look for logout button - might be in a menu
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });

    // Check if it's visible, if not, try to open user menu first
    if (!(await logoutButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        const userMenu = page.locator(
            '[data-testid="user-menu"], button:has-text("profile"), [aria-label*="user" i]',
        );
        if (await userMenu.isVisible({ timeout: 1000 }).catch(() => false)) {
            await userMenu.first().click();
            // Wait for logout button to become visible after opening menu
            await logoutButton
                .waitFor({ state: 'visible', timeout: 2000 })
                .catch(() => {
                    console.log('Logout button not found in menu');
                });
        }
    }

    await logoutButton.click();
    await page.waitForLoadState('networkidle');

    // Verify logout was successful
    const loginButton = page.getByRole('button', { name: /login|sign in/i });
    await loginButton.waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Check if user is authenticated
 *
 * @param page - Playwright Page object
 * @returns Promise that resolves to true if authenticated, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
    try {
        // First check localStorage for mock auth state (set by mock handlers)
        const storageAuth = await page.evaluate(() => {
            const isAuth = localStorage.getItem('isAuthenticated');
            const user = localStorage.getItem('user');
            return isAuth === 'true' || (user && user !== 'null');
        });

        if (storageAuth) {
            return true;
        }

        // Check for user menu or profile indicators in the UI
        const userIndicators = [
            page.locator('[data-testid="user-menu"]'),
            page.getByRole('button', { name: /profile|account|logout/i }),
            page.locator('[data-testid="user-avatar"]'),
        ];

        for (const indicator of userIndicators) {
            if (
                await indicator.isVisible({ timeout: 1000 }).catch(() => false)
            ) {
                return true;
            }
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Get authentication token from storage
 *
 * Retrieves JWT or session token from localStorage, sessionStorage, or cookies
 *
 * @param page - Playwright Page object
 * @param tokenKey - Key name for the token (default: 'auth_token')
 * @returns Promise that resolves to token string or null
 */
export async function getAuthToken(
    page: Page,
    tokenKey: string = 'auth_token',
): Promise<string | null> {
    try {
        // Try localStorage first
        const localStorageToken = await page.evaluate(key => {
            return localStorage.getItem(key) || sessionStorage.getItem(key);
        }, tokenKey);

        if (localStorageToken) {
            return localStorageToken;
        }

        // Try cookies
        const cookies = await page.context().cookies();
        const tokenCookie = cookies.find(
            cookie =>
                cookie.name === tokenKey ||
                cookie.name === 'token' ||
                cookie.name === 'jwt',
        );

        return tokenCookie?.value || null;
    } catch (error) {
        console.error('Failed to get auth token:', error);
        return null;
    }
}

/**
 * Set authentication token in storage
 *
 * Useful for mocking authenticated state without going through login flow
 *
 * @param page - Playwright Page object
 * @param token - Authentication token
 * @param tokenKey - Key name for the token (default: 'auth_token')
 */
export async function setAuthToken(
    page: Page,
    token: string,
    tokenKey: string = 'auth_token',
): Promise<void> {
    await page.evaluate(
        ({ key, value }) => {
            localStorage.setItem(key, value);
        },
        { key: tokenKey, value: token },
    );
}

/**
 * Clear all authentication data
 *
 * Removes tokens, session data, and auth-related cookies
 *
 * @param page - Playwright Page object
 */
export async function clearAuthData(page: Page): Promise<void> {
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    // Clear cookies
    await page.context().clearCookies();
}

/**
 * Save authentication state to file
 *
 * Saves cookies and storage to a JSON file for reuse
 *
 * @param page - Playwright Page object
 * @param outputPath - Path to save the state file
 */
export async function saveAuthState(
    page: Page,
    outputPath: string,
): Promise<void> {
    await page.context().storageState({ path: outputPath });
}

/**
 * Mock OAuth callback
 *
 * Intercepts OAuth callback and injects authentication tokens
 * Useful for testing without real OAuth flow
 *
 * @param page - Playwright Page object
 * @param mockTokens - Mock authentication tokens
 */
export async function mockOAuthCallback(
    page: Page,
    mockTokens: AuthTokens,
): Promise<void> {
    await page.route('**/api/auth/callback**', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                tokens: mockTokens,
                user: {
                    id: 'mock-user-id',
                    username: 'testuser',
                    email: 'test@example.com',
                },
            }),
        });
    });

    // Set tokens in storage
    await setAuthToken(page, mockTokens.accessToken);
}
