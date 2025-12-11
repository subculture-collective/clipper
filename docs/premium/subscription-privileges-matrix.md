<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Subscription Privileges Matrix](#subscription-privileges-matrix)
  - [Overview](#overview)
  - [Subscription Tiers Comparison](#subscription-tiers-comparison)
  - [Pricing](#pricing)
    - [Pro Subscription](#pro-subscription)
  - [Feature Gates & Implementation](#feature-gates--implementation)
    - [Backend Feature Gates](#backend-feature-gates)
    - [Frontend Feature Flags](#frontend-feature-flags)
  - [Subscription Status Values](#subscription-status-values)
  - [Implementation Checklist](#implementation-checklist)
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [Documentation](#documentation)
  - [Future Tiers](#future-tiers)
    - [Potential Future: Enterprise Tier](#potential-future-enterprise-tier)
    - [Potential Future: Creator Tier](#potential-future-creator-tier)
  - [Analytics & Metrics](#analytics--metrics)
  - [Related Documentation](#related-documentation)
    - [Premium Tier Documentation (Comprehensive)](#premium-tier-documentation-comprehensive)
    - [Technical Documentation](#technical-documentation)
  - [Support & Questions](#support--questions)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Subscription Privileges Matrix"
summary: "This document defines the features, limits, and privileges for each subscription tier in Clipper. Us"
tags: ['premium', 'payments']
area: "premium"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Subscription Privileges Matrix

This document defines the features, limits, and privileges for each subscription tier in Clipper. Use this as the authoritative reference for implementing and gating subscription features.

> **📋 Related Documentation:**
>
> - **[Premium Tiers](./PREMIUM_TIERS.md)** - Comprehensive pricing, benefits, and tier details
> - **[Entitlement Matrix](./ENTITLEMENT_MATRIX.md)** - Detailed feature gates per platform (Web, Mobile, API)
> - **[Trials and Discounts](./TRIALS_AND_DISCOUNTS.md)** - Trial periods and promotional policies
> - **[Stripe Integration](./SUBSCRIPTIONS.md)** - Payment processing setup

## Overview

Clipper offers two subscription tiers:

1. **Free** - Basic access for all users
2. **Pro** - Enhanced features and higher limits for power users ($9.99/month or $99.99/year)

Future tiers (e.g., Enterprise, Teams) can be added as the platform grows. See [Premium Tiers](./PREMIUM_TIERS.md) for detailed tier roadmap.

## Subscription Tiers Comparison

| Feature | Free | Pro (Monthly/Yearly) |
|---------|------|----------------------|
| **Core Features** | | |
| Browse clips | ✅ Full access | ✅ Full access |
| Watch clips | ✅ Full access | ✅ Full access |
| Vote on clips | ✅ Yes | ✅ Yes |
| Comment on clips | ✅ Yes | ✅ Yes |
| Submit clips | ✅ Yes | ✅ Yes |
| Create favorites | ✅ Yes | ✅ Yes |
| Karma system | ✅ Yes | ✅ Yes |
| **Search & Discovery** | | |
| Basic search | ✅ Yes | ✅ Yes |
| Advanced filters | ❌ No | ✅ Yes |
| Search by date range | ❌ No | ✅ Yes |
| Search by view count | ❌ No | ✅ Yes |
| Saved search queries | ❌ No | ✅ Yes |
| Custom feed preferences | ❌ No | ✅ Yes |
| **Collections & Organization** | | |
| Favorite clips | ✅ Up to 50 | ✅ Unlimited |
| Collections/Playlists | ❌ No | ✅ Unlimited |
| Cross-device sync | ❌ No | ✅ Yes |
| Export favorites | ❌ No | ✅ Yes |
| **Experience** | | |
| Ads | ⚠️ Standard | ✅ Reduced/None |
| Profile badge | ❌ No | ✅ Pro badge |
| Early access features | ❌ No | ✅ Yes |
| Beta program access | ❌ No | ✅ Yes |
| **Rate Limits** | | |
| API requests/minute | 60 | 300 |
| API requests/hour | 1000 | 10000 |
| Clip submissions/day | 10 | 50 |
| Comments/hour | 30 | 100 |
| Votes/hour | 100 | 500 |
| Search queries/hour | 50 | 500 |
| **Support** | | |
| Community support | ✅ Yes | ✅ Yes |
| Email support | ⚠️ Best effort | ✅ Priority |
| Response time SLA | None | 24-48 hours |
| Feature requests | ✅ Can submit | ✅ Higher priority |

## Pricing

### Pro Subscription

- **Monthly**: $9.99/month
- **Yearly**: $99.99/year (17% off - equivalent to $8.33/month)

**Payment Methods**: Credit card, debit card (via Stripe)

**Billing**:

- Monthly subscriptions renew automatically on the same day each month
- Yearly subscriptions renew annually on the subscription anniversary
- Cancellation takes effect at the end of the current billing period
- No refunds for partial periods

## Feature Gates & Implementation

### Backend Feature Gates

The backend uses middleware to enforce subscription requirements. Located in `backend/internal/middleware/subscription_middleware.go`:

#### 1. `RequireProSubscription` Middleware

Restricts access to Pro-only features. Checks if user has an active Pro subscription (status: `active` or `trialing`).

**Usage Example**:

```go
proRoutes := v1.Group("/pro")
proRoutes.Use(middleware.AuthMiddleware(authService))
proRoutes.Use(middleware.RequireProSubscription(subscriptionService))
{
    proRoutes.GET("/advanced-search", advancedSearchHandler)
    proRoutes.GET("/playlists", playlistsHandler)
    proRoutes.POST("/export-favorites", exportFavoritesHandler)
}
```

**Features Protected**:

- Advanced search filters
- Custom collections/playlists
- Export favorites functionality
- Early access features
- Cross-device sync endpoints

#### 2. `RequireActiveSubscription` Middleware

Requires any active subscription. Future-proof for multiple tiers beyond Pro.

**Usage Example**:

```go
subscriberRoutes := v1.Group("/subscriber")
subscriberRoutes.Use(middleware.AuthMiddleware(authService))
subscriberRoutes.Use(middleware.RequireActiveSubscription(subscriptionService))
{
    subscriberRoutes.GET("/no-ads", noAdsPreferenceHandler)
}
```

#### 3. Rate Limit Tiers

Rate limits should be adjusted based on subscription tier. Implementation in `backend/internal/middleware/ratelimit_middleware.go`.

**Recommended Implementation**:

```go
// Check user subscription tier and apply appropriate limits
func GetRateLimitForUser(userID uuid.UUID, subscriptionService *services.SubscriptionService) (requests int, window time.Duration) {
    isPro := subscriptionService.IsProUser(context.Background(), userID)
    
    if isPro {
        return 300, time.Minute  // Pro: 300 req/min
    }
    return 60, time.Minute  // Free: 60 req/min
}
```

**Endpoints to Rate Limit by Tier**:

- API endpoints: `/api/v1/*`
- Search endpoints: `/api/v1/search`, `/api/v1/clips/search`
- Submission endpoints: `/api/v1/clips/submit`
- Comment endpoints: `/api/v1/comments`
- Vote endpoints: `/api/v1/clips/:id/vote`

#### 4. Feature Toggles in Service Layer

For features that need conditional logic rather than complete blocking:

```go
func (s *ClipService) GetSearchResults(ctx context.Context, userID uuid.UUID, filters SearchFilters) ([]Clip, error) {
    isPro := s.subscriptionService.IsProUser(ctx, userID)
    
    // Advanced filters only for Pro users
    if !isPro {
        filters.DateRange = nil
        filters.ViewCountRange = nil
        filters.AdvancedSort = nil
    }
    
    return s.repo.Search(ctx, filters)
}
```

### Frontend Feature Flags

The frontend should check subscription status and conditionally render UI elements.

#### 1. Subscription Context/Hook

Create a hook to check subscription status:

```typescript
// src/hooks/useSubscription.ts
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  
  useEffect(() => {
    if (user) {
      fetchSubscription().then(setSubscription);
    }
  }, [user]);
  
  const isPro = subscription?.tier === 'pro' && 
                (subscription?.status === 'active' || 
                 subscription?.status === 'trialing');
  
  const isActive = subscription?.status === 'active' || 
                   subscription?.status === 'trialing';
  
  return { subscription, isPro, isActive };
}
```

#### 2. Feature Gating Components

Create wrapper components for gated features:

```typescript
// src/components/subscription/ProFeature.tsx
interface ProFeatureProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function ProFeature({ children, fallback, showUpgradePrompt = true }: ProFeatureProps) {
  const { isPro } = useSubscription();
  
  if (isPro) {
    return <>{children}</>;
  }
  
  if (showUpgradePrompt) {
    return <UpgradePrompt feature="This feature" />;
  }
  
  return <>{fallback}</>;
}
```

#### 3. UI Indicators

- **Pro Badge**: Display badge next to Pro user profiles and usernames
- **Feature Locks**: Show lock icons on gated features with "Upgrade to Pro" tooltip
- **Upgrade Prompts**: Contextual upgrade CTAs when users interact with locked features
- **Rate Limit Notices**: Display remaining quota and upgrade CTA when approaching limits

**Example UI States**:

```typescript
// Search filters with Pro gate
<div className="advanced-filters">
  <h3>Advanced Filters</h3>
  {isPro ? (
    <>
      <DateRangeFilter />
      <ViewCountFilter />
      <CustomSortOptions />
    </>
  ) : (
    <div className="upgrade-prompt">
      <LockIcon />
      <p>Unlock advanced search filters with Pro</p>
      <Button onClick={() => navigate('/pricing')}>Upgrade</Button>
    </div>
  )}
</div>
```

## Subscription Status Values

| Status | Description | Has Access |
|--------|-------------|------------|
| `active` | Subscription is current and paid | ✅ Yes |
| `trialing` | In trial period | ✅ Yes |
| `past_due` | Payment failed, grace period | ⚠️ Limited |
| `canceled` | User canceled, end of period not reached | ⚠️ Until period end |
| `unpaid` | Payment failed, retries exhausted | ❌ No |
| `inactive` | No subscription (default) | ❌ No |

## Implementation Checklist

### Backend

- [x] Subscription database schema
- [x] Stripe integration
- [x] Webhook handling
- [x] Subscription service with status checks
- [x] `RequireProSubscription` middleware
- [x] `RequireActiveSubscription` middleware
- [ ] Tiered rate limiting implementation
- [ ] Advanced search filters endpoint
- [ ] Collections/playlists endpoints
- [ ] Export favorites endpoint
- [ ] Cross-device sync endpoints
- [ ] Submission quota enforcement
- [ ] Comment/vote quota enforcement

### Frontend

- [x] Pricing page with Pro features
- [x] Subscription success/cancel pages
- [x] Checkout integration
- [ ] `useSubscription` hook
- [ ] `ProFeature` wrapper component
- [ ] Pro badge component
- [ ] Upgrade prompt component
- [ ] Feature lock indicators
- [ ] Advanced search UI (Pro-gated)
- [ ] Collections/playlists UI
- [ ] Export functionality
- [ ] Rate limit quota displays
- [ ] Settings: Manage subscription
- [ ] Profile: Pro badge display

### Documentation

- [x] Subscription setup guide (`SUBSCRIPTIONS.md`)
- [x] Privileges matrix (this document)
- [ ] Update API documentation with Pro endpoints
- [ ] Update user guide with Pro features
- [ ] Add subscription FAQs

## Future Tiers

As the platform grows, additional tiers can be introduced:

### Potential Future: Enterprise Tier

- Team/organization accounts
- Shared collections
- Analytics dashboard
- Custom branding
- SLA guarantees
- Dedicated support
- Volume pricing

### Potential Future: Creator Tier

- Enhanced analytics for submitted clips
- Creator verification badge
- Promote clips feature
- Revenue sharing (future)
- API access for automation

## Analytics & Metrics

Track these metrics to understand subscription performance:

- Conversion rate (free → pro)
- Churn rate
- Monthly recurring revenue (MRR)
- Average revenue per user (ARPU)
- Feature usage by tier
- Upgrade triggers (which features drive conversions)
- Cancellation reasons

## Related Documentation

### Premium Tier Documentation (Comprehensive)

- **[Premium Tiers](./PREMIUM_TIERS.md)** - Complete pricing strategy, tier benefits, competitive analysis, and future roadmap
- **[Entitlement Matrix](./ENTITLEMENT_MATRIX.md)** - Detailed feature gates per platform (Web, Mobile, API) with implementation examples
- **[Trials and Discounts](./TRIALS_AND_DISCOUNTS.md)** - Trial periods, promotional campaigns, coupon system, and referral program

### Technical Documentation

- **[Stripe Integration Setup](./SUBSCRIPTIONS.md)** - How to configure Stripe for payments and webhooks
- **[API Documentation](./API.md)** - API endpoints and authentication
- **[Rate Limiting](./CACHING_STRATEGY.md)** - Rate limiting implementation details
- **[Architecture](./ARCHITECTURE.md)** - System architecture overview

## Support & Questions

For implementation questions or clarification:

- Create an issue with the `subscription` or `premium` label
- Reference issue [#175](https://github.com/subculture-collective/clipper/issues/175) - Product Roadmap
- See comprehensive documentation linked above for detailed guidance

---

**Last Updated**: 2025-10-27  
**Status**: Draft for Beta milestone  
**Tracking Issue**: [#175](https://github.com/subculture-collective/clipper/issues/175)
