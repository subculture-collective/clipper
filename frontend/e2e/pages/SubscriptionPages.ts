import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for Subscription Success Page
 * 
 * Shown after successful Stripe Checkout completion
 */
export class SubscriptionSuccessPage extends BasePage {
  readonly successMessage: Locator;
  readonly subscriptionDetails: Locator;
  readonly goToSettingsButton: Locator;
  readonly goToHomeButton: Locator;

  constructor(page: Page) {
    super(page, '/subscription/success');
    
    this.successMessage = page.locator('text=/success|welcome.*pro|subscription.*active/i').first();
    this.subscriptionDetails = page.locator('[data-testid="subscription-details"]');
    this.goToSettingsButton = page.getByRole('link', { name: /settings|manage.*subscription/i });
    this.goToHomeButton = page.getByRole('link', { name: /home|browse.*clips/i });
  }

  async goto() {
    await this.page.goto('/subscription/success');
    await this.waitForPageLoad();
  }

  async verifySuccessMessage() {
    await this.waitForElement(this.successMessage);
  }

  async clickGoToSettings() {
    await this.click(this.goToSettingsButton);
  }

  async clickGoToHome() {
    await this.click(this.goToHomeButton);
  }
}

/**
 * Page Object Model for Subscription Cancel Page
 * 
 * Shown after subscription cancellation
 */
export class SubscriptionCancelPage extends BasePage {
  readonly cancelMessage: Locator;
  readonly feedbackForm: Locator;
  readonly returnToHomeButton: Locator;

  constructor(page: Page) {
    super(page, '/subscription/cancel');
    
    this.cancelMessage = page.locator('text=/cancel|subscription.*ended/i').first();
    this.feedbackForm = page.locator('form:has-text("feedback"), [data-testid="cancel-feedback"]');
    this.returnToHomeButton = page.getByRole('link', { name: /home|browse/i });
  }

  async goto() {
    await this.page.goto('/subscription/cancel');
    await this.waitForPageLoad();
  }

  async verifyCancelMessage() {
    await this.waitForElement(this.cancelMessage);
  }

  async clickReturnToHome() {
    await this.click(this.returnToHomeButton);
  }
}
