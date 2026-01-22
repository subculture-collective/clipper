import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * SearchPage - Page Object for search functionality
 *
 * Handles interactions with:
 * - Search bar and autocomplete suggestions
 * - Search filters (duration, category, tags, uploader)
 * - Search results and pagination
 * - Search history
 * - Empty states
 *
 * @example
 * ```typescript
 * const searchPage = new SearchPage(page);
 * await searchPage.goto();
 * await searchPage.search('gaming highlights');
 * await searchPage.applyFilters({ category: 'FPS', duration: 'short' });
 * const results = await searchPage.getSearchResults();
 * ```
 */
export class SearchPage extends BasePage {
  // Search Bar & Input
  private readonly searchInput: Locator;
  private readonly searchButton: Locator;
  private readonly clearSearchButton: Locator;

  // Suggestions/Autocomplete
  private readonly suggestionsContainer: Locator;
  private readonly suggestionItems: Locator;
  private readonly suggestionsLoading: Locator;

  // Results
  private readonly searchResults: Locator;
  private readonly resultCards: Locator;
  private readonly resultsCount: Locator;
  private readonly emptyState: Locator;
  private readonly emptyStateMessage: Locator;
  private readonly emptyStateAction: Locator;

  // Tabs
  private readonly allTab: Locator;
  private readonly clipsTab: Locator;
  private readonly creatorsTab: Locator;
  private readonly gamesTab: Locator;
  private readonly tagsTab: Locator;

  // Sort
  private readonly sortDropdown: Locator;
  private readonly sortRelevance: Locator;
  private readonly sortRecent: Locator;
  private readonly sortPopular: Locator;

  // Filters
  private readonly filtersSection: Locator;
  private readonly showFiltersButton: Locator;
  private readonly clearFiltersButton: Locator;
  private readonly languageFilters: Locator;
  private readonly gameFilters: Locator;
  private readonly dateRangeFilters: Locator;
  private readonly tagFilters: Locator;
  private readonly minVotesInput: Locator;

  // Pagination
  private readonly nextPageButton: Locator;
  private readonly previousPageButton: Locator;
  private readonly pageNumber: Locator;

  // Search History
  private readonly searchHistoryContainer: Locator;
  private readonly searchHistoryItems: Locator;
  private readonly clearHistoryButton: Locator;

  // Trending Searches
  private readonly trendingSearchesContainer: Locator;
  private readonly trendingSearchItems: Locator;

  // Saved Searches
  private readonly savedSearchesContainer: Locator;
  private readonly savedSearchItems: Locator;
  private readonly clearSavedSearchesButton: Locator;
  private readonly saveSearchButton: Locator;

  constructor(page: Page) {
    super(page, '/search');

    // Initialize locators - Search Bar
    this.searchInput = page.locator(':is([data-testid="search-input"], input[type="search"], input[name="q"], input[placeholder*="search" i], [role="searchbox"])').first();
    this.searchButton = page.locator('button[type="submit"]').first();
    this.clearSearchButton = page.locator('button[aria-label*="clear" i]');

    // Suggestions/Autocomplete
    this.suggestionsContainer = page.locator('[role="listbox"], [data-testid="suggestions"], .suggestions-dropdown').first();
    this.suggestionItems = this.suggestionsContainer.locator('[role="option"], .suggestion-item, li');
    this.suggestionsLoading = this.suggestionsContainer.locator('.loading, [aria-busy="true"]');

    // Results
    this.searchResults = page.getByTestId('search-results').first();
    this.resultCards = page.locator('[data-testid="clip-card"], .clip-card, .search-result-card');
    this.resultsCount = page.getByTestId('results-count').first();
    this.emptyState = page.locator('.empty-state, [data-testid="empty-state"]').first();
    this.emptyStateMessage = this.emptyState.locator('p, .message').first();
    this.emptyStateAction = this.emptyState.locator('button, a').first();

    // Tabs
    this.allTab = page.getByTestId('tab-all');
    this.clipsTab = page.getByTestId('tab-clips');
    this.creatorsTab = page.getByTestId('tab-creators');
    this.gamesTab = page.getByTestId('tab-games');
    this.tagsTab = page.getByTestId('tab-tags');

    // Sort
    this.sortDropdown = page.getByTestId('search-sort-select');
    this.sortRelevance = page.locator('option[value="relevance"]');
    this.sortRecent = page.locator('option[value="recent"]');
    this.sortPopular = page.locator('option[value="popular"]');

    // Filters
    this.filtersSection = page.locator('.filters, [data-testid="filters"]').first();
    this.showFiltersButton = page.locator('button').filter({ hasText: /show/i });
    this.clearFiltersButton = page.locator('button').filter({ hasText: /clear.*all/i });
    this.languageFilters = this.filtersSection.locator('.language-filter, [data-filter="language"]');
    this.gameFilters = this.filtersSection.locator('.game-filter, [data-filter="game"]');
    this.dateRangeFilters = this.filtersSection.locator('.date-range-filter, [data-filter="date"]');
    this.tagFilters = this.filtersSection.locator('.tag-filter, [data-filter="tags"]');
    this.minVotesInput = this.filtersSection.locator('input[name="minVotes"], input[placeholder*="votes" i]');

    // Pagination
    this.nextPageButton = page.getByTestId('pagination-next');
    this.previousPageButton = page.getByTestId('pagination-prev');
    this.pageNumber = page.getByTestId('page-number').first();

    // Search History
    this.searchHistoryContainer = page.locator('.search-history, [data-testid="search-history"]').first();
    this.searchHistoryItems = this.searchHistoryContainer.locator('li, .history-item, button[data-testid^="history-item"]');
    this.clearHistoryButton = page.getByTestId('clear-history-button');

    // Trending Searches
    this.trendingSearchesContainer = page.getByTestId('trending-searches');
    this.trendingSearchItems = this.trendingSearchesContainer.locator('button[data-testid^="trending-search"]');

    // Saved Searches
    this.savedSearchesContainer = page.getByTestId('saved-searches');
    this.savedSearchItems = this.savedSearchesContainer.locator('div[data-testid^="saved-search"]');
    this.clearSavedSearchesButton = page.getByTestId('clear-saved-searches');
    this.saveSearchButton = page.getByTestId('save-search-button');
  }

  // ============================================================================
  // Search Actions
  // ============================================================================

  /**
   * Perform a search with the given query
   * @param query - Search query string
   * @param waitForResults - Wait for results to load (default: true)
   */
  async search(query: string, waitForResults: boolean = true): Promise<void> {
      // Ensure page has loaded before trying to interact
      await this.page.waitForLoadState('domcontentloaded');

      // Try a set of robust selectors to locate the search input
      const selectors: Array<{ selector: string; timeout: number }> = [
        { selector: '[data-testid="search-input"]', timeout: 15000 },
        { selector: 'input[type="search"]', timeout: 5000 },
        { selector: 'input[name="q"]', timeout: 5000 },
        { selector: 'input[placeholder*="search" i]', timeout: 5000 },
        { selector: '[role="searchbox"]', timeout: 5000 },
      ];

      let filled = false;
      for (const { selector, timeout } of selectors) {
        try {
          await this.page.fill(selector, query, { timeout });
          filled = true;
          break;
        } catch (err) {
          // try next selector
        }
      }

      if (!filled) {
        throw new Error('Search input not found or not interactable');
      }

      // Submit
      await this.pressKey('Enter');

    if (waitForResults) {
      await this.waitForResults();
    }
  }

  /**
   * Type into search input with delay to trigger suggestions
   * @param query - Search query string
   * @param delay - Delay between keystrokes in ms (default: 50ms)
   */
  async typeSearchQuery(query: string, delay: number = 50): Promise<void> {
    await this.typeInput(this.searchInput, query, delay);
  }

  /**
   * Clear the search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  /**
   * Expose the search input locator for tests that need direct access
   */
  getSearchInput(): Locator {
    return this.searchInput;
  }

  /**
   * Get current search query from input
   */
  async getSearchQuery(): Promise<string> {
    return await this.searchInput.inputValue();
  }

  // ============================================================================
  // Suggestions/Autocomplete
  // ============================================================================

  /**
   * Wait for suggestions to appear
   * @param timeout - Maximum time to wait in ms
   */
  async waitForSuggestions(timeout: number = 5000): Promise<void> {
    await this.suggestionsContainer.waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if suggestions are visible
   */
  async areSuggestionsVisible(): Promise<boolean> {
    return await this.suggestionsContainer.isVisible();
  }

  /**
   * Get number of suggestions shown
   */
  async getSuggestionCount(): Promise<number> {
    await this.waitForSuggestions();
    return await this.suggestionItems.count();
  }

  /**
   * Get all suggestion texts
   */
  async getSuggestionTexts(): Promise<string[]> {
    await this.waitForSuggestions();
    const count = await this.suggestionItems.count();
    const texts: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await this.suggestionItems.nth(i).textContent();
      if (text) texts.push(text.trim());
    }

    return texts;
  }

  /**
   * Select a suggestion by index
   * @param index - Zero-based index of suggestion
   */
  async selectSuggestion(index: number): Promise<void> {
    await this.waitForSuggestions();
    await this.suggestionItems.nth(index).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select a suggestion by text
   * @param text - Suggestion text to select
   */
  async selectSuggestionByText(text: string): Promise<void> {
    await this.waitForSuggestions();
    await this.suggestionItems.filter({ hasText: text }).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate suggestions using keyboard
   * @param direction - 'down' or 'up'
   * @param count - Number of times to navigate (default: 1)
   */
  async navigateSuggestions(direction: 'down' | 'up', count: number = 1): Promise<void> {
    const key = direction === 'down' ? 'ArrowDown' : 'ArrowUp';
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press(key);
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Measure suggestion response time
   * @param query - Query to type
   * @returns Time in milliseconds
   */
  async measureSuggestionLatency(query: string): Promise<number> {
    await this.goto();
    await this.searchInput.clear();
    await this.searchInput.click();

    const startTime = Date.now();
    await this.typeInput(this.searchInput, query, 50);
    await this.waitForSuggestions(5000);
    const endTime = Date.now();

    return endTime - startTime;
  }

  // ============================================================================
  // Results
  // ============================================================================

  /**
   * Wait for search results to load
   * @param timeout - Maximum time to wait in ms
   */
  async waitForResults(timeout: number = 10000): Promise<void> {
    await this.page.waitForLoadState('networkidle');

    // Wait for either results or empty state
    try {
      await Promise.race([
        this.resultCards.first().waitFor({ state: 'visible', timeout }),
        this.emptyState.waitFor({ state: 'visible', timeout }),
        this.resultsCount.waitFor({ state: 'visible', timeout }),
      ]);
    } catch {
      // Fall back: ensure page loaded, do not throw
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Get number of search results
   */
  async getResultCount(): Promise<number> {
    await this.waitForResults();

    const parseCount = async (): Promise<number | null> => {
      const countText = await this.resultsCount.textContent();
      const match = countText?.match(/Found\s+(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    };

    // First attempt: use UI result count if available
    const initialCount = await parseCount();
    if (initialCount !== null) {
      return initialCount;
    }

    // Fallback: wait for visible cards and count them
    try {
      await this.resultCards.first().waitFor({ state: 'visible', timeout: 5000 });
      const cardCount = await this.resultCards.count();
      if (cardCount > 0) return cardCount;
    } catch {
      // ignore and retry
    }

    // Second attempt after brief delay to reduce flakiness
    await this.page.waitForTimeout(1000);

    const retryCount = await parseCount();
    if (retryCount !== null) {
      return retryCount;
    }

    try {
      await this.resultCards.first().waitFor({ state: 'visible', timeout: 3000 });
      return await this.resultCards.count();
    } catch {
      return 0;
    }
  }

  /**
   * Get result counts from UI (e.g., "Found 42 results")
   */
  async getResultsCountText(): Promise<string> {
    const text = await this.resultsCount.textContent();
    return text?.trim() || '';
  }

  /**
   * Get result card by index
   * @param index - Zero-based index
   */
  getResultByIndex(index: number): Locator {
    return this.resultCards.nth(index);
  }

  /**
   * Click on a result
   * @param index - Zero-based index
   */
  async clickResult(index: number): Promise<void> {
    await this.resultCards.nth(index).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if empty state is shown
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Get empty state message text
   */
  async getEmptyStateMessage(): Promise<string> {
    const text = await this.emptyStateMessage.textContent();
    return text?.trim() || '';
  }

  /**
   * Click empty state action button
   */
  async clickEmptyStateAction(): Promise<void> {
    await this.emptyStateAction.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ============================================================================
  // Tabs
  // ============================================================================

  /**
   * Switch to a specific search tab
   * @param tab - Tab name ('all', 'clips', 'creators', 'games', 'tags')
   */
  async switchTab(tab: 'all' | 'clips' | 'creators' | 'games' | 'tags'): Promise<void> {
    const tabLocator = {
      all: this.allTab,
      clips: this.clipsTab,
      creators: this.creatorsTab,
      games: this.gamesTab,
      tags: this.tagsTab,
    }[tab];

    await tabLocator.first().waitFor({ state: 'visible', timeout: 10000 });
    await tabLocator.first().click();
    await this.waitForResults();
  }

  /**
   * Get active tab name
   */
  async getActiveTab(): Promise<string> {
    // Find the tab with active state (aria-selected, class, etc.)
    const tabs = [
      { name: 'all', locator: this.allTab },
      { name: 'clips', locator: this.clipsTab },
      { name: 'creators', locator: this.creatorsTab },
      { name: 'games', locator: this.gamesTab },
      { name: 'tags', locator: this.tagsTab },
    ];

    for (const tab of tabs) {
      const ariaSelected = await tab.locator.getAttribute('aria-selected');
      if (ariaSelected === 'true') {
        return tab.name;
      }

      // Also check for active class
      const className = await tab.locator.getAttribute('class');
      if (className?.includes('active') || className?.includes('selected')) {
        return tab.name;
      }
    }

    return 'unknown';
  }

  // ============================================================================
  // Sorting
  // ============================================================================

  /**
   * Change sort order
   * @param sort - Sort type ('relevance', 'recent', 'popular')
   */
  async sortBy(sort: 'relevance' | 'recent' | 'popular'): Promise<void> {
    await this.sortDropdown.selectOption(sort);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get current sort value
   */
  async getCurrentSort(): Promise<string> {
    return await this.sortDropdown.inputValue();
  }

  // ============================================================================
  // Filters
  // ============================================================================

  /**
   * Show filters panel (if collapsed)
   */
  async showFilters(): Promise<void> {
    const isVisible = await this.filtersSection.isVisible();
    if (!isVisible) {
      await this.showFiltersButton.click();
      await this.filtersSection.waitFor({ state: 'visible' });
    }
  }

  /**
   * Apply filter by language
   * @param language - Language code (e.g., 'en', 'es')
   */
  async filterByLanguage(language: string): Promise<void> {
    await this.showFilters();
    const languageOption = this.languageFilters.locator('button, input').filter({ hasText: new RegExp(language, 'i') });
    await languageOption.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Apply filter by game
   * @param game - Game name
   */
  async filterByGame(game: string): Promise<void> {
    await this.showFilters();
    const gameOption = this.gameFilters.locator('button, input').filter({ hasText: new RegExp(game, 'i') });
    await gameOption.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Apply filter by date range
   * @param range - Date range ('last_hour', 'last_day', 'last_week', 'last_month')
   */
  async filterByDateRange(range: 'last_hour' | 'last_day' | 'last_week' | 'last_month'): Promise<void> {
    await this.showFilters();
    const dateOption = this.dateRangeFilters.locator('button, input').filter({
      hasText: new RegExp(range.replace('_', ' '), 'i')
    });
    await dateOption.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Apply filter by minimum votes
   * @param minVotes - Minimum number of votes
   */
  async filterByMinVotes(minVotes: number): Promise<void> {
    await this.showFilters();
    await this.fillInput(this.minVotesInput, minVotes.toString());
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Apply multiple filters at once
   * @param filters - Object with filter values
   */
  async applyFilters(filters: {
    language?: string;
    game?: string;
    dateRange?: 'last_hour' | 'last_day' | 'last_week' | 'last_month';
    minVotes?: number;
  }): Promise<void> {
    await this.showFilters();

    if (filters.language) {
      await this.filterByLanguage(filters.language);
    }

    if (filters.game) {
      await this.filterByGame(filters.game);
    }

    if (filters.dateRange) {
      await this.filterByDateRange(filters.dateRange);
    }

    if (filters.minVotes !== undefined) {
      await this.filterByMinVotes(filters.minVotes);
    }
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    await this.showFilters();
    await this.clearFiltersButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if filters are applied (URL params)
   */
  async hasActiveFilters(): Promise<boolean> {
    const url = this.page.url();
    const filterParams = ['language', 'game_id', 'date_from', 'date_to', 'min_votes', 'tags'];
    return filterParams.some(param => url.includes(`${param}=`));
  }

  // ============================================================================
  // Pagination
  // ============================================================================

  /**
   * Go to next page of results
   */
  async goToNextPage(): Promise<void> {
    const currentUrl = new URL(this.page.url());
    const targetPage = Number(currentUrl.searchParams.get('page') || '1') + 1;
    await this.nextPageButton.click();
    await this.page.waitForURL((url) => url.searchParams.get('page') === String(targetPage));
    await this.page.waitForFunction((expected) => {
      const el = document.querySelector('[data-testid="page-number"]');
      return el?.textContent?.includes(`Page ${expected}`);
    }, targetPage);
    await this.waitForResults();
  }

  /**
   * Go to previous page of results
   */
  async goToPreviousPage(): Promise<void> {
    const currentUrl = new URL(this.page.url());
    const targetPage = Math.max(1, Number(currentUrl.searchParams.get('page') || '1') - 1);
    await this.previousPageButton.click();
    await this.page.waitForURL((url) => url.searchParams.get('page') === String(targetPage) || (!url.searchParams.get('page') && targetPage === 1));
    await this.page.waitForFunction((expected) => {
      const el = document.querySelector('[data-testid="page-number"]');
      return el?.textContent?.includes(`Page ${expected}`);
    }, targetPage);
    await this.waitForResults();
  }

  /**
   * Check if next page button is enabled
   */
  async hasNextPage(): Promise<boolean> {
    try {
      return await this.nextPageButton.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Check if previous page button is enabled
   */
  async hasPreviousPage(): Promise<boolean> {
    try {
      return await this.previousPageButton.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Get current page number
   */
  async getCurrentPage(): Promise<number> {
    const text = await this.pageNumber.textContent();
    return parseInt(text?.trim() || '1', 10);
  }

  // ============================================================================
  // Search History
  // ============================================================================

  /**
   * Check if search history is visible
   */
  async isSearchHistoryVisible(): Promise<boolean> {
    return await this.searchHistoryContainer.isVisible();
  }

  /**
   * Get search history items
   */
  async getSearchHistory(): Promise<string[]> {
    const count = await this.searchHistoryItems.count();
    const items: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await this.searchHistoryItems.nth(i).textContent();
      if (text) items.push(text.trim());
    }

    return items;
  }

  /**
   * Click on a search history item
   * @param index - Zero-based index
   */
  async clickHistoryItem(index: number): Promise<void> {
    await this.searchHistoryItems.nth(index).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    await this.clearHistoryButton.click();
  }

  /**
   * Get search history from localStorage/IndexedDB
   */
  async getSearchHistoryFromStorage(): Promise<string[]> {
    return await this.page.evaluate(() => {
      // Try localStorage first
      const localStorageHistory = localStorage.getItem('searchHistory');
      if (localStorageHistory) {
        try {
          return JSON.parse(localStorageHistory);
        } catch {
          return [];
        }
      }

      // Could also check IndexedDB here if needed
      return [];
    });
  }

  // ============================================================================
  // Performance Metrics
  // ============================================================================

  /**
   * Measure search response time
   * @param query - Search query
   * @returns Time in milliseconds
   */
  async measureSearchLatency(query: string): Promise<number> {
    await this.goto();
    await this.fillInput(this.searchInput, query);

    const startTime = Date.now();

    await this.page.keyboard.press('Enter');

    // Measure until UI reflects loaded state (results or empty)
    await Promise.race([
      this.resultsCount.waitFor({ state: 'visible', timeout: 10000 }),
      this.searchResults.first().waitFor({ state: 'visible', timeout: 10000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * Get navigation timing metrics
   */
  async getNavigationTimings(): Promise<{
    domContentLoaded: number;
    loadComplete: number;
    totalTime: number;
  }> {
    return await this.page.evaluate(() => {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const navEntry = navigationEntries[0];

      if (!navEntry) {
        return {
          domContentLoaded: 0,
          loadComplete: 0,
          totalTime: 0,
        };
      }

      return {
        domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
        loadComplete: navEntry.loadEventEnd - navEntry.startTime,
        totalTime: navEntry.loadEventEnd - navEntry.responseStart,
      };
    });
  }

  // ============================================================================
  // URL and State Management
  // ============================================================================

  /**
   * Navigate to search page with query
   * @param query - Search query
   * @param params - Additional URL parameters
   */
  async gotoWithQuery(query: string, params?: Record<string, string>): Promise<void> {
    const searchParams = new URLSearchParams({ q: query, ...params });
    await this.page.goto(`${this.path}?${searchParams.toString()}`, {
      waitUntil: 'networkidle',
    });
  }

  /**
   * Get current search parameters from URL
   */
  async getSearchParams(): Promise<URLSearchParams> {
    await this.page.waitForLoadState('domcontentloaded');

    await this.page.waitForFunction(() => {
      const params = new URL(window.location.href).searchParams;
      const stored = sessionStorage.getItem('search:lastParams');
      return Boolean(params.get('q') || stored);
    }, { timeout: 2000 });

    const url = new URL(this.page.url());
    if (url.searchParams.get('q')) {
      return url.searchParams;
    }

    try {
      const stored = await this.page.evaluate(() => sessionStorage.getItem('search:lastParams'));
      if (stored) {
        return new URLSearchParams(stored);
      }
    } catch {
      // ignore navigation races
    }

    const latest = new URL(this.page.url());
    return latest.searchParams;
  }

  /**
   * Verify filters persist after navigation
   * @param expectedFilters - Filters that should be in URL
   */
  async verifyFiltersPersist(expectedFilters: Record<string, string>): Promise<boolean> {
    const params = await this.getSearchParams();

    for (const [key, value] of Object.entries(expectedFilters)) {
      if (params.get(key) !== value) {
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // Trending Searches
  // ============================================================================

  /**
   * Get trending searches from the discovery section
   */
  async getTrendingSearches(): Promise<string[]> {
    await this.trendingSearchesContainer.waitFor({ state: 'visible', timeout: 5000 });
    const items = await this.trendingSearchItems.all();
    const searches: string[] = [];
    for (const item of items) {
      const text = await item.textContent();
      if (text) searches.push(text.trim());
    }
    return searches;
  }

  /**
   * Click on a trending search item
   */
  async clickTrendingSearch(index: number): Promise<void> {
    await this.trendingSearchItems.nth(index).click();
    await this.waitForResults();
  }

  /**
   * Check if trending searches are visible
   */
  async hasTrendingSearches(): Promise<boolean> {
    try {
      await this.trendingSearchesContainer.waitFor({ state: 'visible', timeout: 2000 });
      const count = await this.trendingSearchItems.count();
      return count > 0;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Saved Searches
  // ============================================================================

  /**
   * Save the current search
   */
  async saveCurrentSearch(name?: string): Promise<void> {
    // Handle browser prompt if name will be provided
    if (name) {
      this.page.once('dialog', dialog => dialog.accept(name));
    } else {
      this.page.once('dialog', dialog => dialog.dismiss());
    }
    await this.saveSearchButton.click();
  }

  /**
   * Get saved searches
   */
  async getSavedSearches(): Promise<string[]> {
    try {
      await this.savedSearchesContainer.waitFor({ state: 'visible', timeout: 2000 });
      const items = await this.savedSearchItems.all();
      const searches: string[] = [];
      for (const item of items) {
        const text = await item.textContent();
        if (text) searches.push(text.trim());
      }
      return searches;
    } catch {
      return [];
    }
  }

  /**
   * Clear all saved searches
   */
  async clearSavedSearches(): Promise<void> {
    // Handle browser confirm dialog before clicking
    this.page.once('dialog', dialog => dialog.accept());
    await this.clearSavedSearchesButton.click();
  }

  /**
   * Delete a specific saved search by index
   */
  async deleteSavedSearch(index: number): Promise<void> {
    const deleteButton = this.savedSearchItems.nth(index).locator('button[data-testid^="delete-saved-search"]');
    await deleteButton.click();
  }

  /**
   * Check if saved searches are visible
   */
  async hasSavedSearches(): Promise<boolean> {
    try {
      await this.savedSearchesContainer.waitFor({ state: 'visible', timeout: 2000 });
      const count = await this.savedSearchItems.count();
      return count > 0;
    } catch {
      return false;
    }
  }
}
