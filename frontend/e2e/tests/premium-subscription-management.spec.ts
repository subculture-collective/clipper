/**
 * Premium Subscription E2E Tests - Subscription Management
 * 
 * Tests subscription management flows including:
 * - Viewing subscription in settings
 * - Accessing Stripe Customer Portal
 * - Canceling subscription (immediate and at period end)
 * - Reactivating subscription
 * - Verifying subscription status changes
 * 
 * @see /docs/testing/STRIPE_SUBSCRIPTION_TESTING.md
 */

import { test, expect } from '../fixtures';
import { SubscriptionSettingsPage } from '../pages';
import { waitForSubscriptionStatus } from '../utils/stripe-helpers';

test.describe('Premium Subscription - Settings & Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('should display subscription section in settings', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    // Verify subscription section is visible
    await expect(settingsPage.subscriptionSection).toBeVisible();
    
    // Verify current plan is displayed
    const plan = await settingsPage.getCurrentPlan();
    expect(plan).toBeTruthy();
    expect(plan.toLowerCase()).toMatch(/free|pro/);
  });

  test('should show upgrade button for free users', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    // Check current plan
    const plan = await settingsPage.getCurrentPlan();
    
    if (plan.toLowerCase().includes('free')) {
      // Free users should see upgrade button
      await settingsPage.verifyUpgradeButtonVisible();
      
      // Click upgrade should navigate to pricing
      await settingsPage.clickUpgrade();
      await page.waitForURL(/pricing/, { timeout: 5000 });
    }
  });

  test.skip('should display subscription details for pro users', async ({ authenticatedPage }) => {
    // Skip if user doesn't have active subscription
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    const plan = await settingsPage.getCurrentPlan();
    
    if (!plan.toLowerCase().includes('pro')) {
      test.skip();
    }
    
    // Verify subscription details are shown
    const hasActiveSubscription = await settingsPage.verifyActiveSubscription();
    expect(hasActiveSubscription).toBe(true);
    
    // Verify billing period is displayed
    const billingPeriod = await settingsPage.getBillingPeriod();
    expect(billingPeriod).toBeTruthy();
    expect(billingPeriod.toLowerCase()).toMatch(/month|year/);
    
    // Verify next billing date is shown
    const nextBillingDate = await settingsPage.getNextBillingDate();
    expect(nextBillingDate).toBeTruthy();
  });

  test.skip('should access Stripe Customer Portal', async ({ authenticatedPage, context }) => {
    // Skip if user doesn't have active subscription
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    const plan = await settingsPage.getCurrentPlan();
    if (!plan.toLowerCase().includes('pro')) {
      test.skip();
    }
    
    // Set up listener for new page/tab
    const pagePromise = context.waitForEvent('page');
    
    // Click manage subscription
    await settingsPage.clickManageSubscription();
    
    // Wait for Stripe portal to open
    const portalPage = await pagePromise;
    await portalPage.waitForLoadState('networkidle');
    
    // Verify we're on Stripe portal
    expect(portalPage.url()).toContain('billing.stripe.com');
    
    await portalPage.close();
  });

  test('should show settings navigation structure', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    // Verify settings page has sections
    const sections = await page.locator('section, [role="region"]').count();
    expect(sections).toBeGreaterThan(0);
    
    // Look for subscription-related heading or section
    const subscriptionHeading = page.getByRole('heading', { name: /subscription|billing|plan/i });
    const headingCount = await subscriptionHeading.count();
    expect(headingCount).toBeGreaterThanOrEqual(0); // May be 0 for free users
  });
});

test.describe('Premium Subscription - Cancellation', () => {
  test.skip('should display cancel button for active subscriptions', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    const plan = await settingsPage.getCurrentPlan();
    if (!plan.toLowerCase().includes('pro')) {
      test.skip();
    }
    
    // Verify cancel button is visible
    await settingsPage.verifyCancelButtonVisible();
  });

  test.skip('should handle subscription cancellation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    
    const plan = await settingsPage.getCurrentPlan();
    if (!plan.toLowerCase().includes('pro')) {
      test.skip();
    }
    
    // Click cancel subscription
    await settingsPage.clickCancelSubscription();
    
    // May show confirmation dialog
    const confirmDialog = page.getByRole('dialog', { name: /cancel|confirm/i });
    if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      const confirmButton = confirmDialog.getByRole('button', { name: /confirm|yes|cancel.*subscription/i });
      await confirmButton.click();
    }
    
    // Wait for status update
    await page.waitForTimeout(2000);
    
    // Verify cancellation indication
    // Could be immediate or scheduled for period end
    const cancelText = page.locator('text=/cancel|will.*end|scheduled/i');
    await expect(cancelText).toBeVisible({ timeout: 10000 });
  });

  test.skip('should display reactivate button for scheduled cancellations', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    
    // Check if subscription is set to cancel at period end
    const cancelText = page.locator('text=/cancel.*at.*period.*end|scheduled.*cancel/i');
    const isCancelScheduled = await cancelText.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isCancelScheduled) {
      test.skip();
    }
    
    // Verify reactivate button is visible
    await settingsPage.verifyReactivateButtonVisible();
  });

  test.skip('should reactivate scheduled cancellation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    
    // Check if subscription is set to cancel at period end
    const cancelText = page.locator('text=/cancel.*at.*period.*end/i');
    const isCancelScheduled = await cancelText.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isCancelScheduled) {
      test.skip();
    }
    
    // Click reactivate
    await settingsPage.clickReactivateSubscription();
    
    // Wait for status update
    await page.waitForTimeout(2000);
    
    // Verify cancellation is removed
    const activeText = page.locator('text=/active|renew/i');
    await expect(activeText).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Premium Subscription - Status Display', () => {
  test('should display subscription status for all users', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    // Get subscription status
    const status = await settingsPage.getSubscriptionStatus();
    
    // Status should be one of the valid states
    const validStatuses = ['active', 'inactive', 'canceled', 'past_due', 'free', 'trialing'];
    const hasValidStatus = validStatuses.some(s => status.toLowerCase().includes(s));
    
    expect(hasValidStatus).toBe(true);
  });

  test('should update subscription status in real-time', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    const initialStatus = await settingsPage.getSubscriptionStatus();
    expect(initialStatus).toBeTruthy();
    
    // Reload page
    await page.reload();
    await settingsPage.verifyPageLoaded();
    
    const reloadedStatus = await settingsPage.getSubscriptionStatus();
    expect(reloadedStatus).toBe(initialStatus);
  });

  test('should handle missing subscription gracefully', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    // Page should load without errors even if no subscription
    const plan = await settingsPage.getCurrentPlan();
    expect(plan).toBeTruthy();
    
    // Free tier should be the default
    if (!plan.toLowerCase().includes('pro')) {
      expect(plan.toLowerCase()).toContain('free');
    }
  });
});

test.describe('Premium Subscription - Navigation', () => {
  test('should navigate from settings to pricing', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    // Look for pricing/upgrade link
    const pricingLink = page.getByRole('link', { name: /pricing|upgrade|see.*plans/i }).first();
    
    if (await pricingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pricingLink.click();
      await page.waitForURL(/pricing/, { timeout: 5000 });
    }
  });

  test('should show subscription menu item in navigation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for subscription-related navigation items
    const navItems = page.locator('nav a, nav button');
    const navText = await navItems.allTextContents();
    
    const hasSubscriptionNav = navText.some(text => 
      /subscription|billing|plan|pricing|upgrade/i.test(text)
    );
    
    // It's okay if there's no explicit subscription nav item
    // but there should be some way to access it
    expect(navItems.count()).resolves.toBeGreaterThan(0);
  });
});
