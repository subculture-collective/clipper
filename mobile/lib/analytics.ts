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

/**
 * Event Categories
 * Mirrors the web event schema for consistency
 */
export const AuthEvents = {
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  SIGNUP_FAILED: 'signup_failed',
  LOGIN_STARTED: 'login_started',
  LOGIN_COMPLETED: 'login_completed',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  OAUTH_REDIRECT: 'oauth_redirect',
  OAUTH_CALLBACK: 'oauth_callback',
} as const;

export const SubmissionEvents = {
  SUBMISSION_VIEWED: 'submission_viewed',
  SUBMISSION_LIST_VIEWED: 'submission_list_viewed',
  SUBMISSION_CREATE_STARTED: 'submission_create_started',
  SUBMISSION_CREATE_COMPLETED: 'submission_create_completed',
  SUBMISSION_CREATE_FAILED: 'submission_create_failed',
  SUBMISSION_EDIT_STARTED: 'submission_edit_started',
  SUBMISSION_EDIT_COMPLETED: 'submission_edit_completed',
  SUBMISSION_EDIT_FAILED: 'submission_edit_failed',
  SUBMISSION_DELETE_STARTED: 'submission_delete_started',
  SUBMISSION_DELETE_COMPLETED: 'submission_delete_completed',
  SUBMISSION_DELETE_FAILED: 'submission_delete_failed',
  SUBMISSION_SHARE_CLICKED: 'submission_share_clicked',
  SUBMISSION_SHARED: 'submission_shared',
  SUBMISSION_SHARE_COPIED: 'submission_share_copied',
  SUBMISSION_PLAY_STARTED: 'submission_play_started',
  SUBMISSION_PLAY_COMPLETED: 'submission_play_completed',
  SUBMISSION_PLAY_PAUSED: 'submission_play_paused',
} as const;

export const EngagementEvents = {
  UPVOTE_CLICKED: 'upvote_clicked',
  DOWNVOTE_CLICKED: 'downvote_clicked',
  VOTE_REMOVED: 'vote_removed',
  COMMENT_CREATE_STARTED: 'comment_create_started',
  COMMENT_CREATE_COMPLETED: 'comment_create_completed',
  COMMENT_CREATE_FAILED: 'comment_create_failed',
  COMMENT_EDIT_STARTED: 'comment_edit_started',
  COMMENT_EDIT_COMPLETED: 'comment_edit_completed',
  COMMENT_DELETE_CLICKED: 'comment_delete_clicked',
  COMMENT_DELETE_COMPLETED: 'comment_delete_completed',
  COMMENT_REPLY_CLICKED: 'comment_reply_clicked',
  FOLLOW_CLICKED: 'follow_clicked',
  UNFOLLOW_CLICKED: 'unfollow_clicked',
  FAVORITE_ADDED: 'favorite_added',
  FAVORITE_REMOVED: 'favorite_removed',
  SEARCH_PERFORMED: 'search_performed',
  SEARCH_FILTER_APPLIED: 'search_filter_applied',
  SEARCH_RESULT_CLICKED: 'search_result_clicked',
  COMMUNITY_JOINED: 'community_joined',
  COMMUNITY_LEFT: 'community_left',
  COMMUNITY_CREATED: 'community_created',
  FEED_FOLLOWED: 'feed_followed',
  FEED_UNFOLLOWED: 'feed_unfollowed',
} as const;

export const PremiumEvents = {
  PRICING_PAGE_VIEWED: 'pricing_page_viewed',
  PRICING_TIER_CLICKED: 'pricing_tier_clicked',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_PAYMENT_INFO_ENTERED: 'checkout_payment_info_entered',
  CHECKOUT_COMPLETED: 'checkout_completed',
  CHECKOUT_FAILED: 'checkout_failed',
  CHECKOUT_CANCELLED: 'checkout_cancelled',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_RESUMED: 'subscription_resumed',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription_payment_failed',
  UPGRADE_MODAL_VIEWED: 'upgrade_modal_viewed',
  UPGRADE_CLICKED: 'upgrade_clicked',
  DOWNGRADE_CLICKED: 'downgrade_clicked',
  PAYWALL_VIEWED: 'paywall_viewed',
  PAYWALL_DISMISSED: 'paywall_dismissed',
  PAYWALL_UPGRADE_CLICKED: 'paywall_upgrade_clicked',
} as const;

export const NavigationEvents = {
  PAGE_VIEWED: 'page_viewed',
  SCREEN_VIEWED: 'screen_viewed',
  FEATURE_CLICKED: 'feature_clicked',
  NAV_LINK_CLICKED: 'nav_link_clicked',
  BACK_BUTTON_CLICKED: 'back_button_clicked',
  TAB_CLICKED: 'tab_clicked',
  SECTION_VIEWED: 'section_viewed',
  EXTERNAL_LINK_CLICKED: 'external_link_clicked',
} as const;

export const SettingsEvents = {
  PROFILE_VIEWED: 'profile_viewed',
  PROFILE_EDITED: 'profile_edited',
  AVATAR_CHANGED: 'avatar_changed',
  SETTINGS_VIEWED: 'settings_viewed',
  THEME_CHANGED: 'theme_changed',
  LANGUAGE_CHANGED: 'language_changed',
  NOTIFICATION_PREFERENCES_CHANGED: 'notification_preferences_changed',
  PRIVACY_SETTINGS_CHANGED: 'privacy_settings_changed',
  CONSENT_UPDATED: 'consent_updated',
  PASSWORD_CHANGE_STARTED: 'password_change_started',
  PASSWORD_CHANGE_COMPLETED: 'password_change_completed',
  EMAIL_CHANGE_STARTED: 'email_change_started',
  EMAIL_CHANGE_COMPLETED: 'email_change_completed',
  ACCOUNT_DELETED: 'account_deleted',
} as const;

export const ErrorEvents = {
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  NETWORK_ERROR: 'network_error',
  FORM_VALIDATION_ERROR: 'form_validation_error',
  FORM_SUBMISSION_ERROR: 'form_submission_error',
  VIDEO_PLAYBACK_ERROR: 'video_playback_error',
  IMAGE_LOAD_ERROR: 'image_load_error',
} as const;

export const PerformanceEvents = {
  PAGE_LOAD_TIME: 'page_load_time',
  API_RESPONSE_TIME: 'api_response_time',
  VIDEO_LOAD_TIME: 'video_load_time',
  SEARCH_RESPONSE_TIME: 'search_response_time',
} as const;

/**
 * Type definitions for events and properties
 */
export type EventName = string;
export type EventProperties = Record<string, unknown>;
export type BaseEventProperties = Record<string, unknown>;
export type UserProperties = Record<string, string | number | boolean | undefined>;

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
const ENV_TRUE = 'true';
const ANALYTICS_ENABLED = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === ENV_TRUE;

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
