/**
 * Stripe Test Utilities
 * 
 * Helper functions for testing Stripe integration in E2E tests
 * Uses Stripe test cards and test mode API keys
 */

import { Page, expect } from '@playwright/test';

/**
 * Stripe Test Card Numbers
 * @see https://stripe.com/docs/testing#cards
 */
export const STRIPE_TEST_CARDS = {
  // Successful payments
  SUCCESS: '4242424242424242',
  SUCCESS_VISA: '4242424242424242',
  SUCCESS_MASTERCARD: '5555555555554444',
  
  // Payment requires authentication (3D Secure)
  REQUIRES_AUTH: '4000002500003155',
  
  // Failed payments
  DECLINED: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  EXPIRED_CARD: '4000000000000069',
  PROCESSING_ERROR: '4000000000000119',
  INCORRECT_CVC: '4000000000000127',
} as const;

/**
 * Default test card details
 */
export const TEST_CARD_DETAILS = {
  number: STRIPE_TEST_CARDS.SUCCESS,
  expiry: '12/99', // Far future expiry
  cvc: '123',
  zip: '12345',
} as const;

/**
 * Default test price IDs (fallback when not configured)
 */
export const TEST_PRICE_IDS = {
  monthly: 'price_test_monthly',
  yearly: 'price_test_yearly',
} as const;

/**
 * Stripe Checkout iframe selectors
 * Using specific title matches for Stripe Elements iframes
 */
const STRIPE_IFRAME_SELECTORS = {
  cardNumber: 'iframe[title="Secure card number input frame"]',
  expiry: 'iframe[title="Secure expiration date input frame"]',
  cvc: 'iframe[title="Secure CVC input frame"]',
} as const;

/**
 * Webhook event types for subscription lifecycle
 */
export const WEBHOOK_EVENTS = {
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAID: 'invoice.payment_succeeded',
  INVOICE_FAILED: 'invoice.payment_failed',
  PAYMENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_FAILED: 'payment_intent.payment_failed',
} as const;

/**
 * Wait for Stripe Checkout iframe to load
 */
export async function waitForStripeCheckout(page: Page, timeout: number = 10000) {
  try {
    // Wait for redirect to Stripe Checkout (checkout.stripe.com)
    await page.waitForURL(/checkout\.stripe\.com/, { timeout });
    // Wait for Stripe checkout form to be ready
    await page.waitForLoadState('networkidle', { timeout });
    return true;
  } catch (error) {
     
    console.warn('Stripe Checkout did not load:', error);
    return false;
  }
}

/**
 * Fill Stripe Checkout form with test card
 * NOTE: This only works if Stripe Checkout is in test mode
 */
export async function fillStripeCheckoutForm(
  page: Page,
  cardNumber: string = TEST_CARD_DETAILS.number,
  options: {
    expiry?: string;
    cvc?: string;
    zip?: string;
    email?: string;
  } = {}
) {
  const {
    expiry = TEST_CARD_DETAILS.expiry,
    cvc = TEST_CARD_DETAILS.cvc,
    zip = TEST_CARD_DETAILS.zip,
    email,
  } = options;

  // Wait for Stripe form to be ready
  await page.waitForLoadState('networkidle');

  // Fill email if required
  if (email) {
    const emailField = page.locator('input[type="email"], input[name="email"]');
    try {
      const emailVisible = await emailField.isVisible({ timeout: 2000 });
      if (emailVisible) {
        await emailField.fill(email);
      }
    } catch (error) {
      // Email field may not be required in all Stripe checkout flows
       
      console.debug('Stripe checkout: Email field not visible or required:', error);
    }
  }

  // Fill card number
  const cardNumberField = page.frameLocator(STRIPE_IFRAME_SELECTORS.cardNumber).locator('input[name="cardnumber"], input[placeholder*="card number"]');
  await cardNumberField.fill(cardNumber);

  // Fill expiry
  const expiryField = page.frameLocator(STRIPE_IFRAME_SELECTORS.expiry).locator('input[name="exp-date"], input[placeholder*="MM"]');
  await expiryField.fill(expiry);

  // Fill CVC
  const cvcField = page.frameLocator(STRIPE_IFRAME_SELECTORS.cvc).locator('input[name="cvc"], input[placeholder*="CVC"]');
  await cvcField.fill(cvc);

  // Fill ZIP if visible
  const zipField = page.locator('input[name="postal"], input[name="zip"], input[placeholder*="ZIP"]');
  try {
    const zipVisible = await zipField.isVisible({ timeout: 2000 });
    if (zipVisible) {
      await zipField.fill(zip);
    }
  } catch (error) {
    // ZIP field is optional in Stripe checkout - log but continue
     
    console.debug('Stripe checkout: ZIP field not visible or required:', error);
  }
}

/**
 * Submit Stripe Checkout form
 */
export async function submitStripeCheckout(page: Page) {
  const submitButton = page.getByRole('button', { name: /subscribe|pay|submit/i });
  await submitButton.click();
  
  // Wait for processing
  await page.waitForLoadState('networkidle', { timeout: 30000 });
}

/**
 * Complete Stripe Checkout flow with test card
 * Returns true if checkout succeeds, false if it fails
 */
export async function completeStripeCheckout(
  page: Page,
  cardNumber: string = STRIPE_TEST_CARDS.SUCCESS,
  options: {
    expectSuccess?: boolean;
    email?: string;
  } = {}
) {
  const { expectSuccess = true, email } = options;

  // Wait for Stripe Checkout to load
  const checkoutLoaded = await waitForStripeCheckout(page);
  if (!checkoutLoaded) {
    throw new Error('Stripe Checkout did not load');
  }

  // Fill form
  await fillStripeCheckoutForm(page, cardNumber, { email });

  // Submit
  await submitStripeCheckout(page);

  if (expectSuccess) {
    // Wait for success redirect
    await page.waitForURL(/success|subscription/i, { timeout: 30000 });
    return true;
  } else {
    // Wait for error message
    await page.locator('text=/declined|failed|error/i').waitFor({ state: 'visible', timeout: 10000 });
    return false;
  }
}

/**
 * Mock a Stripe webhook event
 * Sends webhook to backend for testing
 * 
 * NOTE: This creates webhooks without proper Stripe signatures.
 * This is acceptable for E2E testing but should NEVER be used in production.
 * Production webhook handling must always validate Stripe signatures.
 */
export async function sendMockWebhook(
  page: Page,
  eventType: string,
  eventData: Record<string, unknown>,
  options: {
    baseUrl?: string;
    webhookSecret?: string;
  } = {}
) {
  // Runtime check: Ensure this is only used in test environments
  const isTestEnv = process.env.NODE_ENV === 'test' || 
                    process.env.CI === 'true' || 
                    process.env.PLAYWRIGHT_TEST === 'true';
  
  if (!isTestEnv) {
    throw new Error('sendMockWebhook should only be used in test environments. Set NODE_ENV=test or PLAYWRIGHT_TEST=true.');
  }

  const { 
    baseUrl = process.env.VITE_API_URL ?? process.env.BASE_URL ?? 'http://127.0.0.1:8080', 
    webhookSecret 
  } = options;

  const webhookPayload = {
    id: `evt_test_${Date.now()}`,
    type: eventType,
    data: {
      object: eventData,
    },
    created: Math.floor(Date.now() / 1000),
  };

  // NOTE: In a real scenario, you'd use Stripe signature
  // For E2E testing, we assume webhook endpoint accepts test events
  const response = await page.request.post(`${baseUrl}/api/v1/webhooks/stripe`, {
    data: webhookPayload,
    headers: {
      'Content-Type': 'application/json',
      ...(webhookSecret && { 'Stripe-Signature': `test_signature_${Date.now()}` }),
    },
  });

  return response;
}

/**
 * Create test subscription event data
 */
export function createTestSubscriptionData(
  userId: string,
  options: {
    status?: 'active' | 'trialing' | 'past_due' | 'canceled';
    priceId?: string;
    cancelAtPeriodEnd?: boolean;
  } = {}
) {
  const {
    status = 'active',
    priceId = 'price_test_monthly',
    cancelAtPeriodEnd = false,
  } = options;

  const now = Math.floor(Date.now() / 1000);
  const periodEnd = now + (30 * 24 * 60 * 60); // 30 days from now

  return {
    id: `sub_test_${Date.now()}`,
    customer: `cus_test_${userId}`,
    status,
    items: {
      data: [
        {
          id: `si_test_${Date.now()}`,
          price: {
            id: priceId,
            product: 'prod_test_pro',
          },
        },
      ],
    },
    current_period_start: now,
    current_period_end: periodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
  };
}

/**
 * Wait for subscription status to update in UI
 */
export async function waitForSubscriptionStatus(
  page: Page,
  expectedStatus: string,
  timeout: number = 10000
) {
  const statusElement = page.locator(`text=/status.*${expectedStatus}/i`);
  await expect(statusElement).toBeVisible({ timeout });
}

/**
 * Verify Stripe test mode indicator
 */
export async function verifyStripeTestMode(page: Page) {
  // Look for test mode indicator in Stripe Checkout
  const testModeIndicator = page.locator('text=/test.*mode|test.*environment/i');
  await expect(testModeIndicator).toBeVisible({ timeout: 5000 });
}

/**
 * Get Stripe price IDs from environment
 */
export function getStripePriceIds() {
  return {
    monthly: process.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID || TEST_PRICE_IDS.monthly,
    yearly: process.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID || TEST_PRICE_IDS.yearly,
  };
}

/**
 * Verify pro features are accessible
 */
export async function verifyProFeaturesEnabled(page: Page) {
  // Check that paywall is not shown
  const paywall = page.locator('[data-testid="paywall-modal"], text=/upgrade.*to.*pro/i');
  await expect(paywall).not.toBeVisible({ timeout: 5000 });
  
  return true;
}

/**
 * Verify pro features are NOT accessible (user is free tier)
 */
export async function verifyProFeaturesDisabled(page: Page) {
  // Attempt to access a pro feature and verify paywall appears
  // This is implementation-specific and may need adjustment
  const upgradePrompt = page.locator('text=/upgrade|subscribe|get.*pro/i').first();
  await expect(upgradePrompt).toBeVisible({ timeout: 5000 });
  
  return true;
}
