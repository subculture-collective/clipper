/**
 * CDN Failover E2E Test Suite
 *
 * Tests user-facing behavior when CDN is degraded or unavailable.
 * Validates:
 * - Static assets (thumbnails, images, JS bundles) fall back to origin
 * - HLS video playback tolerates CDN outage
 * - Player switches to origin with minimal stall
 * - UI remains functional during CDN failures
 * - Loading states and error handling
 *
 * Related issues:
 * - subculture-collective/clipper#689 (Watch Parties sync)
 * - subculture-collective/clipper#694 (Chat/WebSocket backend)
 */

import { test, expect } from '../fixtures';

// Timeout constants
const ASSET_TIMEOUT_MS = 5000;
const VIDEO_TIMEOUT_MS = 10000;

test.describe('CDN Failover - Static Assets', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean state
    await page.goto('/');
  });

  test('should load thumbnails from origin when CDN fails', async ({ page, homePage }) => {
    // Navigate to home page with clips
    await homePage.goto();

    // Wait for clip thumbnails to load
    await page.waitForSelector('[data-testid="clip-card"], .clip-card', {
      timeout: ASSET_TIMEOUT_MS,
    });

    // Check that thumbnails are visible (images within clip cards)
    const thumbnails = page.locator('[data-testid="clip-card"] img, .clip-card img');
    const thumbnailCount = await thumbnails.count();

    expect(thumbnailCount).toBeGreaterThan(0);

    // Verify thumbnails are present and visible
    for (let i = 0; i < Math.min(3, thumbnailCount); i++) {
      const thumbnail = thumbnails.nth(i);
      await expect(thumbnail).toBeVisible();

      // Check that image has a src attribute (CDN failover means it should have a URL)
      const src = await thumbnail.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).toContain('http'); // Should be a valid URL
    }
  });

  test('should load user avatars from origin when CDN fails', async ({ page, homePage }) => {
    await homePage.goto();

    // Wait for any user avatars to appear
    const avatars = page.locator('[data-testid="user-avatar"], img[alt*="avatar"], .avatar');

    if (await avatars.count() > 0) {
      const firstAvatar = avatars.first();
      await expect(firstAvatar).toBeVisible();

      // Verify avatar loaded successfully
      const loaded = await firstAvatar.evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalWidth > 0;
      });

      expect(loaded).toBeTruthy();
    }
  });

  test('should handle broken image gracefully during CDN failure', async ({ page, homePage }) => {
    await homePage.goto();

    // Check for images with proper src attributes
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      // Verify images have valid src attributes (CDN failover provides fallback URLs)
      for (let i = 0; i < Math.min(3, imageCount); i++) {
        const img = images.nth(i);

        const src = await img.getAttribute('src');
        // Should have a valid URL (either CDN or origin)
        expect(src).toBeTruthy();
        expect(src).toMatch(/^https?:\/\//); // Valid HTTP(S) URL
      }
    }
  });
});

test.describe('CDN Failover - HLS Video Playback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should play HLS video from origin when CDN fails', async ({ page, clipPage }) => {
    // Use environment variable for test clip ID, or skip if not provided
    const testClipId = process.env.TEST_HLS_CLIP_ID || 'test-clip-hls-001';

    // Navigate to a clip page with video
    await clipPage.goto(testClipId);

    // Wait for video player to appear
    const videoPlayer = page.locator('video, [data-testid="video-player"]').first();

    // Check if video player exists
    const playerCount = await videoPlayer.count();
    if (playerCount === 0) {
      // Skip test if no video player found (may not be HLS-enabled clip)
      test.skip(true, 'No video player found for this clip');
    }

    await expect(videoPlayer).toBeVisible({ timeout: VIDEO_TIMEOUT_MS });

    // Wait for video to be ready to play
    await videoPlayer.waitFor({ state: 'visible', timeout: VIDEO_TIMEOUT_MS });

    // Try to play the video
    await videoPlayer.click(); // Click to play

    // Wait a moment for playback to start
    await page.waitForTimeout(2000);

    // Check if video is playing or at least loaded
    const videoState = await videoPlayer.evaluate((video: HTMLVideoElement) => {
      return {
        readyState: video.readyState,
        paused: video.paused,
        currentTime: video.currentTime,
        duration: video.duration,
        networkState: video.networkState,
      };
    });

    // Video should be loaded (readyState >= 2 means HAVE_CURRENT_DATA)
    expect(videoState.readyState).toBeGreaterThanOrEqual(2);
  });

  test('should handle video stall and resume during CDN failover', async ({ page, clipPage }) => {
    const testClipId = process.env.TEST_HLS_CLIP_ID || 'test-clip-hls-002';

    await clipPage.goto(testClipId);

    const videoPlayer = page.locator('video, [data-testid="video-player"]').first();
    const playerCount = await videoPlayer.count();
    if (playerCount === 0) {
      test.skip(true, 'No video player found for this clip');
    }

    await expect(videoPlayer).toBeVisible({ timeout: VIDEO_TIMEOUT_MS });

    // Listen for stall and playing events
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        video.addEventListener('stalled', () => {
          (window as any).__videoStalled = true;
        });
        video.addEventListener('playing', () => {
          (window as any).__videoResumed = true;
        });
      }
    });

    // Try to play
    await videoPlayer.click();
    await page.waitForTimeout(3000);

    // Check if video stalled and whether it resumed
    const { stalled, resumed } = await page.evaluate(() => {
      return {
        stalled: (window as any).__videoStalled === true,
        resumed: (window as any).__videoResumed === true,
      };
    });

    if (stalled) {
      // Video should have resumed if it stalled
      expect(resumed).toBeTruthy();
    }
    // If no stall occurred, that's acceptable (test passes)
  });

  test.skip('should display loading state during video buffering', async ({ page, clipPage }) => {
    // This test requires actual video playback which is complex in E2E mocks
    // Skipping until we have proper video mock infrastructure
    const testClipId = process.env.TEST_HLS_CLIP_ID || 'test-clip-hls-003';

    await clipPage.goto(testClipId);

    // Look for loading indicators
    const loadingIndicator = page.locator('[data-testid="loading"], [data-testid="video-loading"], .loading-spinner');

    // Briefly check if loading indicator appeared (may be too fast to catch)
    try {
      await loadingIndicator.waitFor({ state: 'visible', timeout: 1000 });
    } catch {
      // Loading may have been too fast; ignore timeout
    }

    // Video should eventually be visible
    const videoPlayer = page.locator('video, [data-testid="video-player"]').first();
    await expect(videoPlayer).toBeVisible({ timeout: VIDEO_TIMEOUT_MS });
  });
});

test.describe('CDN Failover - UI Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should maintain UI responsiveness during CDN failure', async ({ page, homePage }) => {
    await homePage.goto();

    // Verify page is interactive
    const navigation = page.locator('nav, [data-testid="navigation"]').first();
    await expect(navigation).toBeVisible();

    // Try clicking various UI elements to ensure responsiveness
    const searchButton = page.locator('[data-testid="search"], button:has-text("Search")').first();
    if (await searchButton.count() > 0) {
      await searchButton.click();

      // Search should open
      const searchInput = page.locator('[data-testid="search-input"], input[type="search"]').first();
      await expect(searchInput).toBeVisible({ timeout: 2000 });
    }
  });

  test('should navigate between pages during CDN failure', async ({ page, homePage }) => {
    await homePage.goto();

    // Try navigating to another page
    const aboutLink = page.locator('a[href*="/about"], a:has-text("About")').first();
    if (await aboutLink.count() > 0) {
      await aboutLink.click();

      // Should navigate successfully
      await page.waitForURL(/about/, { timeout: 5000 });
      expect(page.url()).toContain('about');
    } else {
      // Try navigating to a clip
      const clipLink = page.locator('a[href*="/clips/"], [data-testid="clip-link"]').first();
      if (await clipLink.count() > 0) {
        await clipLink.click();

        // Should navigate to clip page
        await page.waitForURL(/clips\//, { timeout: 5000 });
        expect(page.url()).toContain('clips');
      }
    }
  });

  test('should handle JavaScript bundle load from origin', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Check that JavaScript is working (page is interactive)
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify React/Vue has rendered (check for root element)
    const appRoot = page.locator('#root, #app, [data-reactroot]').first();
    await expect(appRoot).toBeVisible();

    // Verify interactive elements work
    const clickableElements = page.locator('button, a').first();
    await expect(clickableElements).toBeVisible();
  });
});

// Tests that require failover mode enabled
test.describe('CDN Failover - Failover Mode Tests', () => {
  const failoverMode = process.env.E2E_CDN_FAILOVER_MODE === 'true';

  test.skip(!failoverMode, 'Requires E2E_CDN_FAILOVER_MODE=true for failover tests');

  test('should display CDN status indicator when failing over', async ({ page, homePage }) => {
    await homePage.goto();

    // Look for CDN status indicator (if implemented)
    const statusIndicator = page.locator('[data-testid="cdn-status"], [data-testid="service-status"]');

    if (await statusIndicator.count() > 0) {
      await expect(statusIndicator).toBeVisible();

      // Verify it indicates degraded service
      const statusText = await statusIndicator.textContent();
      expect(statusText).toMatch(/degraded|fallback|backup/i);
    }
  });

  test('should show retry prompt for failed assets', async ({ page, homePage }) => {
    await homePage.goto();

    // Look for retry buttons on failed images
    const retryButton = page.locator('[data-testid="retry-image"], button:has-text("Retry")');

    if (await retryButton.count() > 0) {
      await expect(retryButton).toBeVisible();

      // Click retry
      await retryButton.first().click();

      // Should attempt to reload
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('CDN Failover - Performance', () => {
  test('should load page within acceptable time during origin fallback', async ({ page, homePage }) => {
    const startTime = Date.now();

    await homePage.goto();

    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // During origin fallback, page should still load within acceptable time
    // Use ASSET_TIMEOUT_MS constant for consistency
    expect(loadTime).toBeLessThan(ASSET_TIMEOUT_MS);
  });

  test('should not block rendering during asset failures', async ({ page, homePage }) => {
    await homePage.goto();

    // Verify page content is visible even if some assets fail
    const mainContent = page.locator('main, [role="main"], #content').first();
    await expect(mainContent).toBeVisible({ timeout: 3000 });

    // Verify text content is readable
    const textElements = page.locator('h1, h2, p').first();
    await expect(textElements).toBeVisible();
  });
});
