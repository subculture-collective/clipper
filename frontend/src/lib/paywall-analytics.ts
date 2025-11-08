/**
 * Analytics tracking for premium subscription funnel
 * 
 * This module provides event tracking for the paywall and upgrade flow
 * to enable funnel analysis and conversion optimization.
 */

export interface PaywallEventData {
  /** Feature that triggered the paywall */
  feature?: string;
  /** Location in the app where event occurred */
  location?: string;
  /** Billing period selected (monthly/yearly) */
  billingPeriod?: 'monthly' | 'yearly';
  /** User ID if authenticated */
  userId?: string;
  /** Additional context */
  metadata?: Record<string, any>;
}

/**
 * Base analytics event structure
 */
interface AnalyticsEvent {
  event: string;
  timestamp: string;
  data: PaywallEventData;
}

/**
 * Analytics service for tracking subscription funnel events
 */
class PaywallAnalytics {
  private events: AnalyticsEvent[] = [];
  private debugMode: boolean = import.meta.env.DEV;

  /**
   * Track a generic paywall event
   */
  private track(eventName: string, data: PaywallEventData = {}): void {
    const event: AnalyticsEvent = {
      event: eventName,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        location: data.location || window.location.pathname,
      },
    };

    // Only store events in debug mode for inspection to prevent memory leaks
    if (this.debugMode) {
      this.events.push(event);
      console.log('[Paywall Analytics]', event);
    }

    // In production, send to analytics service (e.g., Google Analytics, Mixpanel, etc.)
    if (!import.meta.env.DEV) {
      this.sendToAnalyticsService(event);
    }
  }

  /**
   * Send event to external analytics service
   */
  private sendToAnalyticsService(event: AnalyticsEvent): void {
    // TODO: Integrate with actual analytics service
    // Examples:
    // - Google Analytics: gtag('event', event.event, event.data)
    // - Mixpanel: mixpanel.track(event.event, event.data)
    // - Custom backend: fetch('/api/v1/analytics/events', { method: 'POST', body: JSON.stringify(event) })
    
    // Placeholder implementation
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.event, {
        event_category: 'paywall',
        event_label: event.data.feature,
        ...event.data,
      });
    }
  }

  /**
   * Track paywall view
   * Called when a user sees the paywall modal or upgrade prompt
   */
  trackPaywallView(data: PaywallEventData = {}): void {
    this.track('paywall_viewed', data);
  }

  /**
   * Track upgrade button click
   * Called when user clicks any upgrade/subscribe button
   */
  trackUpgradeClick(data: PaywallEventData = {}): void {
    this.track('upgrade_clicked', data);
  }

  /**
   * Track checkout initiated
   * Called when user proceeds to Stripe checkout
   */
  trackCheckoutInitiated(data: PaywallEventData = {}): void {
    this.track('checkout_initiated', data);
  }

  /**
   * Track successful conversion
   * Called when user completes subscription purchase
   */
  trackConversion(data: PaywallEventData = {}): void {
    this.track('subscription_purchased', data);
  }

  /**
   * Track checkout cancellation
   * Called when user cancels during checkout
   */
  trackCheckoutCancelled(data: PaywallEventData = {}): void {
    this.track('checkout_cancelled', data);
  }

  /**
   * Track paywall dismissal
   * Called when user closes/dismisses the paywall without upgrading
   */
  trackPaywallDismissed(data: PaywallEventData = {}): void {
    this.track('paywall_dismissed', data);
  }

  /**
   * Track pricing page view
   * Called when user views the dedicated pricing page
   */
  trackPricingPageView(data: PaywallEventData = {}): void {
    this.track('pricing_page_viewed', data);
  }

  /**
   * Track billing period change
   * Called when user switches between monthly/yearly
   */
  trackBillingPeriodChange(data: PaywallEventData = {}): void {
    this.track('billing_period_changed', data);
  }

  /**
   * Track feature gate encounter
   * Called when user tries to access a gated feature
   */
  trackFeatureGateEncountered(data: PaywallEventData = {}): void {
    this.track('feature_gate_encountered', data);
  }

  /**
   * Track quota limit reached
   * Called when user hits a quota limit (e.g., 50 favorites)
   */
  trackQuotaLimitReached(data: PaywallEventData = {}): void {
    this.track('quota_limit_reached', data);
  }

  /**
   * Get all tracked events (for debugging)
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Clear all tracked events (for testing)
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

// Export singleton instance
export const paywallAnalytics = new PaywallAnalytics();

// Export individual tracking functions for convenience
export const trackPaywallView = (data?: PaywallEventData) => 
  paywallAnalytics.trackPaywallView(data);

export const trackUpgradeClick = (data?: PaywallEventData) => 
  paywallAnalytics.trackUpgradeClick(data);

export const trackCheckoutInitiated = (data?: PaywallEventData) => 
  paywallAnalytics.trackCheckoutInitiated(data);

export const trackConversion = (data?: PaywallEventData) => 
  paywallAnalytics.trackConversion(data);

export const trackCheckoutCancelled = (data?: PaywallEventData) => 
  paywallAnalytics.trackCheckoutCancelled(data);

export const trackPaywallDismissed = (data?: PaywallEventData) => 
  paywallAnalytics.trackPaywallDismissed(data);

export const trackPricingPageView = (data?: PaywallEventData) => 
  paywallAnalytics.trackPricingPageView(data);

export const trackBillingPeriodChange = (data?: PaywallEventData) => 
  paywallAnalytics.trackBillingPeriodChange(data);

export const trackFeatureGateEncountered = (data?: PaywallEventData) => 
  paywallAnalytics.trackFeatureGateEncountered(data);

export const trackQuotaLimitReached = (data?: PaywallEventData) => 
  paywallAnalytics.trackQuotaLimitReached(data);
