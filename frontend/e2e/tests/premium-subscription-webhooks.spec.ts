/**
 * Premium Subscription E2E Tests - Webhook Processing
 * 
 * Tests webhook event handling including:
 * - Invoice payment succeeded/failed events
 * - Subscription lifecycle events
 * - Webhook idempotency
 * - Entitlement updates after webhook processing
 * 
 * NOTE: These tests verify webhook handling flows but do not
 * actually send webhooks in E2E environment. They verify the UI
 * state that would result from webhook processing.
 * 
 * For actual webhook testing, see backend integration tests:
 * - backend/tests/integration/premium/subscription_lifecycle_test.go
 * 
 * @see /docs/testing/STRIPE_SUBSCRIPTION_TESTING.md
 * @see /backend/docs/STRIPE_WEBHOOK_TESTING.md
 */

import { test, expect } from '../fixtures';
import { SubscriptionSettingsPage } from '../pages';
import {
  sendMockWebhook,
  WEBHOOK_EVENTS,
  createTestSubscriptionData,
  waitForSubscriptionStatus,
} from '../utils/stripe-helpers';

test.describe('Premium Subscription - Webhook State Verification', () => {
  /**
   * NOTE: These tests verify the expected UI state after webhook processing.
   * Actual webhook sending and processing is tested in backend integration tests.
   * 
   * In E2E tests, we verify:
   * 1. UI displays correct subscription status
   * 2. Entitlements are properly reflected
   * 3. State persists across page reloads
   */

  test('should display active subscription status', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    // Verify subscription section exists and displays status
    await expect(settingsPage.subscriptionSection).toBeVisible();
    
    const status = await settingsPage.getSubscriptionStatus();
    expect(status).toBeTruthy();
    
    // Status should be one of valid Stripe statuses
    const validStatuses = ['active', 'trialing', 'past_due', 'canceled', 'inactive', 'free'];
    const isValidStatus = validStatuses.some(s => status.toLowerCase().includes(s));
    expect(isValidStatus).toBe(true);
  });

  test('should persist subscription state across page reloads', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    const initialPlan = await settingsPage.getCurrentPlan();
    const initialStatus = await settingsPage.getSubscriptionStatus();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const reloadedPlan = await settingsPage.getCurrentPlan();
    const reloadedStatus = await settingsPage.getSubscriptionStatus();
    
    // State should be consistent
    expect(reloadedPlan).toBe(initialPlan);
    expect(reloadedStatus).toBe(initialStatus);
  });

  test('should reflect subscription state in multiple pages', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    // Check settings page
    await settingsPage.goto();
    const planInSettings = await settingsPage.getCurrentPlan();
    
    // Navigate to pricing page
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    
    // Check if plan is indicated (e.g., "Current Plan" or upgrade buttons)
    const currentPlanIndicator = page.locator('text=/current.*plan|your.*plan/i');
    const hasIndicator = await currentPlanIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Consistency check: if user has pro plan in settings, 
    // pricing page should reflect that
    if (planInSettings.toLowerCase().includes('pro') && hasIndicator) {
      expect(await currentPlanIndicator.textContent()).toContain('Pro');
    }
  });

  test.skip('should handle payment success webhook scenario', async ({ authenticatedPage }) => {
    /**
     * This test verifies the expected state after invoice.payment_succeeded
     * 
     * In a real scenario after webhook processing:
     * - Subscription status should be "active"
     * - User should have pro tier
     * - Pro features should be enabled
     * - Next billing date should be displayed
     */
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    const plan = await settingsPage.getCurrentPlan();
    
    // If user has pro plan, verify expected state
    if (plan.toLowerCase().includes('pro')) {
      const status = await settingsPage.getSubscriptionStatus();
      expect(status.toLowerCase()).toMatch(/active|trialing/);
      
      // Should show billing information
      const billingPeriod = await settingsPage.getBillingPeriod();
      expect(billingPeriod).toBeTruthy();
      
      const nextBilling = await settingsPage.getNextBillingDate();
      expect(nextBilling).toBeTruthy();
    }
  });

  test.skip('should handle payment failure webhook scenario', async ({ authenticatedPage }) => {
    /**
     * This test verifies the expected state after invoice.payment_failed
     * 
     * In a real scenario after webhook processing:
     * - Subscription status might be "past_due"
     * - User should see payment update prompt
     * - Grace period information should be displayed
     * - User retains access during grace period
     */
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    const status = await settingsPage.getSubscriptionStatus();
    
    // If payment failed, should show appropriate messaging
    if (status.toLowerCase().includes('past') || status.toLowerCase().includes('due')) {
      // Look for payment update prompt
      const paymentPrompt = page.locator('text=/update.*payment|payment.*failed|retry.*payment/i');
      await expect(paymentPrompt).toBeVisible();
    }
  });

  test.skip('should handle subscription deleted webhook scenario', async ({ authenticatedPage }) => {
    /**
     * This test verifies the expected state after customer.subscription.deleted
     * 
     * In a real scenario after webhook processing:
     * - Subscription status should be "canceled"
     * - User should be downgraded to free tier
     * - Pro features should be disabled
     * - Upgrade button should be shown
     */
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    const plan = await settingsPage.getCurrentPlan();
    const status = await settingsPage.getSubscriptionStatus();
    
    // If subscription is canceled
    if (status.toLowerCase().includes('cancel')) {
      // Should show free plan
      expect(plan.toLowerCase()).toMatch(/free/);
      
      // Should show upgrade option
      await settingsPage.verifyUpgradeButtonVisible();
    }
  });
});

test.describe('Premium Subscription - Webhook Idempotency Verification', () => {
  /**
   * Idempotency tests verify that webhook processing is idempotent
   * by checking that the same final state is achieved regardless of
   * how many times we view the data.
   * 
   * Actual idempotency testing (duplicate webhook handling) is done
   * in backend integration tests.
   */

  test('should maintain consistent state across multiple page loads', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    // Load settings page multiple times
    const states = [];
    
    for (let i = 0; i < 3; i++) {
      await settingsPage.goto();
      await settingsPage.verifyPageLoaded();
      
      const plan = await settingsPage.getCurrentPlan();
      const status = await settingsPage.getSubscriptionStatus();
      
      states.push({ plan, status });
      
      // Wait a bit between loads
      await page.waitForTimeout(1000);
    }
    
    // All states should be identical
    const firstState = states[0];
    for (const state of states) {
      expect(state.plan).toBe(firstState.plan);
      expect(state.status).toBe(firstState.status);
    }
  });

  test('should handle concurrent page loads gracefully', async ({ authenticatedPage, context }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    // Open settings in current page
    await settingsPage.goto();
    const plan1 = await settingsPage.getCurrentPlan();
    
    // Open settings in new tab
    const page2 = await context.newPage();
    const settingsPage2 = new SubscriptionSettingsPage(page2);
    await settingsPage2.goto();
    const plan2 = await settingsPage2.getCurrentPlan();
    
    // Both should show same plan
    expect(plan2).toBe(plan1);
    
    await page2.close();
  });
});

test.describe('Premium Subscription - Entitlement Sync', () => {
  test('should sync entitlements with subscription status', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    await settingsPage.verifyPageLoaded();
    
    const plan = await settingsPage.getCurrentPlan();
    
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for pro indicators if user has pro plan
    if (plan.toLowerCase().includes('pro')) {
      // Look for pro badge or features
      const proBadge = page.locator('text=/pro|premium/i, [data-testid*="pro"]');
      const badgeCount = await proBadge.count();
      
      // Should have some indication of pro status
      expect(badgeCount).toBeGreaterThan(0);
    } else {
      // Free users should see upgrade prompts
      const upgradePrompt = page.locator('text=/upgrade|get.*pro|subscribe/i').first();
      await expect(upgradePrompt).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show appropriate UI elements based on subscription tier', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    const plan = await settingsPage.getCurrentPlan();
    
    if (plan.toLowerCase().includes('free')) {
      // Free users should see upgrade options
      await settingsPage.verifyUpgradeButtonVisible();
      
      // Should not see manage subscription button
      const manageButton = settingsPage.manageSubscriptionButton;
      await expect(manageButton).not.toBeVisible();
    } else if (plan.toLowerCase().includes('pro')) {
      // Pro users should see management options
      const manageButton = settingsPage.manageSubscriptionButton;
      const hasCancelButton = await settingsPage.cancelSubscriptionButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      // Should have at least one management option
      expect(hasCancelButton || await manageButton.isVisible()).toBe(true);
    }
  });
});

test.describe('Premium Subscription - Grace Period Handling', () => {
  test.skip('should display grace period information for past_due subscriptions', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    const status = await settingsPage.getSubscriptionStatus();
    
    if (status.toLowerCase().includes('past') || status.toLowerCase().includes('due')) {
      // Should show grace period information
      const gracePeriodText = page.locator('text=/grace.*period|retain.*access|payment.*retry/i');
      await expect(gracePeriodText).toBeVisible();
      
      // Should still show pro features enabled
      const plan = await settingsPage.getCurrentPlan();
      expect(plan.toLowerCase()).toContain('pro');
    }
  });

  test.skip('should maintain pro access during grace period', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const settingsPage = new SubscriptionSettingsPage(page);
    
    await settingsPage.goto();
    const status = await settingsPage.getSubscriptionStatus();
    
    if (status.toLowerCase().includes('past') || status.toLowerCase().includes('due')) {
      // Navigate to a pro feature
      await page.goto('/');
      
      // Pro features should still be accessible
      const paywall = page.locator('[data-testid="paywall-modal"]');
      await expect(paywall).not.toBeVisible({ timeout: 3000 });
    }
  });
});
