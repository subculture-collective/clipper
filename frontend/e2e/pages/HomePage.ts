import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * HomePage - Page Object for the home/landing page
 * 
 * Handles interactions with:
 * - Clip feed
 * - Search functionality
 * - Navigation
 * - Sorting/filtering options
 * 
 * @example
 * ```typescript
 * const homePage = new HomePage(page);
 * await homePage.goto();
 * await homePage.waitForClipsToLoad();
 * const clipCount = await homePage.getClipCount();
 * ```
 */
export class HomePage extends BasePage {
  // Locators
  private readonly searchInput: Locator;
  private readonly clipCards: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page, '/');
    
    // Initialize locators
    this.searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    this.clipCards = page.getByTestId('clip-card');
    this.submitButton = page.locator('button, a').filter({ hasText: /submit|upload|add clip/i });
  }

  /**
   * Wait for clips to load on the page
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitForClipsToLoad(timeout: number = 10000): Promise<void> {
    await this.clipCards.first().waitFor({ state: 'visible', timeout });
  }

  /**
   * Get the number of clips visible on the page
   * @returns Number of clip cards
   */
  async getClipCount(): Promise<number> {
    return await this.clipCards.count();
  }

  /**
   * Get a specific clip by index
   * @param index - Zero-based index of the clip
   * @returns Locator for the clip card
   */
  getClipByIndex(index: number): Locator {
    return this.clipCards.nth(index);
  }

  /**
   * Click on a clip to view details
   * @param index - Zero-based index of the clip to click (default: 0 = first clip)
   */
  async clickClip(index: number = 0): Promise<void> {
    await this.clipCards.nth(index).click();
    await this.waitForNavigation();
  }

  /**
   * Search for clips
   * @param query - Search query string
   */
  async search(query: string): Promise<void> {
    await this.fillInput(this.searchInput, query);
    await this.pressKey('Enter');
    await this.waitForNavigation();
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  /**
   * Get search input locator
   */
  getSearchInput(): Locator {
    return this.searchInput;
  }

  /**
   * Click on a sort option
   * @param sortType - Type of sorting (e.g., 'New', 'Hot', 'Top')
   */
  async sortBy(sortType: 'new' | 'hot' | 'top' | 'trending'): Promise<void> {
    const sortButton = this.page.locator('button', { hasText: new RegExp(sortType, 'i') });
    
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await this.page.waitForTimeout(1000); // Wait for content to update
    }
  }

  /**
   * Scroll to load more clips (infinite scroll)
   */
  async scrollToLoadMore(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(2000); // Wait for new clips to load
  }

  /**
   * Click submit/upload button
   */
  async clickSubmit(): Promise<void> {
    await this.click(this.submitButton.first());
    await this.waitForNavigation();
  }

  /**
   * Verify clips are displayed
   */
  async verifyClipsVisible(): Promise<void> {
    await this.verifyElementVisible(this.clipCards.first());
  }

  /**
   * Get all clip titles
   * @returns Array of clip titles
   */
  async getClipTitles(): Promise<string[]> {
    const titleLocators = this.page.locator('[data-testid="clip-card"] h2, [data-testid="clip-card"] h3');
    const count = await titleLocators.count();
    const titles: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const title = await titleLocators.nth(i).textContent();
      if (title) titles.push(title);
    }
    
    return titles;
  }

  /**
   * Check if submit button is visible
   */
  async isSubmitButtonVisible(): Promise<boolean> {
    try {
      return await this.submitButton.first().isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }
}
