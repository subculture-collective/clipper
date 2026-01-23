/**
 * Consent Banner Utilities
 *
 * Utilities for managing consent preferences in E2E tests
 */

import { Page } from '@playwright/test';

/**
 * Consent preferences type
 */
export interface ConsentPreferences {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    advertising: boolean;
    updatedAt: string | null;
    expiresAt: string | null;
}

/**
 * Default test consent preferences
 * All non-essential consent disabled for privacy-respecting tests
 */
const DEFAULT_TEST_CONSENT: ConsentPreferences = {
    essential: true,
    functional: false,
    analytics: false,
    advertising: false,
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * Inject consent preferences into browser localStorage
 * This prevents the consent banner from showing up during tests
 *
 * @param page - Playwright page
 * @param preferences - Consent preferences to inject (defaults to privacy-respecting)
 *
 * @example
 * ```typescript
 * test('submit form', async ({ page }) => {
 *   await injectConsentPreferences(page);
 *   await page.goto('/submit');
 *   // Consent banner won't appear
 * });
 * ```
 */
export async function injectConsentPreferences(
    page: Page,
    preferences: Partial<ConsentPreferences> = {},
): Promise<void> {
    const consentPrefs: ConsentPreferences = {
        ...DEFAULT_TEST_CONSENT,
        ...preferences,
    };

    // Must be called before navigating to the page
    await page.addInitScript(prefs => {
        localStorage.setItem(
            'clipper_consent_preferences',
            JSON.stringify(prefs),
        );
    }, consentPrefs);
}

/**
 * Clear consent preferences from localStorage
 * Useful for testing the consent banner appearance
 *
 * @param page - Playwright page
 *
 * @example
 * ```typescript
 * test('show consent banner', async ({ page }) => {
 *   await clearConsentPreferences(page);
 *   await page.goto('/');
 *   // Consent banner should appear
 * });
 * ```
 */
export async function clearConsentPreferences(page: Page): Promise<void> {
    await page.evaluate(() => {
        localStorage.removeItem('clipper_consent_preferences');
    });
}

/**
 * Accept all consent preferences
 * Useful for tests that need full tracking/analytics enabled
 *
 * @param page - Playwright page
 *
 * @example
 * ```typescript
 * test('analytics tracking', async ({ page }) => {
 *   await acceptAllConsent(page);
 *   await page.goto('/');
 *   // All consent categories enabled
 * });
 * ```
 */
export async function acceptAllConsent(
    page: Page,
    preferences: Partial<ConsentPreferences> = {},
): Promise<void> {
    const consentPrefs: ConsentPreferences = {
        ...DEFAULT_TEST_CONSENT,
        functional: true,
        analytics: true,
        advertising: true,
        ...preferences,
    };

    await injectConsentPreferences(page, consentPrefs);
}

/**
 * Reject all consent preferences
 * Useful for testing privacy-respecting scenarios
 *
 * @param page - Playwright page
 *
 * @example
 * ```typescript
 * test('privacy mode', async ({ page }) => {
 *   await rejectAllConsent(page);
 *   await page.goto('/');
 *   // Only essential cookies enabled
 * });
 * ```
 */
export async function rejectAllConsent(
    page: Page,
    preferences: Partial<ConsentPreferences> = {},
): Promise<void> {
    const consentPrefs: ConsentPreferences = {
        ...DEFAULT_TEST_CONSENT,
        functional: false,
        analytics: false,
        advertising: false,
        ...preferences,
    };

    await injectConsentPreferences(page, consentPrefs);
}
