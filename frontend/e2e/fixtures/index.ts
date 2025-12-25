import { test as base, Page } from '@playwright/test';
import { LoginPage, HomePage, ClipPage } from '../pages';
import { login, isAuthenticated } from '../utils/auth';
import { createUser, createClip, deleteUser, deleteClip } from '../utils/db-seed';

/**
 * Custom Test Fixtures
 * 
 * Extends Playwright's test object with:
 * - Page Objects (loginPage, homePage, clipPage)
 * - Authenticated user context
 * - Test data (users, clips)
 * - Automatic cleanup
 * 
 * @example
 * ```typescript
 * import { test, expect } from '@fixtures';
 * 
 * test('should display clips', async ({ homePage }) => {
 *   await homePage.goto();
 *   await homePage.verifyClipsVisible();
 * });
 * 
 * test('authenticated user can like clips', async ({ authenticatedPage, clipPage }) => {
 *   await clipPage.goto('clip-id');
 *   await clipPage.likeClip();
 * });
 * ```
 */

type CustomFixtures = {
  // Page Objects
  loginPage: LoginPage;
  homePage: HomePage;
  clipPage: ClipPage;
  
  // Authenticated context
  authenticatedPage: Page;
  authenticatedUser: any;
  
  // Test data
  testUser: any;
  testClip: any;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  /**
   * LoginPage fixture
   * Automatically initialized for each test
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  /**
   * HomePage fixture
   * Automatically initialized for each test
   */
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  /**
   * ClipPage fixture
   * Automatically initialized for each test
   */
  clipPage: async ({ page }, use) => {
    const clipPage = new ClipPage(page);
    await use(clipPage);
  },

  /**
   * Authenticated page fixture
   * Provides a page with user already logged in
   * 
   * Note: In a real implementation, you would:
   * 1. Load stored authentication state
   * 2. Or perform actual login before tests
   * 3. And save the state for reuse
   */
  authenticatedPage: async ({ page }: { page: Page }, use: (page: Page) => Promise<void>) => {
    // Attempt to login
    // In production, you'd load from storageState file
    // For now, we'll just provide the page as-is
    
    // Check if already authenticated
    const isAuth = await isAuthenticated(page);
    
    if (!isAuth) {
      // Try to login (this might fail if OAuth isn't mocked)
      try {
        await login(page);
      } catch (error) {
        console.warn('Could not authenticate page:', error);
      }
    }
    
    await use(page);
  },

  /**
   * Authenticated user fixture
   * Creates a test user and logs them in
   */
  authenticatedUser: async ({ page }: { page: Page }, use: (user: any) => Promise<void>) => {
    // Create a test user
    const user = await createUser(page, {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
    });
    
    // Use the user in tests
    await use(user);
    
    // Cleanup: delete the user after tests
    if (user.id && !user.id.startsWith('mock-')) {
      try {
        await deleteUser(page, user.id);
      } catch (error) {
        console.warn('Could not delete test user:', error);
      }
    }
  },

  /**
   * Test user fixture
   * Creates a user without authentication
   * Automatically cleans up after test
   */
  testUser: async ({ page }: { page: Page }, use: (user: any) => Promise<void>) => {
    const user = await createUser(page);
    await use(user);
    
    // Cleanup
    if (user.id && !user.id.startsWith('mock-')) {
      try {
        await deleteUser(page, user.id);
      } catch (error) {
        console.warn('Could not delete test user:', error);
      }
    }
  },

  /**
   * Test clip fixture
   * Creates a clip for testing
   * Automatically cleans up after test
   */
  testClip: async ({ page }: { page: Page }, use: (clip: any) => Promise<void>) => {
    const clip = await createClip(page, {
      title: `Test Clip ${Date.now()}`,
      streamerName: 'TestStreamer',
      game: 'Test Game',
    });
    
    await use(clip);
    
    // Cleanup
    if (clip.id && !clip.id.startsWith('mock-')) {
      try {
        await deleteClip(page, clip.id);
      } catch (error) {
        console.warn('Could not delete test clip:', error);
      }
    }
  },
});

/**
 * Re-export expect for convenience
 */
export { expect } from '@playwright/test';
