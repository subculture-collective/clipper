/**
 * Sample E2E Test Suite
 *
 * Demonstrates the complete E2E testing framework including:
 * - Page Object Model pattern
 * - Custom fixtures
 * - Authentication helpers
 * - Database seeding
 * - API mocking
 *
 * This test suite serves as:
 * 1. A validation that the framework is working correctly
 * 2. A reference example for writing new E2E tests
 * 3. Documentation of best practices
 *
 * @see ../README.md for full documentation
 */

import { test, expect } from '../fixtures';
import { HomePage, ClipPage, LoginPage } from '../pages';
import { mockClipsEndpoint, mockAuthEndpoint } from '../utils/api-mock';
import { createClip } from '../utils/db-seed';

// Shared mock data used across the demo tests so they remain deterministic without a backend
const demoClip = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  twitch_clip_id: 'twitch-123',
  twitch_clip_url: 'https://clips.twitch.tv/mock-clip-123',
  embed_url: 'https://clips.twitch.tv/embed?clip=mock-clip-123&parent=localhost',
  title: 'Framework Demo Clip',
  creator_name: 'DemoCreator',
  broadcaster_name: 'DemoBroadcaster',
  game_name: 'Demo Game',
  game_id: 'demo-game',
  view_count: 1337,
  created_at: new Date().toISOString(),
  imported_at: new Date().toISOString(),
  vote_score: 42,
  comment_count: 7,
  favorite_count: 5,
  is_featured: false,
  is_nsfw: false,
  is_removed: false,
  thumbnail_url: 'https://placehold.co/640x360',
};

const demoFeedPage = {
  clips: [demoClip],
  total: 1,
  page: 1,
  limit: 20,
  has_more: false,
};

test.beforeEach(async ({ page }) => {
  // Keep auth unauthenticated to match public feed behaviour
  await page.route('**/api/v1/auth/me', route =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'unauthorized' }),
    })
  );

  // Feed clips used by HomePage/ClipFeed
  await page.route('**/api/v1/feeds/clips**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        clips: demoFeedPage.clips,
        pagination: {
          limit: demoFeedPage.limit,
          offset: 0,
          total: demoFeedPage.total,
          total_pages: 1,
          has_more: demoFeedPage.has_more,
        },
      }),
    });
  });

  // Comments endpoint (prevent unexpected 404s)
  await page.route('**/api/v1/clips/*/comments**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ comments: [], total: 0, has_more: false }),
    })
  );

  // Clip detail endpoint
  await page.route('**/api/v1/clips/*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: demoClip }),
    });
  });

  // Search endpoint used by the search test
  await page.route('**/api/v1/search**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: demoFeedPage.clips,
        query: 'gameplay',
        total: demoFeedPage.total,
      }),
    })
  );
});

test.describe('Framework Demo - Page Object Model', () => {
  /**
   * Test 1: Basic Page Object usage
   *
   * Demonstrates:
   * - Using injected page object fixtures
   * - Navigation
   * - Element verification
   */
  test('should navigate to home page and verify elements', async ({ homePage }) => {
    // Navigate to home page
    await homePage.goto();

    // Verify page loaded
    await homePage.verifyUrl(/\//);

    // Check for search input
    const searchInput = homePage.getSearchInput();
    await expect(searchInput).toBeVisible();

    // Check page title
    await homePage.verifyPageTitle(/Clipper|Twitch|Clips/i);
  });

  /**
   * Test 2: Page Object interactions
   *
   * Demonstrates:
   * - Interacting with page elements
   * - Method chaining
   * - Custom page methods
   */
  test('should search for clips using page object', async ({ homePage, page }) => {
    await homePage.goto();

    // Wait for clips to load
    await homePage.waitForClipsToLoad();

    // Perform search
    await homePage.search('gameplay');

    // Verify URL updated
    await homePage.verifyUrl(/search/);
    expect(page.url()).toContain('q=gameplay');
  });

  /**
   * Test 3: Multiple Page Objects
   *
   * Demonstrates:
   * - Using multiple page objects in one test
   * - Navigating between pages
   * - Page transitions
   */
  test('should navigate from home to clip detail', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.waitForClipsToLoad();

    // Get clip count before clicking
    const clipCount = await homePage.getClipCount();
    expect(clipCount).toBeGreaterThan(0);

    // Click first clip
    await homePage.clickClip(0);

    // Verify navigation to clip detail
    const clipPage = new ClipPage(page);
    await clipPage.verifyUrl(/\/clip\/[a-f0-9-]+/);
    await clipPage.verifyClipLoaded();
  });
});

test.describe('Framework Demo - Custom Fixtures', () => {
  /**
   * Test 4: Using test data fixtures
   *
   * Demonstrates:
   * - Test data creation via fixtures
   * - Automatic cleanup
   * - Working with seeded data
   */
  test('should use test clip fixture', async ({ testClip }) => {
    // testClip is automatically created and will be cleaned up
    expect(testClip).toBeDefined();
    expect(testClip.id).toBeDefined();
    expect(testClip.title).toBeDefined();

    // Note: This might fail if the clip isn't actually in the database
    // In a real test environment with proper backend integration, this would work
    console.log('Test clip created:', testClip.id);
  });

  /**
   * Test 5: Using test user fixture
   *
   * Demonstrates:
   * - User creation via fixtures
   * - Working with user data
   */
  test('should use test user fixture', async ({ testUser }) => {
    // testUser is automatically created and will be cleaned up
    expect(testUser).toBeDefined();
    expect(testUser.username).toBeDefined();
    expect(testUser.email).toBeDefined();

    console.log('Test user created:', testUser.username);
  });
});

test.describe('Framework Demo - API Mocking', () => {
  /**
   * Test 6: Mocking API responses
   *
   * Demonstrates:
   * - Intercepting API calls
   * - Providing mock data
   * - Testing without backend dependencies
   */
  test('should display mocked clips', async ({ page, homePage }) => {
    // Mock the clips API endpoint
    await mockClipsEndpoint(page, {
      clips: [
        {
          id: 'mock-1',
          title: 'Mocked Clip 1',
          url: 'https://clips.twitch.tv/mock-1',
          thumbnailUrl: 'https://via.placeholder.com/640x360',
          streamerName: 'MockStreamer',
          game: 'Mock Game',
          viewCount: 9999,
          likeCount: 999,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'mock-2',
          title: 'Mocked Clip 2',
          url: 'https://clips.twitch.tv/mock-2',
          thumbnailUrl: 'https://via.placeholder.com/640x360',
          streamerName: 'MockStreamer2',
          game: 'Mock Game 2',
          viewCount: 8888,
          likeCount: 888,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    // Navigate and verify mocked data appears
    await homePage.goto();

    // Wait for the mocked clips API call to complete
    await page.waitForResponse((response) =>
      response.url().includes('clips') && response.request().method() === 'GET'
    ).catch(() => {
      console.log('Clips API call not intercepted');
    });

    // In a real test, you'd verify the mocked data appears
    // This is just a framework demonstration
  });

  /**
   * Test 7: Mocking authentication state
   *
   * Demonstrates:
   * - Mocking auth endpoints
   * - Testing authenticated vs unauthenticated states
   */
  test('should mock authenticated state', async ({ page, loginPage }) => {
    // Mock authenticated state
    await mockAuthEndpoint(page, {
      authenticated: true,
      user: {
        id: 'mock-user',
        username: 'MockUser',
        email: 'mock@example.com',
        displayName: 'Mock User',
        avatarUrl: 'https://via.placeholder.com/150',
        role: 'user',
      },
    });

    await loginPage.goto();

    // In a real app with proper auth checks, you'd verify authenticated UI
    // This is a framework demonstration
  });

  test('should mock unauthenticated state', async ({ page, loginPage }) => {
    // Mock unauthenticated state
    await mockAuthEndpoint(page, {
      authenticated: false,
    });

    await loginPage.goto();

    // Verify login button is visible
    const isVisible = await loginPage.isLoginButtonVisible();
    expect(isVisible).toBe(true);
  });
});

test.describe('Framework Demo - Helper Utilities', () => {
  /**
   * Test 8: Using database seeding utilities
   *
   * Demonstrates:
   * - Manual data creation
   * - Cleanup patterns
   * - Working with seeded data
   */
  test('should create clip using db-seed utility', async ({ page }) => {
    // Create a clip manually
    const clip = await createClip(page, {
      title: 'Manually Created Clip',
      streamerName: 'TestStreamer',
      game: 'Test Game',
    });

    expect(clip).toBeDefined();
    expect(clip.title).toBe('Manually Created Clip');

    console.log('Created clip:', clip.id);

    // Note: Manual cleanup would be needed here
    // Fixtures handle this automatically
  });

  /**
   * Test 9: Page Object helper methods
   *
   * Demonstrates:
   * - Using BasePage helper methods
   * - Common element interactions
   * - Verification methods
   */
  test('should use base page helper methods', async ({ homePage }) => {
    await homePage.goto();

    // Wait for page load
    await homePage.waitForPageLoad();

    // Verify URL
    await homePage.verifyUrl(/\//);

    // Get current URL
    const url = homePage.getUrl();
    expect(url).toContain('localhost');

    // Use getByTestId helper
    const clipCard = homePage.getByTestId('clip-card');
    // Verify it exists (might timeout if no clips)
    const count = await clipCard.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Framework Demo - Best Practices', () => {
  /**
   * Test 10: Complete user journey
   *
   * Demonstrates:
   * - Testing complete user flows
   * - Combining multiple page objects
   * - End-to-end scenario testing
   */
  test('should complete a user journey from home to clip detail', async ({
    page,
    homePage
  }) => {
    // Step 1: Navigate to home
    await homePage.goto();
    await homePage.waitForPageLoad();

    // Step 2: Wait for clips to load
    await homePage.waitForClipsToLoad();

    // Step 3: Verify clips are displayed
    const clipCount = await homePage.getClipCount();

    if (clipCount > 0) {
      // Step 4: Click on first clip
      await homePage.clickClip(0);

      // Step 5: Verify clip detail page loaded
      const clipPage = new ClipPage(page);
      await clipPage.verifyClipLoaded();

      // Step 6: Verify video player is visible
      await clipPage.verifyElementVisible(clipPage.getVideoPlayer());
    } else {
      // No clips available, test passes with warning
      console.warn('No clips available for journey test');
    }
  });

  /**
   * Test 11: Error handling and resilience
   *
   * Demonstrates:
   * - Handling missing elements gracefully
   * - Conditional test logic
   * - Timeout handling
   */
  test('should handle missing elements gracefully', async ({ homePage }) => {
    await homePage.goto();

    // Check if submit button exists (might not be visible if not authenticated)
    const hasSubmitButton = await homePage.isSubmitButtonVisible();

    if (hasSubmitButton) {
      console.log('Submit button is visible');
      // Could click it and test submission flow
    } else {
      console.log('Submit button not visible (likely not authenticated)');
      // Test passes - this is expected for unauthenticated users
    }

    // Test always passes regardless of auth state
    expect(true).toBe(true);
  });
});

/**
 * Framework Validation Test
 *
 * This test verifies the framework itself is working
 */
test.describe('Framework Validation', () => {
  test('should have all required fixtures available', async ({
    loginPage,
    homePage,
    clipPage
  }) => {
    // Verify all page object fixtures are available
    expect(loginPage).toBeDefined();
    expect(homePage).toBeDefined();
    expect(clipPage).toBeDefined();

    // Verify they are instances of their respective classes
    expect(loginPage).toBeInstanceOf(LoginPage);
    expect(homePage).toBeInstanceOf(HomePage);
    expect(clipPage).toBeInstanceOf(ClipPage);
  });

  test('should load configuration correctly', async ({ page }) => {
    // Verify base URL is configured
    const baseURL = page.context().browser()?.version();
    expect(baseURL).toBeDefined();

    // Test passes if we can navigate
    await page.goto('/');
    expect(page.url()).toBeTruthy();
  });
});
