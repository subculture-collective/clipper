---
title: "Paywall Analytics Events"
summary: "This document describes the analytics events tracked for the premium subscription paywall and upgrad"
tags: ['premium']
area: "premium"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Paywall Analytics Events

This document describes the analytics events tracked for the premium subscription paywall and upgrade flow.

## Overview

The paywall analytics system tracks user interactions with premium features, upgrade prompts, and the checkout flow to enable conversion funnel analysis and optimization.

## Implementation

All analytics events are tracked through the `paywall-analytics.ts` module, which provides a centralized tracking interface.

### Usage

```typescript
import { trackPaywallView, trackUpgradeClick } from '@/lib/paywall-analytics';

// Track when a user sees the paywall
trackPaywallView({
  feature: 'Collections',
  userId: user?.id,
});

// Track when a user clicks upgrade
trackUpgradeClick({
  feature: 'Collections',
  billingPeriod: 'yearly',
  userId: user?.id,
});
```

## Event Reference

### 1. Paywall Viewed

**Event Name:** `paywall_viewed`

**When:** User sees the paywall modal or upgrade prompt

**Data:**

- `feature` - Feature that triggered the paywall (e.g., "Collections", "Advanced Search")
- `location` - URL path where event occurred
- `userId` - User ID if authenticated
- `metadata` - Additional context

**Tracked In:**

- `PaywallModal` component (web & mobile)
- `UpgradePrompt` component

**Use Case:** Measure paywall impression rate, identify which features drive upgrade interest

---

### 2. Upgrade Clicked

**Event Name:** `upgrade_clicked`

**When:** User clicks any upgrade/subscribe button

**Data:**

- `feature` - Feature context where click occurred
- `billingPeriod` - Selected plan (monthly/yearly)
- `userId` - User ID if authenticated
- `metadata.source` - Where the click originated (e.g., "upgrade_prompt", "pricing_page", "quota_display")

**Tracked In:**

- `PaywallModal` component
- `UpgradePrompt` component
- `QuotaDisplay` component
- `PricingPage` component

**Use Case:** Measure click-through rate from various CTAs, A/B test button placement

---

### 3. Checkout Initiated

**Event Name:** `checkout_initiated`

**When:** User proceeds to Stripe checkout

**Data:**

- `feature` - Feature context (if applicable)
- `billingPeriod` - Selected plan (monthly/yearly)
- `userId` - User ID
- `metadata.source` - Originating page/component

**Tracked In:**

- `PaywallModal` component
- `PricingPage` component

**Use Case:** Track funnel drop-off between upgrade click and checkout start

---

### 4. Subscription Purchased

**Event Name:** `subscription_purchased`

**When:** User completes subscription purchase (success page)

**Data:**

- `userId` - User ID
- `metadata.sessionId` - Stripe checkout session ID

**Tracked In:**

- `SubscriptionSuccessPage` component

**Use Case:** Track successful conversions, calculate conversion rate

---

### 5. Checkout Cancelled

**Event Name:** `checkout_cancelled`

**When:** User cancels during checkout

**Data:**

- `userId` - User ID if authenticated

**Tracked In:**

- `SubscriptionCancelPage` component

**Use Case:** Measure checkout abandonment rate, identify friction points

---

### 6. Paywall Dismissed

**Event Name:** `paywall_dismissed`

**When:** User closes/dismisses the paywall without upgrading

**Data:**

- `feature` - Feature context
- `userId` - User ID if authenticated
- `metadata.action` - How dismissed ("close_button", "view_pricing", "backdrop_click")

**Tracked In:**

- `PaywallModal` component

**Use Case:** Understand why users don't convert, measure engagement

---

### 7. Pricing Page Viewed

**Event Name:** `pricing_page_viewed`

**When:** User views the dedicated pricing page

**Data:**

- `userId` - User ID if authenticated
- `location` - URL path

**Tracked In:**

- `PricingPage` component
- Mobile pricing screen

**Use Case:** Track pricing page traffic, measure interest in subscription

---

### 8. Billing Period Changed

**Event Name:** `billing_period_changed`

**When:** User switches between monthly/yearly billing

**Data:**

- `feature` - Feature context (if from modal)
- `billingPeriod` - New selected period
- `userId` - User ID if authenticated
- `metadata.source` - Where the change occurred

**Tracked In:**

- `PaywallModal` component
- `PricingPage` component
- Mobile pricing screen

**Use Case:** Understand user preference for billing periods, optimize pricing display

---

### 9. Feature Gate Encountered

**Event Name:** `feature_gate_encountered`

**When:** User tries to access a gated feature

**Data:**

- `feature` - Gated feature name
- `userId` - User ID if authenticated

**Tracked In:**

- `UpgradePrompt` component (on mount)

**Use Case:** Identify which features users want most, prioritize feature development

---

### 10. Quota Limit Reached

**Event Name:** `quota_limit_reached`

**When:** User hits a quota limit (e.g., 50 favorites)

**Data:**

- `feature` - Quota feature (e.g., "Favorites")
- `userId` - User ID
- `metadata.current` - Current usage count
- `metadata.limit` - Quota limit

**Tracked In:**

- `QuotaDisplay` component

**Use Case:** Identify conversion triggers, optimize quota limits

---

## Conversion Funnel

The events form a standard conversion funnel:

```
1. Feature Gate Encountered / Quota Limit Reached
   ↓
2. Paywall Viewed
   ↓
3. Upgrade Clicked
   ↓
4. Checkout Initiated
   ↓
5a. Subscription Purchased (success) OR
5b. Checkout Cancelled (abandonment)
```

## Analytics Integration

### Current Implementation

- Events are logged to console in development mode
- In production, events can be sent to:
  - Google Analytics (via `gtag`)
  - Mixpanel
  - Custom backend endpoint

### Future Integration

To integrate with your analytics service, update the `sendToAnalyticsService` method in `paywall-analytics.ts`:

```typescript
private sendToAnalyticsService(event: AnalyticsEvent): void {
  // Example: Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event.event, {
      event_category: 'paywall',
      event_label: event.data.feature,
      ...event.data,
    });
  }

  // Example: Custom backend
  fetch('/api/v1/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
}
```

## Key Metrics

Use these events to calculate:

1. **Paywall Impression Rate**
   - `paywall_viewed` / `feature_gate_encountered`

2. **Upgrade Click-Through Rate**
   - `upgrade_clicked` / `paywall_viewed`

3. **Checkout Initiation Rate**
   - `checkout_initiated` / `upgrade_clicked`

4. **Conversion Rate**
   - `subscription_purchased` / `checkout_initiated`

5. **Abandonment Rate**
   - `checkout_cancelled` / `checkout_initiated`

6. **Overall Free-to-Pro Conversion**
   - `subscription_purchased` / `feature_gate_encountered`

## Best Practices

1. **Consistent Feature Names**: Use the same feature name across all events (e.g., "Collections" not "collections" or "Custom Collections")

2. **Include User Context**: Always include `userId` when available for cohort analysis

3. **Add Metadata**: Use the `metadata` field for additional context that might be useful for debugging or analysis

4. **Test in Development**: Events are logged to console in dev mode for easy verification

5. **Monitor Funnels**: Regularly review funnel metrics to identify drop-off points

## Testing

To test analytics tracking:

```typescript
import { paywallAnalytics } from '@/lib/paywall-analytics';

// Enable debug mode
paywallAnalytics.setDebugMode(true);

// Track an event
trackPaywallView({ feature: 'Test Feature' });

// View all tracked events
console.log(paywallAnalytics.getEvents());

// Clear events (useful for testing)
paywallAnalytics.clearEvents();
```

## Privacy Considerations

- User IDs are optional and only included when user is authenticated
- No personally identifiable information (PII) is tracked
- Events comply with GDPR and privacy regulations
- Users can opt out of analytics in settings (implement as needed)

## Support

For questions or issues with analytics tracking:

- Create an issue with the `analytics` or `premium` label
- Reference specific event names and expected vs actual behavior
- Include browser/device information if relevant
