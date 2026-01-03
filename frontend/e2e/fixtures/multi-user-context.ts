/**
 * Multi-User Context Fixture
 * Provides isolated browser contexts for different test users
 * Enables testing multi-user scenarios like permissions, role-based access, etc.
 */

import { Browser, BrowserContext, Page } from '@playwright/test';
import { TestUser, testUsers } from './test-data';

export interface MultiUserContext {
  user: TestUser;
  context: BrowserContext;
  page: Page;
  authToken?: string;
  logout: () => Promise<void>;
}

/**
 * Creates isolated browser contexts for multiple test users
 * Each context maintains separate authentication state
 * 
 * @example
 * const { admin, moderator, regular } = await createMultiUserContexts(
 *   browser,
 *   baseUrl,
 *   ['admin', 'moderator', 'regular']
 * );
 * 
 * // Now you can use admin.page to navigate as admin
 * // Use moderator.page to navigate as moderator
 * // Each maintains separate cookies/storage
 */
export async function createMultiUserContexts(
  browser: Browser,
  baseUrl: string,
  userKeys: (keyof typeof testUsers)[]
): Promise<Record<string, MultiUserContext>> {
  const contexts: Record<string, MultiUserContext> = {};
  const apiUrl = baseUrl.replace(/\/$/, '').replace('5173', '8080').replace('3000', '8080');

  for (const key of userKeys) {
    const user = testUsers[key];
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to app
    await page.goto(baseUrl);

    // Perform login
    let authToken: string | undefined;
    try {
      // Try API login first to get auth token
      const loginResponse = await page.request.post(`${apiUrl}/api/v1/auth/login`, {
        data: {
          email: user.email,
          password: user.password,
        },
      });

      if (loginResponse.ok()) {
        const data = await loginResponse.json();
        authToken = data.token || data.authToken;

        // Set auth token in storage for frontend
        if (authToken) {
          await context.addInitScript(({ token }) => {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify({ 
              id: token.split('.')[0], 
              role: 'user' 
            }));
          }, { token: authToken });
        }
      }
    } catch (error) {
      console.warn(`Failed to authenticate user ${key}:`, error);
    }

    // Navigate to home to establish session
    await page.goto(baseUrl);

    contexts[key] = {
      user,
      context,
      page,
      authToken,
      logout: async () => {
        try {
          await page.goto(`${baseUrl}/logout`);
        } catch (e) {
          // Logout might not exist as a page
        }
        // Clear storage
        await context.clearCookies();
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      },
    };
  }

  return contexts;
}

/**
 * Closes all multi-user contexts and cleans up
 */
export async function closeMultiUserContexts(contexts: Record<string, MultiUserContext>): Promise<void> {
  for (const ctx of Object.values(contexts)) {
    try {
      await ctx.logout();
    } catch (e) {
      // Ignore errors during logout
    }
    await ctx.context.close();
  }
}

/**
 * Makes an authenticated API request on behalf of a user
 */
export async function apiRequestAsUser(
  context: MultiUserContext,
  endpoint: string,
  options: any = {}
): Promise<Response> {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  const apiUrl = baseUrl.replace(/\/$/, '').replace('5173', '8080').replace('3000', '8080');
  const fullUrl = `${apiUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (context.authToken) {
    headers['Authorization'] = `Bearer ${context.authToken}`;
  }

  const response = await context.page.request.fetch(fullUrl, {
    ...options,
    headers,
  });

  return response;
}

/**
 * Test fixture that provides multi-user contexts
 * Use in your tests like: test('something', async ({ multiUserContexts }) => { ... })
 */
export const multiUserContextFixture = async ({ browser }, use) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  
  const contexts = await createMultiUserContexts(browser, baseUrl, [
    'admin',
    'moderator',
    'member',
    'regular',
    'secondary',
  ]);

  await use(contexts);

  await closeMultiUserContexts(contexts);
};
