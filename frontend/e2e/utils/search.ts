import { Page } from '@playwright/test';

/**
 * Search & Discovery Testing Utilities
 *
 * Provides functions for testing search features:
 * - Search execution and result verification
 * - Filter combinations and persistence
 * - Autocomplete/suggestions
 * - Search history management
 * - Performance measurements
 * - Test data seeding for search
 *
 * @example
 * ```typescript
 * import { performSearch, measureSearchLatency, seedSearchData } from '@utils/search';
 *
 * await seedSearchData(page, 10); // Create 10 test clips
 * const latency = await measureSearchLatency(page, 'gaming');
 * const results = await performSearch(page, 'fps highlights');
 * ```
 */

// Configuration constants
const DEFAULT_SEARCH_TIMEOUT = 10000;
const SUGGESTION_TIMEOUT = 5000;
const PERFORMANCE_SAMPLE_SIZE = 5;

export interface SearchOptions {
  query: string;
  type?: 'all' | 'clips' | 'creators' | 'games' | 'tags';
  sort?: 'relevance' | 'recent' | 'popular';
  filters?: SearchFilters;
  timeout?: number;
}

export interface SearchFilters {
  language?: string;
  gameId?: string;
  game?: string;
  dateFrom?: string;
  dateTo?: string;
  dateRange?: 'last_hour' | 'last_day' | 'last_week' | 'last_month';
  minVotes?: number;
  tags?: string[];
  creatorId?: string;
}

export interface SearchResult {
  title: string;
  type: 'clip' | 'creator' | 'game' | 'tag';
  url?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  searchLatency: number; // Time from query to results display
  suggestionLatency: number; // Time from typing to suggestions
  apiResponseTime: number; // Time for API to respond
  domLoadTime: number; // Time to render results
  totalTime: number; // End-to-end time
}

export interface SuggestionMetrics {
  latency: number;
  count: number;
  quality: 'relevant' | 'partial' | 'irrelevant';
}

/**
 * Get API base URL from environment or use default
 */
function getApiBaseUrl(): string {
  return process.env.VITE_API_URL || process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8080/api/v1';
}

// ============================================================================
// Search Operations
// ============================================================================

/**
 * Perform a search via UI
 * @param page - Playwright Page object
 * @param options - Search options
 * @returns Search results
 */
export async function performSearch(page: Page, options: SearchOptions): Promise<SearchResult[]> {
  const { query, type = 'all', sort = 'relevance', filters, timeout = DEFAULT_SEARCH_TIMEOUT } = options;

  // Build search URL with parameters
  const params = new URLSearchParams({ q: query, type, sort });

  if (filters) {
    if (filters.language) params.append('language', filters.language);
    const gameFilter = filters.gameId ?? filters.game;
    if (gameFilter) params.append('game_id', gameFilter);
    if (filters.dateFrom) params.append('date_from', filters.dateFrom);
    if (filters.dateTo) params.append('date_to', filters.dateTo);
    if (filters.minVotes !== undefined) params.append('min_votes', filters.minVotes.toString());
    if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
    if (filters.creatorId) params.append('creator_id', filters.creatorId);
  }

  // Navigate to search page
  await page.goto(`/search?${params.toString()}`, { waitUntil: 'networkidle', timeout });

  // Extract results from page
  const results = await extractSearchResults(page);
  return results;
}

/**
 * Perform a search via API
 * @param page - Playwright Page object
 * @param options - Search options
 * @returns Search response data
 */
export async function performSearchAPI(page: Page, options: SearchOptions): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const { query, type, sort, filters } = options;

  const params: Record<string, any> = { q: query };
  if (type) params.type = type;
  if (sort) params.sort = sort;

  if (filters) {
    Object.assign(params, {
      language: filters.language,
      game_id: filters.gameId || filters.game,
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      min_votes: filters.minVotes,
      tags: filters.tags,
      creator_id: filters.creatorId,
    });
  }

  try {
    const response = await page.request.get(`${apiUrl}/search`, { params });

    if (!response.ok()) {
      throw new Error(`Search API returned ${response.status()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Search API request failed:', error);
    throw error;
  }
}

/**
 * Extract search results from the page DOM
 * @param page - Playwright Page object
 * @returns Array of search results
 */
async function extractSearchResults(page: Page): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // Wait for results to load
  await page.waitForSelector('[data-testid="clip-card"], .search-result-card, .empty-state', {
    timeout: DEFAULT_SEARCH_TIMEOUT,
  }).catch(() => {
    // No results or timeout - return empty array
    return null;
  });

  // Check for empty state
  const emptyState = await page.locator('.empty-state, [data-testid="empty-state"]').isVisible();
  if (emptyState) {
    return [];
  }

  // Extract result cards
  const resultCards = page.locator('[data-testid="clip-card"], .clip-card, .search-result-card');
  const count = await resultCards.count();

  for (let i = 0; i < count; i++) {
    const card = resultCards.nth(i);

    // Extract title
    const titleElement = card.locator('h2, h3, .title, [data-testid="clip-title"]').first();
    const title = await titleElement.textContent() || '';

    // Extract type (clip by default for now)
    const type = 'clip' as const;

    // Extract URL if available
    const linkElement = card.locator('a').first();
    const url = await linkElement.getAttribute('href') || undefined;

    results.push({
      title: title.trim(),
      type,
      url,
    });
  }

  return results;
}

/**
 * Verify search results contain expected items
 * @param results - Search results
 * @param expectedTerms - Terms that should appear in results
 * @returns True if all terms found
 */
export function verifySearchRelevance(results: SearchResult[], expectedTerms: string[]): boolean {
  const resultText = results.map(r => r.title.toLowerCase()).join(' ');

  return expectedTerms.every(term =>
    resultText.includes(term.toLowerCase())
  );
}

// ============================================================================
// Filters
// ============================================================================

/**
 * Apply multiple filters and verify they persist
 * @param page - Playwright Page object
 * @param filters - Filters to apply
 * @returns True if filters persist in URL
 */
export async function applyAndVerifyFilters(
  page: Page,
  filters: SearchFilters
): Promise<boolean> {
  // Apply filters via URL parameters
  const currentUrl = new URL(page.url());
  const params = currentUrl.searchParams;

  if (filters.language) params.set('language', filters.language);
  const gameFilter = filters.gameId ?? filters.game;
  if (gameFilter) params.set('game_id', gameFilter);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.minVotes !== undefined) params.set('min_votes', filters.minVotes.toString());
  if (filters.tags) params.set('tags', filters.tags.join(','));

  // Navigate with filters
  await page.goto(`${currentUrl.pathname}?${params.toString()}`, {
    waitUntil: 'networkidle',
  });

  // Verify filters persist
  const newUrl = new URL(page.url());
  const newParams = newUrl.searchParams;

  let allMatch = true;

  if (filters.language && newParams.get('language') !== filters.language) allMatch = false;
  if (gameFilter && newParams.get('game_id') !== gameFilter) allMatch = false;
  if (filters.minVotes !== undefined && newParams.get('min_votes') !== filters.minVotes.toString()) allMatch = false;

  return allMatch;
}

/**
 * Test filter combinations
 * @param page - Playwright Page object
 * @param query - Base search query
 * @param filterCombinations - Array of filter combinations to test
 * @returns Results for each combination
 */
export async function testFilterCombinations(
  page: Page,
  query: string,
  filterCombinations: SearchFilters[]
): Promise<Array<{ filters: SearchFilters; resultCount: number }>> {
  const results: Array<{ filters: SearchFilters; resultCount: number }> = [];

  for (const filters of filterCombinations) {
    const searchResults = await performSearch(page, { query, filters });
    results.push({
      filters,
      resultCount: searchResults.length,
    });
  }

  return results;
}

/**
 * Clear all filters from URL
 * @param page - Playwright Page object
 */
export async function clearAllFilters(page: Page): Promise<void> {
  const url = new URL(page.url());
  const query = url.searchParams.get('q') || '';

  // Navigate to clean search URL with only query
  await page.goto(`/search?q=${encodeURIComponent(query)}`, {
    waitUntil: 'networkidle',
  });
}

// ============================================================================
// Suggestions / Autocomplete
// ============================================================================

/**
 * Get autocomplete suggestions for a query
 * @param page - Playwright Page object
 * @param query - Partial search query
 * @returns Array of suggestions
 */
export async function getSuggestions(page: Page, query: string): Promise<string[]> {
  const apiUrl = getApiBaseUrl();

  try {
    const response = await page.request.get(`${apiUrl}/search/suggestions`, {
      params: { q: query },
    });

    if (!response.ok()) {
      return [];
    }

    const data = await response.json();
    return data.suggestions?.map((s: any) => s.text) || [];
  } catch (error) {
    console.error('Failed to get suggestions:', error);
    return [];
  }
}

/**
 * Measure suggestion latency
 * @param page - Playwright Page object
 * @param query - Query to type
 * @param iterations - Number of times to measure (for averaging)
 * @returns Average latency in milliseconds
 */
export async function measureSuggestionLatency(
  page: Page,
  query: string,
  iterations: number = PERFORMANCE_SAMPLE_SIZE
): Promise<number> {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    await page.goto('/search', { waitUntil: 'networkidle' });

    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[name="q"], input[placeholder*="search" i]').first();
    await searchInput.clear();
    await searchInput.click();

    const startTime = Date.now();

    // Type query character by character using pressSequentially
    await searchInput.pressSequentially(query, { delay: 50 });

    // Wait for suggestions to appear
    try {
      await page.locator('[role="listbox"], [data-testid="suggestions"]').first().waitFor({
        state: 'visible',
        timeout: SUGGESTION_TIMEOUT,
      });

      const endTime = Date.now();
      latencies.push(endTime - startTime);
    } catch {
      // Suggestions didn't appear - record as timeout
      latencies.push(SUGGESTION_TIMEOUT);
    }

    // Small delay between iterations
    await page.waitForTimeout(500);
  }

  // Calculate average
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  return Math.round(avg);
}

/**
 * Verify suggestion quality
 * @param suggestions - Array of suggestions
 * @param query - Original query
 * @returns Quality assessment
 */
export function verifySuggestionQuality(
  suggestions: string[],
  query: string
): 'relevant' | 'partial' | 'irrelevant' {
  if (suggestions.length === 0) return 'irrelevant';

  const queryLower = query.toLowerCase();
  const relevantCount = suggestions.filter(s =>
    s.toLowerCase().includes(queryLower) || queryLower.includes(s.toLowerCase())
  ).length;

  const relevanceRatio = relevantCount / suggestions.length;

  if (relevanceRatio >= 0.7) return 'relevant';
  if (relevanceRatio >= 0.3) return 'partial';
  return 'irrelevant';
}

// ============================================================================
// Search History
// ============================================================================

/**
 * Get search history from localStorage
 * @param page - Playwright Page object
 * @returns Array of search history items
 */
export async function getSearchHistory(page: Page): Promise<string[]> {
  // Ensure we are on an app origin before accessing storage
  if (page.url() === 'about:blank') {
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
  }
  return await page.evaluate(() => {
    const history = localStorage.getItem('searchHistory');
    if (!history) return [];

    try {
      const parsed = JSON.parse(history);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
}

/**
 * Add item to search history
 * @param page - Playwright Page object
 * @param query - Search query to add
 */
export async function addToSearchHistory(page: Page, query: string): Promise<void> {
  if (page.url() === 'about:blank') {
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
  }
  await page.evaluate((q) => {
    const history = localStorage.getItem('searchHistory');
    let items: string[] = [];

    if (history) {
      try {
        items = JSON.parse(history);
      } catch {
        items = [];
      }
    }

    // Add new query at the beginning, remove duplicates
    items = [q, ...items.filter(item => item !== q)];

    // Limit to 10 most recent
    items = items.slice(0, 10);

    localStorage.setItem('searchHistory', JSON.stringify(items));
  }, query);
}

/**
 * Clear search history
 * @param page - Playwright Page object
 */
export async function clearSearchHistory(page: Page): Promise<void> {
  if (page.url() === 'about:blank') {
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
  }
  await page.evaluate(() => {
    localStorage.removeItem('searchHistory');

    // Also try to clear from IndexedDB if used
    if ('indexedDB' in window) {
      try {
        const request = indexedDB.open('searchHistoryDB', 1);
        request.onsuccess = () => {
          const db = request.result;
          if (db.objectStoreNames.contains('history')) {
            const transaction = db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            store.clear();
          }
        };
      } catch (error) {
        console.warn('Failed to clear IndexedDB:', error);
      }
    }
  });
}

/**
 * Verify search history persistence
 * @param page - Playwright Page object
 * @param expectedItems - Items that should be in history
 * @returns True if all items found
 */
export async function verifySearchHistoryPersistence(
  page: Page,
  expectedItems: string[]
): Promise<boolean> {
  const history = await getSearchHistory(page);
  return expectedItems.every(item => history.includes(item));
}

// ============================================================================
// Performance Testing
// ============================================================================

/**
 * Measure search latency (end-to-end)
 * @param page - Playwright Page object
 * @param query - Search query
 * @param iterations - Number of times to measure
 * @returns Average latency in milliseconds
 */
export async function measureSearchLatency(
  page: Page,
  query: string,
  iterations: number = PERFORMANCE_SAMPLE_SIZE
): Promise<number> {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    await page.goto('/search', { waitUntil: 'networkidle' });

    const searchInput = page.locator('[data-testid="search-input"], input[type="search"], input[name="q"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: DEFAULT_SEARCH_TIMEOUT });
    await searchInput.fill(query);

    // Start timing
    const startTime = Date.now();

    // Submit search
    await page.keyboard.press('Enter');

    // Wait for UI-ready signals instead of network
    await page.waitForSelector('[data-testid="results-count"], [data-testid="clip-card"], .search-result-card, [data-testid="empty-state"]', {
      timeout: DEFAULT_SEARCH_TIMEOUT,
    });

    const endTime = Date.now();
    latencies.push(endTime - startTime);

    // Small delay between iterations
    await page.waitForTimeout(500);
  }

  // Calculate average
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  return Math.round(avg);
}

/**
 * Calculate percentile from array of values
 * @param values - Array of numbers
 * @param percentile - Percentile to calculate (e.g., 95 for p95)
 * @returns Percentile value
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Measure comprehensive performance metrics
 * @param page - Playwright Page object
 * @param query - Search query
 * @param sampleSize - Number of measurements
 * @returns Performance statistics
 */
export async function measurePerformanceMetrics(
  page: Page,
  query: string,
  sampleSize: number = 10
): Promise<{
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  samples: number[];
}> {
  const samples: number[] = [];

  for (let i = 0; i < sampleSize; i++) {
    const latency = await measureSearchLatency(page, query, 1);
    samples.push(latency);
  }

  samples.sort((a, b) => a - b);

  return {
    p50: calculatePercentile(samples, 50),
    p95: calculatePercentile(samples, 95),
    p99: calculatePercentile(samples, 99),
    avg: Math.round(samples.reduce((a, b) => a + b, 0) / samples.length),
    min: samples[0],
    max: samples[samples.length - 1],
    samples,
  };
}

// ============================================================================
// Test Data Seeding
// ============================================================================

/**
 * Seed database with test clips for search
 * @param page - Playwright Page object
 * @param count - Number of clips to create
 * @param options - Clip creation options
 * @returns Array of created clip IDs
 */
export async function seedSearchData(
  page: Page,
  count: number = 10,
  options?: {
    games?: string[];
    tags?: string[];
    languages?: string[];
  }
): Promise<string[]> {
  const apiUrl = getApiBaseUrl();
  const clipIds: string[] = [];

  const games = options?.games || ['Valorant', 'CS:GO', 'League of Legends', 'Dota 2', 'Overwatch'];
  const tags = options?.tags || ['highlight', 'funny', 'epic', 'fail', 'clutch', 'ace'];
  const languages = options?.languages || ['en', 'es', 'fr', 'de', 'pt'];

  for (let i = 0; i < count; i++) {
    const game = games[i % games.length];
    const language = languages[i % languages.length];
    const randomTags = tags.slice(0, Math.floor(Math.random() * 3) + 1);

    const clipData = {
      title: `Test Clip ${i + 1} - ${game} ${randomTags.join(' ')}`,
      url: `https://clips.twitch.tv/test-${Date.now()}-${i}`,
      thumbnailUrl: 'https://via.placeholder.com/640x360',
      streamerName: `TestStreamer${i % 5 + 1}`,
      game,
      description: `Test clip for search functionality - ${randomTags.join(', ')}`,
      tags: randomTags,
      duration: Math.floor(Math.random() * 60) + 10,
      language,
      viewCount: Math.floor(Math.random() * 10000),
      likeCount: Math.floor(Math.random() * 1000),
    };

    try {
      const response = await page.request.post(`${apiUrl}/admin/clips`, {
        data: clipData,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok()) {
        const clip = await response.json();
        clipIds.push(clip.id);
      } else {
        // Use mock ID if API fails
        clipIds.push(`mock-clip-${Date.now()}-${i}`);
      }
    } catch (error) {
      console.warn('Failed to create clip via API:', error);
      clipIds.push(`mock-clip-${Date.now()}-${i}`);
    }
  }

  return clipIds;
}

/**
 * Clean up seeded test data
 * @param page - Playwright Page object
 * @param clipIds - Array of clip IDs to delete
 */
export async function cleanupSearchData(page: Page, clipIds: string[]): Promise<void> {
  const apiUrl = getApiBaseUrl();

  for (const id of clipIds) {
    if (id.startsWith('mock-')) continue; // Skip mock IDs

    try {
      await page.request.delete(`${apiUrl}/admin/clips/${id}`);
    } catch (error) {
      console.warn(`Failed to delete clip ${id}:`, error);
    }
  }
}

// ============================================================================
// Pagination Helpers
// ============================================================================

/**
 * Test pagination through multiple pages
 * @param page - Playwright Page object
 * @param query - Search query
 * @param maxPages - Maximum pages to test
 * @returns Array of result counts per page
 */
export async function testPagination(
  page: Page,
  query: string,
  maxPages: number = 3
): Promise<number[]> {
  const resultCounts: number[] = [];

  // Start with first page
  await performSearch(page, { query });

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    // Count results on current page
    const results = await extractSearchResults(page);
    resultCounts.push(results.length);

    // Try to go to next page
    const nextButton = page.locator('button, a').filter({ hasText: /next|→|›/i }).last();
    const isEnabled = await nextButton.isEnabled().catch(() => false);

    if (!isEnabled || pageNum === maxPages) {
      break;
    }

    await nextButton.click();
    await page.waitForLoadState('networkidle');
  }

  return resultCounts;
}
