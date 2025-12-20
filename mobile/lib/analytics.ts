/**
 * Mobile Analytics Module
 * 
 * Simplified analytics tracking for React Native mobile app.
 * Uses AsyncStorage for consent management and lightweight tracking.
 * 
 * Note: For full PostHog React Native integration, install posthog-react-native:
 *   npm install posthog-react-native
 * 
 * For now, this provides a minimal implementation that can be extended.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Re-export event schema from shared types
export {
  AuthEvents,
  SubmissionEvents,
  EngagementEvents,
  PremiumEvents,
  NavigationEvents,
  SettingsEvents,
  ErrorEvents,
  PerformanceEvents,
} from '../../../frontend/src/lib/analytics/events';

export type {
  EventName,
  EventProperties,
  BaseEventProperties,
  UserProperties,
} from '../../../frontend/src/lib/analytics/events';

/**
 * Analytics configuration
 */
interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  userId?: string;
  userProperties?: Record<string, string | number | boolean | undefined>;
}

const CONSENT_STORAGE_KEY = '@clipper:analytics_consent';
const ANALYTICS_ENABLED = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true';

let config: AnalyticsConfig = {
  enabled: false,
  debug: __DEV__,
};

/**
 * Initialize analytics
 * Should be called on app startup after checking consent
 */
export async function initAnalytics(): Promise<void> {
  if (!ANALYTICS_ENABLED) {
    if (config.debug) {
      console.log('[Analytics] Disabled via environment variable');
    }
    return;
  }
  
  try {
    const consentStr = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    const consent = consentStr ? JSON.parse(consentStr) : { analytics: false };
    
    if (consent.analytics) {
      config.enabled = true;
      if (config.debug) {
        console.log('[Analytics] Initialized with user consent');
      }
    }
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
  }
}

/**
 * Enable analytics tracking
 */
export async function enableAnalytics(): Promise<void> {
  config.enabled = true;
  try {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ analytics: true }));
    if (config.debug) {
      console.log('[Analytics] Enabled');
    }
  } catch (error) {
    console.error('[Analytics] Failed to enable:', error);
  }
}

/**
 * Disable analytics tracking
 */
export async function disableAnalytics(): Promise<void> {
  config.enabled = false;
  try {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ analytics: false }));
    if (config.debug) {
      console.log('[Analytics] Disabled');
    }
  } catch (error) {
    console.error('[Analytics] Failed to disable:', error);
  }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return config.enabled;
}

/**
 * Identify a user
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, string | number | boolean | undefined>
): void {
  if (!config.enabled) {
    if (config.debug) {
      console.log('[Analytics] Identify skipped (disabled):', { userId, properties });
    }
    return;
  }
  
  config.userId = userId;
  config.userProperties = properties;
  
  if (config.debug) {
    console.log('[Analytics] User identified:', { userId, properties });
  }
  
  // TODO: Integrate with PostHog React Native when installed
  // import { posthog } from 'posthog-react-native';
  // posthog.identify(userId, properties);
}

/**
 * Reset user identity
 */
export function resetUser(): void {
  config.userId = undefined;
  config.userProperties = undefined;
  
  if (config.debug) {
    console.log('[Analytics] User reset');
  }
  
  // TODO: Integrate with PostHog React Native when installed
  // import { posthog } from 'posthog-react-native';
  // posthog.reset();
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!config.enabled) {
    if (config.debug) {
      console.log('[Analytics] Event skipped (disabled):', eventName, properties);
    }
    return;
  }
  
  const enrichedProperties = {
    ...properties,
    user_id: config.userId,
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  };
  
  if (config.debug) {
    console.log('[Analytics] Event tracked:', eventName, enrichedProperties);
  }
  
  // TODO: Integrate with PostHog React Native when installed
  // import { posthog } from 'posthog-react-native';
  // posthog.capture(eventName, enrichedProperties);
}

/**
 * Track a page/screen view
 */
export function trackScreenView(screenName: string, properties?: Record<string, unknown>): void {
  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
  });
}

/**
 * Track an error
 */
export function trackError(
  error: Error,
  context?: {
    errorType?: string;
    errorCode?: string;
  }
): void {
  trackEvent('error_occurred', {
    error_type: context?.errorType || error.name,
    error_message: error.message,
    error_stack: error.stack,
    error_code: context?.errorCode,
  });
}
