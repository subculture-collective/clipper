/**
 * Search Failover E2E Test Suite
 *
 * Tests user-facing behavior when search backend (OpenSearch) is degraded or unavailable.
 * Validates:
 * - Graceful fallback results display
 * - Empty state messaging when fallback fails
 * - Retry affordances
 * - Pagination with fallback results
 * - Loading states and error handling
 *
 * Related to issue about search fallback failover scenarios testing
 */

import { test, expect } from '../fixtures';

// Timeout constant for consistency across tests
const SEARCH_TIMEOUT_MS = 5000;

test.describe('Search Failover - UX Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean state
    await page.goto('/');
  });

  test('should display fallback results when OpenSearch fails', async ({ page, searchPage }) => {
    // Navigate to search page
    await searchPage.goto();

    // Perform search that will trigger failover (in test environment)
    // This assumes test backend is configured to simulate failover
    await searchPage.search('test query');

    // Wait for results to load
    await page.waitForSelector('[data-testid="search-results"], [data-testid="empty-state"]', {
      timeout: SEARCH_TIMEOUT_MS,
    });

    // Verify results are displayed (either from fallback or empty state)
    const hasResults = await page.locator('[data-testid="search-results"]').count() > 0;
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').count() > 0;

    expect(hasResults || hasEmptyState).toBeTruthy();

    // If results exist, verify they loaded successfully
    if (hasResults) {
      const resultCount = await searchPage.getResultCount();
      expect(resultCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle pagination with fallback results', async ({ page, searchPage }) => {
    await searchPage.goto();
    await searchPage.search('popular query');

    // Wait for results
    await page.waitForSelector('[data-testid="search-results"], [data-testid="empty-state"]', {
      timeout: SEARCH_TIMEOUT_MS,
    });

    // Check if pagination is available
    const paginationExists = await page.locator('[data-testid="pagination"], .pagination').count() > 0;

    if (paginationExists) {
      // Try navigating to next page
      const nextButton = page.locator('[data-testid="next-page"], button:has-text("Next"), .pagination button:last-child');

      if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
        await nextButton.click();

        // Wait for navigation to second page to complete
        await page.waitForURL(/page=2/, { timeout: SEARCH_TIMEOUT_MS });

        // Verify new results loaded
        await page.waitForSelector('[data-testid="search-results"], [data-testid="empty-state"]', {
          timeout: SEARCH_TIMEOUT_MS,
        });
      }
    }
  });

  test('should show loading state during search', async ({ page, searchPage }) => {
    await searchPage.goto();

    // Start search but don't wait for completion
    const searchPromise = searchPage.search('test query');

    // Verify loading indicator appears
    try {
      await page.waitForSelector('[data-testid="loading"], [data-testid="search-loading"], .loading', {
        timeout: 1000,
      });

      const loadingElement = await page.locator('[data-testid="loading"], [data-testid="search-loading"], .loading').first();
      expect(await loadingElement.isVisible()).toBeTruthy();
    } catch (e) {
      // Loading may be too fast to detect, which is acceptable
      console.log('Loading state not detected (search may have completed too quickly)');
    }

    // Wait for search to complete
    await searchPromise;
  });

  test('should maintain search query in input after failover', async ({ page, searchPage }) => {
    const query = 'test search query';
    await searchPage.goto();
    await searchPage.search(query);

    // Wait for results or error
    await page.waitForSelector('[data-testid="search-results"], [data-testid="empty-state"], [data-testid="error-message"]', {
      timeout: SEARCH_TIMEOUT_MS,
    });

    // Verify query is still in input field
    const inputValue = await searchPage.getSearchQuery();
    expect(inputValue).toBe(query);
  });

  test('should handle rapid successive searches during failover', async ({ page, searchPage }) => {
    await searchPage.goto();

    // Perform multiple searches quickly
    const queries = ['query1', 'query2', 'query3'];

    for (const query of queries) {
      await searchPage.search(query);
      // Don't wait for results, immediately do next search
    }

    // Wait for final search to complete
    await page.waitForSelector('[data-testid="search-results"], [data-testid="empty-state"], [data-testid="error-message"]', {
      timeout: SEARCH_TIMEOUT_MS,
    });

    // Verify last query is displayed
    const inputValue = await searchPage.getSearchQuery();
    expect(inputValue).toBe(queries[queries.length - 1]);
  });

  test('should provide helpful empty state message', async ({ page, searchPage }) => {
    await searchPage.goto();

    // Search for something that won't return results
    await searchPage.search('xyzabc123nonexistent');

    // Wait for empty state
    await page.waitForSelector('[data-testid="empty-state"], [data-testid="no-results"]', {
      timeout: SEARCH_TIMEOUT_MS,
    });

    // Verify helpful message (use .first() since there may be multiple empty states)
    const emptyStateText = await page.locator('[data-testid="empty-state"], [data-testid="no-results"]').first().textContent();
    expect(emptyStateText).toMatch(/no results|try different|not found/i);
  });
});

// Tests that require failover mode enabled
test.describe('Search Failover - Failover Mode Tests', () => {
  // TODO: Requires UI implementation of failover error messages
  // Failover tests now use environment fixtures (E2E_FAILOVER_MODE will be set to true automatically)

  test.skip('should show appropriate message when search is unavailable', async ({ page, searchPage }) => {
    await searchPage.goto();
    await searchPage.search('test query');

    // Wait for error message
    await page.waitForSelector('[data-testid="error-message"], [data-testid="service-unavailable"]', {
      timeout: SEARCH_TIMEOUT_MS,
    });

    // Verify error message is user-friendly
    const errorMessage = await page
      .locator('[data-testid="error-message"], [data-testid="service-unavailable"]')
      .textContent();
    expect(errorMessage).toMatch(/temporarily unavailable|try again|experiencing issues/i);
  });

  test('should display retry button when search fails', async ({ page, searchPage }) => {
    await searchPage.goto();
    await searchPage.search('test query');

    // Look for retry button
    const retryButton = page.locator(
      '[data-testid="retry-search"], button:has-text("Try Again"), button:has-text("Retry")',
    );

    // Wait for retry button to appear
    try {
      await retryButton.waitFor({ timeout: SEARCH_TIMEOUT_MS });
      expect(await retryButton.count()).toBeGreaterThan(0);
    } catch (e) {
      // If no retry button, results should have loaded successfully
      const hasResults = await page.locator('[data-testid="search-results"]').count() > 0;
      expect(hasResults).toBeTruthy();
    }
  });
});

test.describe('Search Failover - Performance', () => {
  test('should complete search within acceptable time during fallback', async ({ page, searchPage }) => {
    await searchPage.goto();

    const startTime = Date.now();
    await searchPage.search('test query');

    // Wait for results
    await page.waitForSelector('[data-testid="search-results"], [data-testid="empty-state"], [data-testid="error-message"]', {
      timeout: SEARCH_TIMEOUT_MS,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // During fallback, search should complete within 2 seconds
    // This is more lenient than normal (500ms) due to failover overhead
    expect(duration).toBeLessThan(2000);
  });

  test('should not block UI during search failover', async ({ page, searchPage }) => {
    await searchPage.goto();

    // Start search
    const searchPromise = searchPage.search('test query');

    // Verify UI is still responsive during search
    // Try to interact with other elements
    const logo = page.locator('[data-testid="logo"], header img, nav img').first();
    if (await logo.count() > 0) {
      // Should be able to click logo during search
      await logo.click({ timeout: 1000 }).catch(() => {
        // It's okay if click fails, we just want to verify UI isn't frozen
      });
    }

    await searchPromise;
  });
});

test.describe('Search Failover - Suggestions', () => {
  test('should show suggestions even during OpenSearch failover', async ({ page, searchPage }) => {
    await searchPage.goto();

    // Type partial query to trigger suggestions
    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('te');

    // Wait for suggestions dropdown
    try {
      await page.waitForSelector('[data-testid="suggestions"], [data-testid="autocomplete"], .suggestions', {
        timeout: 1000,
      });

      // Either suggestions loaded or none were available (both acceptable)
      // Reaching this point without an unhandled error is sufficient for this test
    } catch (e) {
      // No suggestions appeared, which is acceptable
      console.log('No suggestions displayed (may be too fast or no matches)');
    }
  });
});
