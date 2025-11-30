# Premium Overview

Clipper's subscription model: Free and Pro tiers with feature gating, Stripe integration, and entitlements.

## Tiers

| Tier | Price | Status |
|------|-------|--------|
| Free | $0 | Default for all users |
| Pro | $4.99/month or $49/year | Premium features |

See [[tiers|Pricing Tiers]] for full comparison.

## Core Philosophy

1. **Generous Free**: Core discovery, voting, comments always free
2. **Remove Friction**: Pro removes limits on favorites, collections, advanced search
3. **Progressive Value**: Free is useful; Pro amplifies power users
4. **Transparent**: Clear upgrade prompts with feature benefits

## Premium Features

- Unlimited favorites (Free: 50 max)
- Collections/playlists (unlimited)
- Advanced search filters (date, views, duration)
- Custom tags and labels
- Saved searches
- Data export
- Ad-free experience
- Priority support
- Early access to new features

See [[entitlements|Entitlement Matrix]] for complete breakdown.

## Implementation

- Backend: `subscriptions` table, entitlement middleware
- Frontend: Feature gates with `useEntitlement` hook
- Mobile: Shared entitlement logic via API
- Payment: Stripe Checkout + Customer Portal
- Webhooks: Handle subscription lifecycle events

See [[stripe|Stripe Integration]].

## User Flow

1. User encounters gated feature (e.g., "Create Collection")
2. Paywall modal shows with feature benefits
3. User selects monthly/yearly billing
4. Stripe Checkout for payment
5. Webhook confirms subscription → grant entitlements
6. User redirected to success page
7. Features immediately unlocked

## Analytics

Track conversion funnel:
- Paywall views
- Upgrade clicks
- Checkout initiated
- Subscription purchased
- Checkout cancelled

Retention metrics:
- Monthly/yearly churn
- Feature adoption by tier
- Quota limit encounters

---

Related: [[tiers|Tiers]] · [[entitlements|Entitlements]] · [[stripe|Stripe]] · [[../backend/api|API]]

[[../index|← Back to Index]]
