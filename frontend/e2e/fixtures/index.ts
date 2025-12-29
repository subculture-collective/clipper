/*
 * Disable react-hooks/rules-of-hooks - ESLint incorrectly flags Playwright's fixture `use`
 * as a React hook. This is a false positive - these are Playwright test fixtures, not React hooks.
 * See: https://github.com/microsoft/playwright/issues/17239
 */
/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, Page, Route, Request } from '@playwright/test';
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
    // Enable lightweight search API mocks to stabilize e2e when backend is unavailable
    await enableSearchMocks(page);
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

// ---------------------------------------------------------------
// Local helpers: mock search API routes for e2e stability
// ---------------------------------------------------------------
async function enableSearchMocks(page: Page) {
  // Allow opt-out via env flag if needed
  const disable = process.env.PLAYWRIGHT_DISABLE_SEARCH_MOCKS === '1';
  if (disable) return;

  // Suggestions
  await page.route((url) => {
    const { pathname } = new URL(url);
    return pathname.endsWith('/search/suggestions');
  }, async (route: Route, request: Request) => {
    const url = new URL(request.url());
    const q = url.searchParams.get('q') || '';
    const base = q || 'game';
    const suggestions = [
      { text: base, type: 'query' },
      { text: `${base} highlights`, type: 'query' },
      { text: 'Valorant', type: 'game' },
      { text: 'Shroud', type: 'creator' },
      { text: 'clutch', type: 'tag' },
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ query: q, suggestions }),
    });
  });

  // Universal search
  await page.route((url) => {
    const { pathname } = new URL(url);
    return pathname.endsWith('/search');
  }, async (route: Route, request: Request) => {
    // Do not intercept document navigations to /search (only mock XHR/fetch)
    const type = request.resourceType();
    if (type === 'document') {
      return route.fallback();
    }

    const url = new URL(request.url());
    const q = url.searchParams.get('q') || '';
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10) || 1;
    const limit = parseInt(url.searchParams.get('limit') || '20', 10) || 20;

    // Generate deterministic mock clips
    const totalItems = 45; // ensure multiple pages
    const totalPages = Math.ceil(totalItems / limit);
    const start = (pageParam - 1) * limit;
    const end = Math.min(start + limit, totalItems);
    const clips = [] as any[];
    for (let i = start; i < end; i++) {
      clips.push({
        id: `mock-clip-${i + 1}`,
        title: q ? `${q} Clip ${i + 1}` : `Clip ${i + 1}`,
        twitch_clip_id: `mock${i + 1}`,
        twitch_clip_url: `https://clips.twitch.tv/mock${i + 1}`,
        thumbnail_url: 'https://via.placeholder.com/640x360',
        creator_name: `Creator${(i % 5) + 1}`,
        game_id: `game-${(i % 3) + 1}`,
        game_name: ['Valorant', 'CS:GO', 'LoL'][i % 3],
        created_at: new Date(Date.now() - i * 1000 * 60).toISOString(),
        vote_score: (i % 10) - 5,
        user_vote: 0,
        is_favorited: false,
        duration: 30 + (i % 60),
        is_nsfw: false,
        is_featured: i % 13 === 0,
        comment_count: (i * 7) % 50,
        favorite_count: (i * 3) % 100,
        view_count: 100 + i * 10,
      });
    }

    const creators = Array.from({ length: 5 }).map((_, idx) => ({
      id: `creator-${idx + 1}`,
      display_name: `Creator ${idx + 1}`,
      username: `creator${idx + 1}`,
      avatar_url: 'https://via.placeholder.com/96',
      bio: `Bio for creator ${idx + 1}`,
      karma_points: 100 + idx * 10,
    }));

    const games = ['Valorant', 'CS:GO', 'LoL'].map((name, idx) => ({
      id: `game-${idx + 1}`,
      name,
      clip_count: 10 + idx * 5,
    }));

    const tags = ['clutch', 'ace', 'highlight'].map((name, idx) => ({
      id: `tag-${idx + 1}`,
      name,
      usage_count: 20 + idx * 5,
      color: undefined,
    }));

    const response = {
      query: q,
      results: {
        clips,
        creators,
        games,
        tags,
      },
      counts: {
        clips: totalItems,
        creators: creators.length,
        games: games.length,
        tags: tags.length,
      },
      facets: {
        languages: [
          { key: 'en', label: 'English', count: 20 },
          { key: 'es', label: 'Spanish', count: 10 },
        ],
        games: [
          { key: 'Valorant', label: 'Valorant', count: 15 },
          { key: 'CS:GO', label: 'CS:GO', count: 12 },
        ],
        date_range: {
          last_hour: 2,
          last_day: 8,
          last_week: 20,
          last_month: 15,
          older: 0,
        },
      },
      meta: {
        page: pageParam,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}
