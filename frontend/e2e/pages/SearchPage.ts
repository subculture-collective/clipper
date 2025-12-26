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

  constructor(page: Page) {
    super(page, '/search');
    
    // Initialize locators - Search Bar
    this.searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="search" i]').first();
    this.searchButton = page.locator('button[type="submit"]').first();
    this.clearSearchButton = page.locator('button[aria-label*="clear" i]');
    
    // Suggestions/Autocomplete
    this.suggestionsContainer = page.locator('[role="listbox"], [data-testid="suggestions"], .suggestions-dropdown').first();
    this.suggestionItems = this.suggestionsContainer.locator('[role="option"], .suggestion-item, li');
    this.suggestionsLoading = this.suggestionsContainer.locator('.loading, [aria-busy="true"]');
    
    // Results
    this.searchResults = page.locator('.search-results, [data-testid="search-results"]').first();
    this.resultCards = page.locator('[data-testid="clip-card"], .clip-card, .search-result-card');
    this.resultsCount = page.locator('.results-count, [data-testid="results-count"]').first();
    this.emptyState = page.locator('.empty-state, [data-testid="empty-state"]').first();
    this.emptyStateMessage = this.emptyState.locator('p, .message').first();
    this.emptyStateAction = this.emptyState.locator('button, a').first();
    
    // Tabs
    this.allTab = page.locator('button, a').filter({ hasText: /^all$/i });
    this.clipsTab = page.locator('button, a').filter({ hasText: /^clips$/i });
    this.creatorsTab = page.locator('button, a').filter({ hasText: /^creators$/i });
    this.gamesTab = page.locator('button, a').filter({ hasText: /^games$/i });
    this.tagsTab = page.locator('button, a').filter({ hasText: /^tags$/i });
    
    // Sort
    this.sortDropdown = page.locator('select').filter({ has: page.locator('option[value="relevance"]') });
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
    this.nextPageButton = page.locator('button, a').filter({ hasText: /next|→|›/i }).last();
    this.previousPageButton = page.locator('button, a').filter({ hasText: /prev|←|‹/i }).first();
    this.pageNumber = page.locator('.page-number, [data-testid="page-number"]').first();
    
    // Search History
    this.searchHistoryContainer = page.locator('.search-history, [data-testid="search-history"]').first();
    this.searchHistoryItems = this.searchHistoryContainer.locator('li, .history-item');
    this.clearHistoryButton = page.locator('button').filter({ hasText: /clear.*history/i });
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
    await this.fillInput(this.searchInput, query);
    await this.pressKey('Enter');
    
    if (waitForResults) {
      await this.page.waitForLoadState('networkidle');
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
    await Promise.race([
      this.resultCards.first().waitFor({ state: 'visible', timeout }),
      this.emptyState.waitFor({ state: 'visible', timeout }),
    ]);
  }

  /**
   * Get number of search results
   */
  async getResultCount(): Promise<number> {
    try {
      await this.resultCards.first().waitFor({ state: 'visible', timeout: 5000 });
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
    
    await tabLocator.click();
    await this.page.waitForLoadState('networkidle');
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
    await this.nextPageButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Go to previous page of results
   */
  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if next page button is enabled
   */
  async hasNextPage(): Promise<boolean> {
    return await this.nextPageButton.isEnabled();
  }

  /**
   * Check if previous page button is enabled
   */
  async hasPreviousPage(): Promise<boolean> {
    return await this.previousPageButton.isEnabled();
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
    await this.fillInput(this.searchInput, query);
    
    const startTime = Date.now();
    
    // Start listening for response before triggering search
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes('/search') && response.status() === 200,
      { timeout: 10000 }
    );
    
    await this.page.keyboard.press('Enter');
    await responsePromise;
    
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
  getSearchParams(): URLSearchParams {
    const url = new URL(this.page.url());
    return url.searchParams;
  }

  /**
   * Verify filters persist after navigation
   * @param expectedFilters - Filters that should be in URL
   */
  async verifyFiltersPersist(expectedFilters: Record<string, string>): Promise<boolean> {
    const params = this.getSearchParams();
    
    for (const [key, value] of Object.entries(expectedFilters)) {
      if (params.get(key) !== value) {
        return false;
      }
    }
    
    return true;
  }
}
