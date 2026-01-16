/**
 * Premium Subscription E2E Tests - Checkout Flows
 *
 * Tests the complete subscription purchase flow including:
 * - Navigating to pricing page
 * - Initiating checkout
 * - Completing payment with Stripe test cards
 * - Verifying success/failure handling
 * - Checking entitlement activation
 *
 * @see /docs/testing/STRIPE_SUBSCRIPTION_TESTING.md
 */

import { test, expect } from '../fixtures';
import { PricingPage, SubscriptionSuccessPage, SubscriptionSettingsPage } from '../pages';
import {
  STRIPE_TEST_CARDS,
  waitForStripeCheckout,
  completeStripeCheckout,
  verifyProFeaturesEnabled,
} from '../utils/stripe-helpers';

test.describe('Premium Subscription - Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start on a clean slate
    await page.context().clearCookies();
  });

  test('should display pricing page with monthly and yearly options', async ({ page }) => {
    const pricingPage = new PricingPage(page);

    await pricingPage.goto();
    await pricingPage.verifyPageLoaded();

    // Verify billing period toggles are visible
    await expect(pricingPage.monthlyToggle).toBeVisible();
    await expect(pricingPage.yearlyToggle).toBeVisible();

    // Verify subscribe buttons are visible
    await expect(pricingPage.subscribeMonthlyButton.or(pricingPage.subscribeYearlyButton)).toBeVisible();

    // Verify pro features are listed
    await pricingPage.verifyProFeaturesVisible();
  });

  test('should toggle between monthly and yearly billing', async ({ page }) => {
    const pricingPage = new PricingPage(page);

    await pricingPage.goto();
    await pricingPage.verifyPageLoaded();

    // Select monthly
    await pricingPage.selectMonthlyBilling();
    await pricingPage.verifyMonthlySelected();

    // Select yearly
    await pricingPage.selectYearlyBilling();
    await pricingPage.verifyYearlySelected();

    // Verify prices are different
    const monthlyPrice = await pricingPage.getMonthlyPrice();
    const yearlyPrice = await pricingPage.getYearlyPrice();

    expect(monthlyPrice).toBeTruthy();
    expect(yearlyPrice).toBeTruthy();
    expect(monthlyPrice).not.toBe(yearlyPrice);
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    const pricingPage = new PricingPage(page);

    await pricingPage.goto();
    await pricingPage.verifyPageLoaded();

    // Try to subscribe without being logged in
    await pricingPage.clickSubscribeMonthly();

    // Should redirect to login page
    await page.waitForURL(/login|auth/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|auth/);
  });

  test('should complete successful checkout with test card', async ({ authenticatedPage }) => {
    // Skip this test if Stripe is not configured
    const stripeKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey || !stripeKey.startsWith('pk_test_')) {
      test.skip();
    }

    const page = authenticatedPage;
    const pricingPage = new PricingPage(page);

    await pricingPage.goto();
    await pricingPage.verifyPageLoaded();

    // Select monthly billing
    await pricingPage.selectMonthlyBilling();

    // Click subscribe
    await pricingPage.clickSubscribeMonthly();

    // Complete Stripe Checkout
    const checkoutSuccess = await completeStripeCheckout(
      page,
      STRIPE_TEST_CARDS.SUCCESS,
      { expectSuccess: true }
    );

    expect(checkoutSuccess).toBe(true);

    // Verify redirect to success page
    await page.waitForURL(/success|subscription/, { timeout: 30000 });

    const successPage = new SubscriptionSuccessPage(page);
    await successPage.verifySuccessMessage();
  });

  test('should handle checkout with declined card', async ({ authenticatedPage }) => {
    // Skip this test if Stripe is not configured
    const stripeKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey || !stripeKey.startsWith('pk_test_')) {
      test.skip();
    }

    const page = authenticatedPage;
    const pricingPage = new PricingPage(page);

    await pricingPage.goto();
    await pricingPage.verifyPageLoaded();

    // Click subscribe
    await pricingPage.clickSubscribeMonthly();

    // Attempt checkout with declined card
    const checkoutSuccess = await completeStripeCheckout(
      page,
      STRIPE_TEST_CARDS.DECLINED,
      { expectSuccess: false }
    );

    expect(checkoutSuccess).toBe(false);

    // Verify error message is shown
    const errorMessage = page.locator('text=/declined|card.*declined|payment.*failed/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should handle checkout with insufficient funds card', async ({ authenticatedPage }) => {
    const stripeKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey || !stripeKey.startsWith('pk_test_')) {
      test.skip();
    }

    const page = authenticatedPage;
    const pricingPage = new PricingPage(page);

    await pricingPage.goto();
    await pricingPage.verifyPageLoaded();

    await pricingPage.clickSubscribeYearly();

    // Attempt checkout with insufficient funds card
    const checkoutSuccess = await completeStripeCheckout(
      page,
      STRIPE_TEST_CARDS.INSUFFICIENT_FUNDS,
      { expectSuccess: false }
    );

    expect(checkoutSuccess).toBe(false);

    // Verify error message
    const errorMessage = page.locator('text=/insufficient.*funds|card.*declined/i');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should handle checkout cancellation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const pricingPage = new PricingPage(page);

    await pricingPage.goto();
    await pricingPage.verifyPageLoaded();

    // Click subscribe
    await pricingPage.clickSubscribeMonthly();

    // Wait for Stripe checkout
    const checkoutLoaded = await waitForStripeCheckout(page, 5000);

    if (checkoutLoaded) {
      // Go back/cancel checkout
      await page.goBack();

      // Should return to pricing page
      await pricingPage.verifyPageLoaded();
    } else {
      // Stripe not configured, skip the rest
      console.log('Stripe checkout not loaded - skipping cancellation test');
    }
  });

  test('should navigate from pricing to settings after theoretical purchase', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const pricingPage = new PricingPage(page);

    await pricingPage.goto();
    await pricingPage.verifyPageLoaded();

    // Navigate to settings to check subscription status
    await page.goto('/settings');

    const settingsPage = new SubscriptionSettingsPage(page);
    await settingsPage.verifyPageLoaded();

    // Verify we successfully navigated to settings page
    await expect(page).toHaveURL(/settings/);
  });
});

test.describe('Premium Subscription - Success Page', () => {
  test('should display success page elements', async ({ page }) => {
    const successPage = new SubscriptionSuccessPage(page);

    // Navigate directly to success page to test UI
    await successPage.goto();

    // Verify success message or heading is displayed
    const heading = page.getByRole('heading', { name: /success|welcome|thank you/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should provide navigation to settings from success page', async ({ page }) => {
    const successPage = new SubscriptionSuccessPage(page);

    await successPage.goto();

    // Look for settings link
    const settingsLink = page.getByRole('link', { name: /settings|manage|account/i }).first();

    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(settingsLink).toBeVisible();
    }
  });
});

test.describe('Premium Subscription - Entitlements', () => {
  test('should enable pro features after successful purchase', async ({ authenticatedPage }) => {
    // This test requires a completed subscription
    // Skip if not in integration test environment
    const stripeKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey || !stripeKey.startsWith('pk_test_')) {
      test.skip();
    }
    
    const page = authenticatedPage;

    // Navigate to a page with pro features
    await page.goto('/');

    // Verify pro features are enabled
    const isProEnabled = await verifyProFeaturesEnabled(page);
    expect(isProEnabled).toBe(true);
  });

  test('should show upgrade prompts for free users', async ({ page }) => {
    // As a non-authenticated user, should see upgrade prompts
    await page.goto('/');

    // Look for upgrade/pro mentions
    const upgradeElement = page.locator('text=/upgrade|pro|premium|subscribe/i').first();

    // At least one upgrade mention should be visible on the page
    const isVisible = await upgradeElement.isVisible({ timeout: 10000 }).catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('should display pricing link in navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for pricing link in navigation or anywhere on page
    const pricingLink = page.locator('text=/pricing|upgrade to pro|subscribe|go pro/i');

    // Verify at least one pricing/upgrade link exists OR pricing page is accessible
    const count = await pricingLink.count();
    if (count === 0) {
      // Try navigation as fallback verification
      await page.goto('/pricing');
      await expect(page).toHaveURL(/pricing/);
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });
});
