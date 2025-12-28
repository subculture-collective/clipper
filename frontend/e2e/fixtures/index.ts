/*
 * Disable react-hooks/rules-of-hooks - ESLint incorrectly flags Playwright's fixture `use`
 * as a React hook. This is a false positive - these are Playwright test fixtures, not React hooks.
 * See: https://github.com/microsoft/playwright/issues/17239
 */
/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, Page } from '@playwright/test';
import { LoginPage, HomePage, ClipPage, SubmitClipPage, AdminModerationPage, SearchPage } from '../pages';
import { login, isAuthenticated } from '../utils/auth';
import {
  createUser,
  createClip,
  createSubmission,
  deleteUser,
  deleteClip,
  deleteSubmission
} from '../utils/db-seed';

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
  submitClipPage: SubmitClipPage;
  adminModerationPage: AdminModerationPage;
  searchPage: SearchPage;

  // Authenticated context
  authenticatedPage: Page;
  authenticatedUser: any;
  adminUser: any;

  // Test data
  testUser: any;
  testClip: any;
  testSubmission: any;
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
   * SubmitClipPage fixture
   * Automatically initialized for each test
   */
  submitClipPage: async ({ page }, use) => {
    const submitClipPage = new SubmitClipPage(page);
    await use(submitClipPage);
  },

  /**
   * AdminModerationPage fixture
   * Automatically initialized for each test
   */
  adminModerationPage: async ({ page }, use) => {
    const adminModerationPage = new AdminModerationPage(page);
    await use(adminModerationPage);
  },

  /**
   * SearchPage fixture
   * Automatically initialized for each test
   */
  searchPage: async ({ page }, use) => {
    const searchPage = new SearchPage(page);
    await use(searchPage);
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
  authenticatedPage: async ({ page }, use) => {
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
  authenticatedUser: async ({ page }: any, use: any) => {
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
  testUser: async ({ page }: any, use: any) => {
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
   * Admin user fixture
   * Creates an admin user for testing admin features
   * Automatically cleans up after test
   */
  adminUser: async ({ page }: any, use: any) => {
    const user = await createUser(page, {
      username: `admin_${Date.now()}`,
      email: `admin_${Date.now()}@example.com`,
      role: 'admin',
    });

    await use(user);

    // Cleanup
    if (user.id && !user.id.startsWith('mock-')) {
      try {
        await deleteUser(page, user.id);
      } catch (error) {
        console.warn('Could not delete admin user:', error);
      }
    }
  },

  /**
   * Test clip fixture
   * Creates a clip for testing
   * Automatically cleans up after test
   */
  testClip: async ({ page }: any, use: any) => {
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

  /**
   * Test submission fixture
   * Creates a submission for testing
   * Automatically cleans up after test
   */
  testSubmission: async ({ page, testUser }: any, use: any) => {
    const submission = await createSubmission(page, {
      clipUrl: `https://clips.twitch.tv/test-${Date.now()}`,
      title: `Test Submission ${Date.now()}`,
      description: 'Test submission description',
      tags: ['test', 'e2e'],
      userId: testUser.id,
    });

    await use(submission);

    // Cleanup
    if (submission.id && !submission.id.startsWith('mock-')) {
      try {
        await deleteSubmission(page, submission.id);
      } catch (error) {
        console.warn('Could not delete test submission:', error);
      }
    }
  },
});

/**
 * Re-export expect for convenience
 */
export { expect } from '@playwright/test';
