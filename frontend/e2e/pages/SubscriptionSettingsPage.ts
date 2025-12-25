import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for Subscription Settings
 * 
 * Handles interactions with subscription management in settings:
 * - Viewing subscription status
 * - Accessing Stripe Customer Portal
 * - Canceling subscriptions
 * - Viewing subscription details
 */
export class SubscriptionSettingsPage extends BasePage {
  // Locators
  readonly subscriptionSection: Locator;
  readonly subscriptionStatus: Locator;
  readonly currentPlan: Locator;
  readonly billingPeriod: Locator;
  readonly nextBillingDate: Locator;
  readonly manageSubscriptionButton: Locator;
  readonly cancelSubscriptionButton: Locator;
  readonly reactivateSubscriptionButton: Locator;
  readonly upgradeButton: Locator;

  constructor(page: Page) {
    super(page);
    
    // Main subscription section
    this.subscriptionSection = page.locator('[data-testid="subscription-section"], section:has-text("Subscription")');
    
    // Status and details
    this.subscriptionStatus = page.locator('[data-testid="subscription-status"], text=/status.*active|status.*canceled|status.*past.due/i');
    this.currentPlan = page.locator('[data-testid="current-plan"], text=/free|pro|premium/i');
    this.billingPeriod = page.locator('[data-testid="billing-period"], text=/monthly|yearly|annual/i');
    this.nextBillingDate = page.locator('[data-testid="next-billing-date"], text=/next.*billing|renews.*on/i');
    
    // Action buttons
    this.manageSubscriptionButton = page.getByRole('button', { name: /manage.*subscription|customer.*portal/i });
    this.cancelSubscriptionButton = page.getByRole('button', { name: /cancel.*subscription/i });
    this.reactivateSubscriptionButton = page.getByRole('button', { name: /reactivate|resume.*subscription/i });
    this.upgradeButton = page.getByRole('button', { name: /upgrade|subscribe/i });
  }

  /**
   * Navigate to settings page
   */
  async goto() {
    await this.page.goto('/settings');
    await this.waitForPageLoad();
  }

  /**
   * Verify settings page loaded
   */
  async verifyPageLoaded() {
    await this.verifyUrl(/settings/);
    await this.page.getByRole('heading', { name: /settings/i }).waitFor({ state: 'visible' });
  }

  /**
   * Verify user has active subscription
   */
  async verifyActiveSubscription() {
    await this.waitForElement(this.subscriptionSection);
    const statusText = await this.subscriptionStatus.textContent();
    return statusText?.toLowerCase().includes('active');
  }

  /**
   * Verify user has pro plan
   */
  async verifyProPlan() {
    await this.waitForElement(this.currentPlan);
    const planText = await this.currentPlan.textContent();
    return planText?.toLowerCase().includes('pro');
  }

  /**
   * Verify user has free plan
   */
  async verifyFreePlan() {
    await this.waitForElement(this.currentPlan);
    const planText = await this.currentPlan.textContent();
    return planText?.toLowerCase().includes('free');
  }

  /**
   * Get subscription status text
   */
  async getSubscriptionStatus(): Promise<string> {
    await this.waitForElement(this.subscriptionSection);
    return await this.subscriptionStatus.textContent() || '';
  }

  /**
   * Get current plan name
   */
  async getCurrentPlan(): Promise<string> {
    await this.waitForElement(this.currentPlan);
    return await this.currentPlan.textContent() || '';
  }

  /**
   * Get billing period
   */
  async getBillingPeriod(): Promise<string> {
    try {
      await this.billingPeriod.waitFor({ state: 'visible', timeout: 5000 });
      return await this.billingPeriod.textContent() || '';
    } catch {
      return ''; // Not available for free tier
    }
  }

  /**
   * Click manage subscription button
   * Opens Stripe Customer Portal in new tab
   */
  async clickManageSubscription() {
    await this.click(this.manageSubscriptionButton);
  }

  /**
   * Click cancel subscription button
   */
  async clickCancelSubscription() {
    await this.click(this.cancelSubscriptionButton);
  }

  /**
   * Click reactivate subscription button
   */
  async clickReactivateSubscription() {
    await this.click(this.reactivateSubscriptionButton);
  }

  /**
   * Click upgrade button (for free users)
   */
  async clickUpgrade() {
    await this.click(this.upgradeButton);
  }

  /**
   * Verify cancel button is visible
   */
  async verifyCancelButtonVisible() {
    await this.waitForElement(this.cancelSubscriptionButton);
  }

  /**
   * Verify reactivate button is visible
   */
  async verifyReactivateButtonVisible() {
    await this.waitForElement(this.reactivateSubscriptionButton);
  }

  /**
   * Verify upgrade button is visible (for free users)
   */
  async verifyUpgradeButtonVisible() {
    await this.waitForElement(this.upgradeButton);
  }

  /**
   * Verify subscription is set to cancel at period end
   */
  async verifyCancelAtPeriodEnd() {
    const cancelText = this.page.locator('text=/cancel.*at.*period.*end|will.*cancel.*on/i');
    await this.waitForElement(cancelText);
  }

  /**
   * Get next billing date
   */
  async getNextBillingDate(): Promise<string> {
    try {
      await this.nextBillingDate.waitFor({ state: 'visible', timeout: 5000 });
      return await this.nextBillingDate.textContent() || '';
    } catch {
      return ''; // Not available
    }
  }
}
