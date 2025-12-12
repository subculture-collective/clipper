/**
 * PostHog Analytics Integration
 * 
 * Provides PostHog tracking functionality with privacy-first approach.
 * Respects user consent preferences and DNT signals.
 * 
 * Note: This is a lightweight implementation that loads PostHog dynamically
 * when consent is given, without adding it as a dependency.
 */

// PostHog configuration
export const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY || '';
export const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
const ANALYTICS_ENABLED = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';

// Track if PostHog is initialized
let posthogInitialized = false;
let posthogInstance: unknown = null;

/**
 * Dynamically loads PostHog script
 * 
 * SECURITY NOTE: This implementation loads PostHog from jsDelivr CDN without
 * Subresource Integrity (SRI) verification for development convenience and
 * automatic updates. For production environments with strict security requirements,
 * consider one of the following alternatives:
 * 
 * 1. Self-host the PostHog library:
 *    - Download posthog-js from npm
 *    - Bundle it with your application or serve from your domain
 *    - This provides full control and eliminates third-party dependencies
 * 
 * 2. Add SRI verification:
 *    - Generate hash: openssl dgst -sha384 -binary posthog.min.js | openssl base64 -A
 *    - Add integrity="sha384-HASH" and crossOrigin="anonymous" to script tag
 *    - Note: Hash must be updated whenever PostHog version changes
 * 
 * 3. Use Content Security Policy (CSP):
 *    - Add script-src directive to allow only trusted CDN sources
 *    - Example: script-src 'self' https://cdn.jsdelivr.net
 * 
 * Current implementation prioritizes:
 * - Lightweight integration without build dependencies
 * - Automatic version updates via CDN
 * - Lazy loading only when consent is granted
 * 
 * Risk assessment: Low-Medium
 * - PostHog only loads after explicit user consent
 * - jsDelivr is a reputable CDN with good security track record
 * - Analytics data is non-critical (no PII or sensitive operations)
 */
function loadPostHogScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="posthog"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://cdn.jsdelivr.net/npm/posthog-js@1/dist/array.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PostHog script'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize PostHog Analytics
 * Should be called after user grants analytics consent
 */
export async function initPostHog(): Promise<void> {
  if (!ANALYTICS_ENABLED) {
    console.log('PostHog is disabled via VITE_ENABLE_ANALYTICS');
    return;
  }

  if (!POSTHOG_API_KEY) {
    console.log('PostHog is not configured (no API key)');
    return;
  }

  if (posthogInitialized) {
    console.log('PostHog already initialized');
    return;
  }

  try {
    // Load PostHog script
    await loadPostHogScript();

    // Initialize PostHog using the global posthog object
    const posthog = (window as { posthog?: unknown }).posthog;
    if (!posthog || typeof posthog !== 'object') {
      console.error('PostHog script loaded but posthog object not found');
      return;
    }

    // Initialize with privacy-preserving settings
    (posthog as { init?: (key: string, options: Record<string, unknown>) => void }).init?.(POSTHOG_API_KEY, {
      api_host: POSTHOG_HOST,
      loaded: (ph: unknown) => {
        posthogInstance = ph;
        posthogInitialized = true;
        console.log('PostHog initialized');
      },
      capture_pageview: false, // We'll manually track page views
      opt_out_capturing_by_default: false,
      respect_dnt: true,
      autocapture: false, // Disable autocapture for better privacy
      disable_session_recording: true, // Disable session recording
      secure_cookie: true,
      persistence: 'localStorage',
    });
  } catch (error) {
    console.error('Failed to initialize PostHog:', error);
  }
}

/**
 * Disable PostHog Analytics
 * Respects user's opt-out preference
 */
export function disablePostHog(): void {
  if (!posthogInstance) return;

  try {
    const posthog = posthogInstance as { opt_out_capturing?: () => void };
    posthog.opt_out_capturing?.();
    posthogInitialized = false;
    console.log('PostHog disabled');
  } catch (error) {
    console.error('Failed to disable PostHog:', error);
  }
}

/**
 * Enable PostHog Analytics
 * Re-enables tracking if user grants consent
 */
export async function enablePostHog(): Promise<void> {
  if (!posthogInstance) {
    await initPostHog();
    return;
  }

  try {
    const posthog = posthogInstance as { opt_in_capturing?: () => void };
    posthog.opt_in_capturing?.();
    posthogInitialized = true;
    console.log('PostHog enabled');
  } catch (error) {
    console.error('Failed to enable PostHog:', error);
  }
}

/**
 * Get PostHog instance
 */
function getPostHog(): { capture?: (event: string, properties?: Record<string, unknown>) => void } | null {
  if (!posthogInitialized || !posthogInstance) return null;
  return posthogInstance as { capture?: (event: string, properties?: Record<string, unknown>) => void };
}

/**
 * Track a page view
 */
export function trackPostHogPageView(path: string, title?: string): void {
  const posthog = getPostHog();
  if (!posthog?.capture) return;

  posthog.capture('$pageview', {
    $current_url: window.location.href,
    path,
    title: title || document.title,
  });
}

/**
 * Track a custom event
 */
export function trackPostHogEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const posthog = getPostHog();
  if (!posthog?.capture) return;

  posthog.capture(eventName, properties);
}

/**
 * Identify a user (when logged in)
 */
export function identifyPostHogUser(userId: string, traits?: Record<string, unknown>): void {
  if (!posthogInstance) return;

  try {
    const posthog = posthogInstance as { identify?: (id: string, traits?: Record<string, unknown>) => void };
    posthog.identify?.(userId, traits);
  } catch (error) {
    console.error('Failed to identify PostHog user:', error);
  }
}

/**
 * Reset PostHog user identity (on logout)
 */
export function resetPostHogUser(): void {
  if (!posthogInstance) return;

  try {
    const posthog = posthogInstance as { reset?: () => void };
    posthog.reset?.();
  } catch (error) {
    console.error('Failed to reset PostHog user:', error);
  }
}
