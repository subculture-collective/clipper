import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * LoginPage - Page Object for authentication/login page
 * 
 * Handles all login-related interactions including:
 * - Twitch OAuth login flow
 * - Login button interactions
 * - Authentication state verification
 * 
 * @example
 * ```typescript
 * const loginPage = new LoginPage(page);
 * await loginPage.goto();
 * await loginPage.clickTwitchLogin();
 * await loginPage.verifyLoggedIn();
 * ```
 */
export class LoginPage extends BasePage {
  // Locators
  private readonly twitchLoginButton: Locator;
  private readonly loginButtonAlt: Locator;

  constructor(page: Page) {
    super(page, '/');
    
    // Initialize locators
    this.twitchLoginButton = page.getByTestId('twitch-login-btn');
    this.loginButtonAlt = page.getByRole('button', { name: /login|sign in/i });
  }

  /**
   * Click the Twitch login button
   * Handles OAuth popup window flow
   * 
   * @returns Promise that resolves when login is initiated
   */
  async clickTwitchLogin(): Promise<void> {
    // Try test-id first, fall back to text-based selector
    const loginBtn = await this.twitchLoginButton.isVisible().catch(() => false)
      ? this.twitchLoginButton
      : this.loginButtonAlt.first();

    await loginBtn.click();
  }

  /**
   * Handle Twitch OAuth popup window
   * 
   * Note: In E2E tests, you'll need to set up proper OAuth mocking
   * or use test accounts. This method handles the popup detection.
   * 
   * @param context - Browser context for popup handling
   * @returns Promise that resolves with the popup page or null
   */
  async handleOAuthPopup(context: any): Promise<Page | null> {
    try {
      const popup = await context.waitForEvent('page', { timeout: 5000 });
      
      // Verify we're on Twitch OAuth page
      const url = popup.url();
      if (url.includes('twitch.tv')) {
        return popup;
      }
      
      return null;
    } catch (error) {
      // No popup appeared, might be a redirect flow
      return null;
    }
  }

  /**
   * Complete Twitch OAuth flow
   * 
   * Note: This is a placeholder for the actual OAuth flow.
   * In real tests, you would either:
   * 1. Mock the OAuth endpoints
   * 2. Use test credentials and complete the form
   * 3. Use authentication state from fixtures
   */
  async loginWithTwitch(): Promise<void> {
    const context = this.page.context();
    
    // Set up popup promise before clicking
    const popupPromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    
    await this.clickTwitchLogin();
    
    const popup = await popupPromise;
    
    if (popup) {
      // In a real test, you would fill in OAuth form here
      // For now, we just close the popup as a demo
      // await popup.fill('#username', username);
      // await popup.fill('#password', password);
      // await popup.click('button[type="submit"]');
      
      // Wait for OAuth callback
      // await this.page.waitForURL(/.*/, { timeout: 30000 });
      
      await popup.close();
    }
  }

  /**
   * Verify user is logged in
   * Checks for presence of user menu or profile elements
   */
  async verifyLoggedIn(): Promise<void> {
    const userMenuIndicators = [
      this.page.getByTestId('user-menu'),
      this.page.getByRole('button', { name: /profile|account|logout/i }),
      this.page.locator('[data-testid="user-avatar"]'),
    ];

    // Wait for any of the login indicators to appear
    await Promise.race(
      userMenuIndicators.map(locator => 
        locator.waitFor({ state: 'visible', timeout: 10000 })
      )
    );
  }

  /**
   * Verify user is logged out
   * Checks for presence of login button
   */
  async verifyLoggedOut(): Promise<void> {
    await this.verifyElementVisible(this.loginButtonAlt);
  }

  /**
   * Check if login button is visible
   * @returns true if login button is visible, false otherwise
   */
  async isLoginButtonVisible(): Promise<boolean> {
    try {
      const twitchBtn = await this.twitchLoginButton.isVisible({ timeout: 2000 });
      if (twitchBtn) return true;
      
      return await this.loginButtonAlt.first().isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Get login button locator (useful for custom assertions)
   */
  getLoginButton(): Locator {
    return this.loginButtonAlt.first();
  }
}
