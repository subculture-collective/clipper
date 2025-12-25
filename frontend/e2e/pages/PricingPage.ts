import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Pricing Page
 * 
 * Handles interactions with /pricing page including:
 * - Viewing pricing tiers
 * - Toggling billing periods (monthly/yearly)
 * - Initiating checkout
 * - Feature comparison
 */
export class PricingPage extends BasePage {
  // Locators
  readonly monthlyToggle: Locator;
  readonly yearlyToggle: Locator;
  readonly subscribeMonthlyButton: Locator;
  readonly subscribeYearlyButton: Locator;
  readonly freeFeaturesList: Locator;
  readonly proFeaturesList: Locator;
  readonly pricingHeader: Locator;

  constructor(page: Page) {
    super(page, '/pricing');
    
    // Billing period toggles
    this.monthlyToggle = page.getByRole('button', { name: /monthly/i });
    this.yearlyToggle = page.getByRole('button', { name: /yearly/i });
    
    // Subscribe buttons - look for buttons containing "Subscribe" or "Upgrade" text
    this.subscribeMonthlyButton = page.getByRole('button', { name: /subscribe.*monthly|upgrade.*monthly/i });
    this.subscribeYearlyButton = page.getByRole('button', { name: /subscribe.*yearly|upgrade.*yearly/i });
    
    // Feature lists
    this.freeFeaturesList = page.locator('[data-testid="free-features"], .free-features');
    this.proFeaturesList = page.locator('[data-testid="pro-features"], .pro-features');
    
    // Header
    this.pricingHeader = page.getByRole('heading', { name: /pricing|upgrade to.*pro/i });
  }

  /**
   * Navigate to pricing page
   */
  async goto() {
    await this.page.goto('/pricing');
    await this.waitForPageLoad();
  }

  /**
   * Verify pricing page loaded
   */
  async verifyPageLoaded() {
    await this.verifyUrl(/pricing/);
    await this.waitForElement(this.pricingHeader);
  }

  /**
   * Select monthly billing period
   */
  async selectMonthlyBilling() {
    await this.click(this.monthlyToggle);
    // Wait for UI to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Select yearly billing period
   */
  async selectYearlyBilling() {
    await this.click(this.yearlyToggle);
    // Wait for UI to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Click subscribe button for monthly plan
   * This will either redirect to login or initiate Stripe checkout
   */
  async clickSubscribeMonthly() {
    await this.click(this.subscribeMonthlyButton);
  }

  /**
   * Click subscribe button for yearly plan
   * This will either redirect to login or initiate Stripe checkout
   */
  async clickSubscribeYearly() {
    await this.click(this.subscribeYearlyButton);
  }

  /**
   * Verify monthly billing period is selected
   */
  async verifyMonthlySelected() {
    await this.verifyElementHasClass(this.monthlyToggle, /active|selected|bg-purple/);
  }

  /**
   * Verify yearly billing period is selected
   */
  async verifyYearlySelected() {
    await this.verifyElementHasClass(this.yearlyToggle, /active|selected|bg-purple/);
  }

  /**
   * Get the monthly price displayed
   */
  async getMonthlyPrice(): Promise<string> {
    const priceElement = this.page.locator('text=/\\$[0-9]+\\.?[0-9]*.*month/i').first();
    return await priceElement.textContent() || '';
  }

  /**
   * Get the yearly price displayed
   */
  async getYearlyPrice(): Promise<string> {
    const priceElement = this.page.locator('text=/\\$[0-9]+\\.?[0-9]*.*year/i').first();
    return await priceElement.textContent() || '';
  }

  /**
   * Verify pro features are listed
   */
  async verifyProFeaturesVisible() {
    // Look for common pro features
    const features = [
      /ad-free|no ads/i,
      /priority support/i,
      /advanced.*search|search.*advanced/i,
    ];
    
    for (const feature of features) {
      const featureElement = this.page.locator(`text=${feature}`).first();
      if (await featureElement.isVisible()) {
        return; // At least one feature is visible
      }
    }
    
    // Fallback: just verify pro features section exists
    await this.waitForElement(this.proFeaturesList.or(
      this.page.locator('text=/pro feature|exclusive feature/i')
    ));
  }

  /**
   * Wait for subscribe button to be enabled/loaded
   */
  async waitForSubscribeButtonReady() {
    await this.subscribeMonthlyButton.or(this.subscribeYearlyButton).waitFor({ state: 'visible' });
    // Wait a bit for any loading states to clear
    await this.page.waitForTimeout(1000);
  }
}
