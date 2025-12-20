/**
 * useAnalytics Hook
 * 
 * React hook for tracking analytics events in components.
 * Provides convenient methods for tracking common user actions.
 */

import { useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import {
  trackEvent,
  trackPageView,
  identifyUser,
  resetUser,
  AuthEvents,
  SubmissionEvents,
  EngagementEvents,
  PremiumEvents,
  NavigationEvents,
  SettingsEvents,
  type EventProperties,
  type UserProperties,
} from '../lib/analytics';

/**
 * Hook for tracking analytics events
 */
export function useAnalytics() {
  const { user } = useAuth();
  const location = useLocation();
  
  // Track page views on route changes
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);
  
  // Identify user when logged in
  useEffect(() => {
    if (user) {
      const userProperties: UserProperties = {
        user_id: user.id,
        username: user.username,
        is_premium: user.is_premium || false,
        premium_tier: user.premium_tier,
        signup_date: user.created_at,
        is_verified: user.is_verified || false,
      };
      identifyUser(user.id, userProperties);
    } else {
      resetUser();
    }
  }, [user]);
  
  // Authentication tracking
  const trackSignup = useCallback((method: 'twitch' | 'email' | 'oauth' = 'twitch') => {
    trackEvent(AuthEvents.SIGNUP_COMPLETED, { method });
  }, []);
  
  const trackLogin = useCallback((method: 'twitch' | 'email' | 'oauth' = 'twitch') => {
    trackEvent(AuthEvents.LOGIN_COMPLETED, { method });
  }, []);
  
  const trackLogout = useCallback(() => {
    trackEvent(AuthEvents.LOGOUT, {});
  }, []);
  
  // Submission tracking
  const trackSubmissionView = useCallback((clipId: string, properties?: EventProperties) => {
    trackEvent(SubmissionEvents.SUBMISSION_VIEWED, {
      clip_id: clipId,
      ...properties,
    });
  }, []);
  
  const trackSubmissionCreate = useCallback((clipId: string, properties?: EventProperties) => {
    trackEvent(SubmissionEvents.SUBMISSION_CREATE_COMPLETED, {
      clip_id: clipId,
      ...properties,
    });
  }, []);
  
  const trackSubmissionEdit = useCallback((clipId: string) => {
    trackEvent(SubmissionEvents.SUBMISSION_EDIT_COMPLETED, {
      clip_id: clipId,
    });
  }, []);
  
  const trackSubmissionDelete = useCallback((clipId: string) => {
    trackEvent(SubmissionEvents.SUBMISSION_DELETE_COMPLETED, {
      clip_id: clipId,
    });
  }, []);
  
  const trackSubmissionShare = useCallback((clipId: string, platform: string) => {
    trackEvent(SubmissionEvents.SUBMISSION_SHARED, {
      clip_id: clipId,
      share_platform: platform,
    });
  }, []);
  
  // Engagement tracking
  const trackUpvote = useCallback((clipId: string) => {
    trackEvent(EngagementEvents.UPVOTE_CLICKED, {
      target_id: clipId,
      target_type: 'clip',
    });
  }, []);
  
  const trackDownvote = useCallback((clipId: string) => {
    trackEvent(EngagementEvents.DOWNVOTE_CLICKED, {
      target_id: clipId,
      target_type: 'clip',
    });
  }, []);
  
  const trackComment = useCallback((clipId: string) => {
    trackEvent(EngagementEvents.COMMENT_CREATE_COMPLETED, {
      target_id: clipId,
      target_type: 'clip',
    });
  }, []);
  
  const trackFollow = useCallback((targetType: 'creator' | 'user' | 'community', targetId?: string) => {
    trackEvent(EngagementEvents.FOLLOW_CLICKED, {
      target_type: targetType,
      target_id: targetId,
    });
  }, []);
  
  const trackSearch = useCallback((query: string, resultsCount: number) => {
    trackEvent(EngagementEvents.SEARCH_PERFORMED, {
      search_query: query,
      search_results_count: resultsCount,
    });
  }, []);
  
  const trackFavorite = useCallback((clipId: string, added: boolean) => {
    trackEvent(added ? EngagementEvents.FAVORITE_ADDED : EngagementEvents.FAVORITE_REMOVED, {
      target_id: clipId,
      target_type: 'clip',
    });
  }, []);
  
  // Premium tracking
  const trackPricingView = useCallback(() => {
    trackEvent(PremiumEvents.PRICING_PAGE_VIEWED, {});
  }, []);
  
  const trackCheckoutStart = useCallback((tier: 'pro' | 'premium', billingPeriod: 'monthly' | 'yearly') => {
    trackEvent(PremiumEvents.CHECKOUT_STARTED, {
      tier,
      billing_period: billingPeriod,
    });
  }, []);
  
  const trackSubscribe = useCallback((tier: 'pro' | 'premium', billingPeriod: 'monthly' | 'yearly') => {
    trackEvent(PremiumEvents.SUBSCRIPTION_CREATED, {
      tier,
      billing_period: billingPeriod,
    });
  }, []);
  
  const trackSubscriptionCancel = useCallback((reason?: string) => {
    trackEvent(PremiumEvents.SUBSCRIPTION_CANCELLED, {
      cancel_reason: reason,
    });
  }, []);
  
  const trackPaywallView = useCallback((feature: string) => {
    trackEvent(PremiumEvents.PAYWALL_VIEWED, {
      feature,
    });
  }, []);
  
  // Navigation tracking
  const trackFeatureClick = useCallback((featureName: string) => {
    trackEvent(NavigationEvents.FEATURE_CLICKED, {
      feature_name: featureName,
    });
  }, []);
  
  const trackNavLinkClick = useCallback((linkText: string, linkUrl: string) => {
    trackEvent(NavigationEvents.NAV_LINK_CLICKED, {
      link_text: linkText,
      link_url: linkUrl,
    });
  }, []);
  
  // Settings tracking
  const trackThemeChange = useCallback((newTheme: string) => {
    trackEvent(SettingsEvents.THEME_CHANGED, {
      setting_name: 'theme',
      new_value: newTheme,
    });
  }, []);
  
  const trackConsentUpdate = useCallback((consentType: string, value: boolean) => {
    trackEvent(SettingsEvents.CONSENT_UPDATED, {
      consent_type: consentType as 'essential' | 'functional' | 'analytics' | 'advertising',
      new_value: value.toString(),
    });
  }, []);
  
  return {
    // Authentication
    trackSignup,
    trackLogin,
    trackLogout,
    
    // Submissions
    trackSubmissionView,
    trackSubmissionCreate,
    trackSubmissionEdit,
    trackSubmissionDelete,
    trackSubmissionShare,
    
    // Engagement
    trackUpvote,
    trackDownvote,
    trackComment,
    trackFollow,
    trackSearch,
    trackFavorite,
    
    // Premium
    trackPricingView,
    trackCheckoutStart,
    trackSubscribe,
    trackSubscriptionCancel,
    trackPaywallView,
    
    // Navigation
    trackFeatureClick,
    trackNavLinkClick,
    
    // Settings
    trackThemeChange,
    trackConsentUpdate,
    
    // Generic
    trackEvent,
  };
}
