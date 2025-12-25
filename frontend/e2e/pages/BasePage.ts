import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage - Abstract base class for all Page Objects
 * 
 * Provides common functionality and utilities for Page Object Model pattern:
 * - Navigation helpers
 * - Wait utilities
 * - Element interaction methods
 * - Screenshot and debug helpers
 * 
 * All page objects should extend this class.
 * 
 * @example
 * ```typescript
 * export class LoginPage extends BasePage {
 *   constructor(page: Page) {
 *     super(page, '/login');
 *   }
 * 
 *   async login(username: string, password: string) {
 *     await this.goto();
 *     await this.fillInput('[name="username"]', username);
 *     // ...
 *   }
 * }
 * ```
 */
export abstract class BasePage {
  protected readonly page: Page;
  protected readonly path: string;

  /**
   * @param page - Playwright Page object
   * @param path - Relative path to the page (e.g., '/login', '/dashboard')
   */
  constructor(page: Page, path: string = '/') {
    this.page = page;
    this.path = path;
  }

  /**
   * Navigate to this page
   * @param options - Navigation options (waitUntil, timeout, etc.)
   */
  async goto(options?: Parameters<Page['goto']>[1]): Promise<void> {
    await this.page.goto(this.path, {
      waitUntil: 'networkidle',
      ...options,
    });
  }

  /**
   * Get the current URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for the page to be visible (document ready)
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for a specific element to be visible
   * @param selector - CSS selector or test ID
   * @param options - Wait options
   */
  async waitForElement(
    selector: string,
    options?: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' }
  ): Promise<Locator> {
    const locator = this.page.locator(selector);
    await locator.waitFor({ state: options?.state || 'visible', timeout: options?.timeout });
    return locator;
  }

  /**
   * Get element by test ID
   * @param testId - Value of data-testid attribute
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get element by role
   * @param role - ARIA role
   * @param options - Additional options like name
   */
  getByRole(
    role: Parameters<Page['getByRole']>[0],
    options?: Parameters<Page['getByRole']>[1]
  ): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get element by text
   * @param text - Text content or regex pattern
   * @param options - Match options
   */
  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }

  /**
   * Click an element
   * @param selector - CSS selector or Locator
   * @param options - Click options
   */
  async click(selector: string | Locator, options?: Parameters<Locator['click']>[0]): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.click(options);
  }

  /**
   * Fill an input field
   * @param selector - CSS selector or Locator
   * @param value - Value to fill
   */
  async fillInput(selector: string | Locator, value: string): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.fill(value);
  }

  /**
   * Type text into an input (with character-by-character delay)
   * @param selector - CSS selector or Locator
   * @param text - Text to type
   * @param delay - Delay between keystrokes in ms
   */
  async typeInput(selector: string | Locator, text: string, delay: number = 100): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.pressSequentially(text, { delay });
  }

  /**
   * Select an option from a dropdown
   * @param selector - CSS selector or Locator
   * @param value - Option value, label, or index
   */
  async selectOption(
    selector: string | Locator,
    value: string | string[] | { value?: string; label?: string; index?: number }
  ): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.selectOption(value);
  }

  /**
   * Check a checkbox
   * @param selector - CSS selector or Locator
   */
  async check(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.check();
  }

  /**
   * Uncheck a checkbox
   * @param selector - CSS selector or Locator
   */
  async uncheck(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.uncheck();
  }

  /**
   * Take a screenshot
   * @param name - Screenshot file name (without extension)
   */
  async takeScreenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Verify page title
   * @param expectedTitle - Expected page title (string or regex)
   */
  async verifyPageTitle(expectedTitle: string | RegExp): Promise<void> {
    if (typeof expectedTitle === 'string') {
      await expect(this.page).toHaveTitle(expectedTitle);
    } else {
      await expect(this.page).toHaveTitle(expectedTitle);
    }
  }

  /**
   * Verify URL contains a specific path or pattern
   * @param expectedUrl - Expected URL substring or regex
   */
  async verifyUrl(expectedUrl: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expectedUrl);
  }

  /**
   * Verify element is visible
   * @param selector - CSS selector or Locator
   */
  async verifyElementVisible(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator).toBeVisible();
  }

  /**
   * Verify element has text
   * @param selector - CSS selector or Locator
   * @param text - Expected text (string or regex)
   */
  async verifyElementText(selector: string | Locator, text: string | RegExp): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator).toHaveText(text);
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Scroll to element
   * @param selector - CSS selector or Locator
   */
  async scrollToElement(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Hover over element
   * @param selector - CSS selector or Locator
   */
  async hover(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.hover();
  }

  /**
   * Press a key
   * @param key - Key name (e.g., 'Enter', 'Escape', 'Tab')
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'networkidle' });
  }

  /**
   * Get page instance (for advanced operations)
   */
  getPage(): Page {
    return this.page;
  }
}
