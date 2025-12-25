---
title: "Entitlement Matrix"
summary: "**Status**: Approved for Beta Milestone"
tags: ['premium']
area: "premium"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Entitlement Matrix

**Status**: Approved for Beta Milestone  
**Last Updated**: 2025-11-03  
**Owner**: Engineering Team  
**Purpose**: Authoritative reference for feature gating across all platforms

## Executive Summary

This document provides a comprehensive mapping of features to subscription tiers across web, mobile, and API platforms. It serves as the single source of truth for implementing feature gates and entitlements in Clipper.

## Table of Contents

- [Overview](#overview)
- [Tier Definitions](#tier-definitions)
- [Feature Categories](#feature-categories)
- [Platform Matrix](#platform-matrix)
- [Implementation Guidelines](#implementation-guidelines)
- [Rate Limits and Quotas](#rate-limits-and-quotas)
- [Related Documentation](#related-documentation)

## Overview

### Entitlement Principles

1. **Consistency**: Features should behave consistently across platforms
2. **Transparency**: Users should clearly understand what they can access
3. **Grace**: Provide helpful upgrade prompts, not frustrating blocks
4. **Progressive**: Free tier provides value; Pro removes friction
5. **Future-proof**: Design for multiple tiers beyond Free/Pro

### Platform Coverage

- **Web**: React frontend (desktop and mobile responsive)
- **Mobile**: Future native iOS and Android apps
- **API**: REST API v1 (used by web and future mobile)

## Tier Definitions

| Tier | Identifier | Status Values | Description |
|------|------------|---------------|-------------|
| Free | `free` | `inactive` | Default tier for all users |
| Pro | `pro` | `active`, `trialing` | Premium tier with enhanced features |

**Future Tiers**: `team`, `enterprise`, `creator` (see [Premium Tiers](./PREMIUM_TIERS.md))

## Feature Categories

### Category 1: Core Features (All Tiers)

Features available to all users regardless of subscription status.

| Feature | Free | Pro | Notes |
|---------|------|-----|-------|
| Browse clips | ✅ | ✅ | Unlimited for all users |
| Watch clips | ✅ | ✅ | Embedded player, Twitch redirect |
| Vote (upvote/downvote) | ✅ | ✅ | With rate limiting |
| Comment on clips | ✅ | ✅ | With rate limiting |
| View user profiles | ✅ | ✅ | Public profiles |
| Karma system | ✅ | ✅ | Reputation points |
| Basic search | ✅ | ✅ | Keyword search only |
| View clip details | ✅ | ✅ | Metadata, stats, comments |
| Share clips | ✅ | ✅ | Social sharing, links |
| Report content | ✅ | ✅ | Moderation system |

### Category 2: Content Submission

| Feature | Free | Pro | Implementation |
|---------|------|-----|----------------|
| Submit clips | ✅ 10/day | ✅ 50/day | Quota enforcement in service layer |
| Bulk upload | ❌ | ✅ | Web: batch form; API: array endpoint |
| Clip metadata | ✅ Basic | ✅ Enhanced | Pro: custom tags, descriptions |
| Submit priority | ❌ | ✅ | Pro clips processed first |
| Upload history | ✅ 30 days | ✅ Unlimited | Database retention policy |

### Category 3: Organization & Collections

| Feature | Free | Pro | Implementation |
|---------|------|-----|----------------|
| Favorite clips | ✅ 50 max | ✅ Unlimited | Database count check |
| Collections/Playlists | ❌ | ✅ | Feature gate + UI |
| Collection sharing | ❌ | ✅ | Public/private toggle |
| Collection collaboration | ❌ | ❌ (future: Team) | Not yet implemented |
| Tags & labels | ✅ Basic | ✅ Custom | Free: preset only; Pro: custom |
| Smart collections | ❌ | ✅ | Auto-populate by rules |

### Category 4: Search & Discovery

| Feature | Free | Pro | Implementation |
|---------|------|-----|----------------|
| Keyword search | ✅ | ✅ | OpenSearch basic |
| Advanced filters | ❌ | ✅ | Filter middleware |
| Date range filter | ❌ | ✅ | Query parameter gating |
| View count filter | ❌ | ✅ | Query parameter gating |
| Duration filter | ❌ | ✅ | Query parameter gating |
| Game/category filter | ✅ | ✅ | Available to all |
| Streamer filter | ✅ | ✅ | Available to all |
| Custom sorting | ❌ | ✅ | Sort options gated |
| Saved searches | ❌ | ✅ | Database + UI |
| Search history | ✅ 10 recent | ✅ Unlimited | Local storage vs. database |
| Feed customization | ❌ | ✅ | User preferences |

### Category 5: Experience & UI

| Feature | Free | Pro | Implementation |
|---------|------|-----|----------------|
| Advertisements | ⚠️ Shown | ✅ Hidden | Frontend conditional rendering |
| Profile badge | ❌ | ✅ Pro badge | UI component based on tier |
| Custom avatar frame | ❌ | ✅ | Pro users only |
| Dark/light theme | ✅ | ✅ | Available to all |
| Keyboard shortcuts | ✅ | ✅ | Available to all |
| Accessibility features | ✅ | ✅ | Available to all |
| Notifications | ✅ Basic | ✅ Enhanced | Pro: more notification types |
| Email preferences | ✅ Basic | ✅ Granular | Pro: fine-grained control |

### Category 6: Data & Export

| Feature | Free | Pro | Implementation |
|---------|------|-----|----------------|
| Export favorites | ❌ | ✅ | API endpoint + UI |
| Export format (JSON) | ❌ | ✅ | Serialization |
| Export format (CSV) | ❌ | ✅ | CSV generation |
| Export collections | ❌ | ✅ | Batch export |
| Data portability | ❌ | ✅ | GDPR compliance |
| Backup & restore | ❌ | ✅ (future) | Planned feature |

### Category 7: Sync & Multi-Device

| Feature | Free | Pro | Implementation |
|---------|------|-----|----------------|
| Web access | ✅ | ✅ | Available to all |
| Mobile responsive | ✅ | ✅ | Available to all |
| Cross-device sync | ❌ | ✅ | Real-time via WebSocket |
| Offline access | ❌ | ✅ (future) | PWA/mobile app feature |
| Multiple sessions | ✅ 2 max | ✅ 5 max | JWT token limit |
| Session management | ✅ | ✅ | View active sessions |

### Category 8: Community & Social

| Feature | Free | Pro | Implementation |
|---------|------|-----|----------------|
| Follow users | ✅ | ✅ | Available to all |
| Follow limit | ✅ 100 | ✅ 500 | Database count check |
| Community discussions | ✅ | ✅ | Available to all |
| Markdown in comments | ✅ | ✅ | Available to all |
| Mention users | ✅ | ✅ | Available to all |
| Direct messages | ❌ (future) | ✅ (future) | Planned feature |
| Custom reactions | ❌ | ✅ (future) | Planned feature |

### Category 9: Early Access & Beta

| Feature | Free | Pro | Implementation |
|---------|------|-----|----------------|
| Beta features | ❌ | ✅ | Feature flag system |
| Early access | ❌ | ✅ | Staged rollout |
| Feature voting | ✅ | ✅ 2x weight | Weighted voting system |
| Beta feedback channel | ❌ | ✅ | Discord/forum access |
| Priority roadmap input | ❌ | ✅ | Product team engagement |

### Category 10: Analytics & Insights

| Feature | Free | Pro | Implementation |
|---------|------|-----|----------------|
| Personal stats | ✅ Basic | ✅ Detailed | Pro: deeper insights |
| Submission analytics | ❌ | ✅ | Clip performance tracking |
| Voting patterns | ❌ | ✅ | Personal voting history |
| Usage dashboard | ❌ | ✅ | Charts and graphs |
| Export analytics | ❌ | ✅ | Data export |

## Platform Matrix

### Web Platform (React Frontend)

#### Desktop Web

| Feature Area | Components | Free | Pro | Gating Method |
|--------------|------------|------|-----|---------------|
| Navigation | Header, Sidebar | ✅ | ✅ | None |
| Feed | Clip grid, Infinite scroll | ✅ | ✅ | None |
| Clip page | Player, Comments, Details | ✅ | ✅ | None |
| Search | Basic form | ✅ | ✅ | None |
| Advanced search | Filter panel | ❌ | ✅ | `<ProFeature>` wrapper |
| Favorites | List view (50 max) | ✅ | ✅ | Quota check |
| Collections | — | ❌ | ✅ | Route guard + UI |
| Profile | Basic stats | ✅ | ✅ | None |
| Profile badge | — | ❌ | ✅ | Conditional render |
| Settings | Basic prefs | ✅ | ✅ | None |
| Settings advanced | Sync, Export | ❌ | ✅ | Tab gating |
| Submit form | Single upload | ✅ | ✅ | None |
| Submit bulk | Batch upload | ❌ | ✅ | Form gating |
| Ads | Display ads | ⚠️ | ✅ Hidden | Conditional render |

#### Mobile Web (Responsive)

Same as desktop web, with responsive layout adjustments. No feature differences between desktop and mobile web.

### Mobile Platform (Future Native Apps)

| Feature Area | iOS | Android | Free | Pro | Notes |
|--------------|-----|---------|------|-----|-------|
| Core browsing | ✅ | ✅ | ✅ | ✅ | Native UI |
| Offline mode | ✅ | ✅ | ❌ | ✅ | Download for offline |
| Push notifications | ✅ | ✅ | ✅ Basic | ✅ Enhanced | Pro: more types |
| Background sync | ✅ | ✅ | ❌ | ✅ | Sync favorites |
| Widget | ✅ | ✅ | ❌ | ✅ | Home screen widget |
| Share extension | ✅ | ✅ | ✅ | ✅ | All users |
| Haptics | ✅ | ✅ | ✅ | ✅ | All users |
| Face/Touch ID | ✅ | ✅ | ✅ | ✅ | All users |

**Note**: Mobile apps are planned for Phase 2. This matrix is provisional.

### API Platform (REST API v1)

#### Public Endpoints (No Auth Required)

| Endpoint | Free | Pro | Rate Limit (Free) | Rate Limit (Pro) |
|----------|------|-----|-------------------|------------------|
| `GET /health` | ✅ | ✅ | None | None |
| `GET /api/v1/clips` | ✅ | ✅ | 60/min | 300/min |
| `GET /api/v1/clips/:id` | ✅ | ✅ | 60/min | 300/min |
| `GET /api/v1/search` | ✅ | ✅ | 50/hour | 500/hour |

#### Authenticated Endpoints

| Endpoint | Free | Pro | Rate Limit (Free) | Rate Limit (Pro) |
|----------|------|-----|-------------------|------------------|
| `GET /api/v1/me` | ✅ | ✅ | 60/min | 300/min |
| `GET /api/v1/favorites` | ✅ | ✅ | 60/min | 300/min |
| `POST /api/v1/favorites` | ✅ (50 max) | ✅ | 60/min | 300/min |
| `DELETE /api/v1/favorites/:id` | ✅ | ✅ | 60/min | 300/min |
| `POST /api/v1/clips` | ✅ (10/day) | ✅ (50/day) | 10/day | 50/day |
| `POST /api/v1/clips/:id/vote` | ✅ | ✅ | 100/hour | 500/hour |
| `POST /api/v1/comments` | ✅ | ✅ | 30/hour | 100/hour |
| `GET /api/v1/search/advanced` | ❌ | ✅ | N/A | 500/hour |
| `GET /api/v1/collections` | ❌ | ✅ | N/A | 300/min |
| `POST /api/v1/collections` | ❌ | ✅ | N/A | 100/hour |
| `GET /api/v1/export/favorites` | ❌ | ✅ | N/A | 10/hour |
| `GET /api/v1/sync/favorites` | ❌ | ✅ | N/A | 300/min |

## Implementation Guidelines

### Backend Implementation

#### 1. Middleware-Based Gating

Use middleware for binary access control (has access or doesn't).

```go
// Require Pro subscription
router.GET("/api/v1/collections", 
    middleware.AuthMiddleware(authService),
    middleware.RequireProSubscription(subscriptionService),
    handler.GetCollections)

// Require any active subscription
router.GET("/api/v1/no-ads", 
    middleware.AuthMiddleware(authService),
    middleware.RequireActiveSubscription(subscriptionService),
    handler.GetNoAdsPreference)
```

**Endpoints Requiring Pro**:

- `/api/v1/collections/*` - All collection endpoints
- `/api/v1/search/advanced` - Advanced search
- `/api/v1/export/*` - Export endpoints
- `/api/v1/sync/*` - Cross-device sync

#### 2. Service-Layer Quota Enforcement

Use service layer for features with different limits by tier.

```go
func (s *FavoriteService) AddFavorite(ctx context.Context, userID uuid.UUID, clipID uuid.UUID) error {
    // Check quota based on tier
    count, err := s.repo.CountFavorites(ctx, userID)
    if err != nil {
        return err
    }
    
    isPro := s.subscriptionService.IsProUser(ctx, userID)
    maxFavorites := 50
    if isPro {
        maxFavorites = -1 // unlimited
    }
    
    if maxFavorites != -1 && count >= maxFavorites {
        return ErrFavoriteLimitReached
    }
    
    return s.repo.AddFavorite(ctx, userID, clipID)
}
```

**Quota-Enforced Features**:

- Favorites limit (50 vs unlimited)
- Clip submissions (10/day vs 50/day)
- Comments per hour (30 vs 100)
- Votes per hour (100 vs 500)
- Search queries per hour (50 vs 500)

#### 3. Tiered Rate Limiting

Adjust rate limits based on subscription tier.

```go
func GetRateLimitForUser(userID uuid.UUID, subscriptionService *services.SubscriptionService) (int, time.Duration) {
    isPro := subscriptionService.IsProUser(context.Background(), userID)
    
    if isPro {
        return 300, time.Minute  // Pro: 300 req/min
    }
    return 60, time.Minute  // Free: 60 req/min
}
```

#### 4. Feature Toggles

For conditional feature behavior rather than blocking.

```go
func (s *SearchService) Search(ctx context.Context, userID uuid.UUID, query SearchQuery) ([]Clip, error) {
    isPro := s.subscriptionService.IsProUser(ctx, userID)
    
    // Strip advanced filters for free users
    if !isPro {
        query.DateRange = nil
        query.ViewCountRange = nil
        query.CustomSort = ""
    }
    
    return s.opensearch.Search(ctx, query)
}
```

### Frontend Implementation

#### 1. Subscription Hook

```typescript
// src/hooks/useSubscription.ts
export function useSubscription() {
  const { user } = useAuth();
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => api.getSubscription(),
    enabled: !!user,
  });
  
  const isPro = subscription?.tier === 'pro' && 
                (subscription?.status === 'active' || 
                 subscription?.status === 'trialing');
  
  return { subscription, isPro, isLoading };
}
```

#### 2. Feature Gating Components

```typescript
// src/components/subscription/ProFeature.tsx
interface ProFeatureProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  featureName?: string;
}

export function ProFeature({ 
  children, 
  fallback, 
  showUpgradePrompt = true,
  featureName = "This feature"
}: ProFeatureProps) {
  const { isPro, isLoading } = useSubscription();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (isPro) {
    return <>{children}</>;
  }
  
  if (showUpgradePrompt) {
    return <UpgradePrompt feature={featureName} />;
  }
  
  return <>{fallback}</>;
}
```

#### 3. Quota Display

```typescript
// src/components/subscription/QuotaDisplay.tsx
export function FavoritesQuotaDisplay() {
  const { isPro } = useSubscription();
  const { data: favorites } = useQuery(['favorites']);
  
  if (isPro) {
    return <div>Favorites: {favorites.length} (Unlimited)</div>;
  }
  
  const remaining = 50 - favorites.length;
  const isNearLimit = remaining <= 5;
  
  return (
    <div className={isNearLimit ? 'text-warning' : ''}>
      Favorites: {favorites.length}/50
      {isNearLimit && (
        <button onClick={() => navigate('/pricing')}>
          Upgrade for unlimited
        </button>
      )}
    </div>
  );
}
```

#### 4. Route Guards

```typescript
// src/routes/index.tsx
const CollectionsPage = lazy(() => import('@/pages/Collections'));

function ProtectedCollections() {
  const { isPro } = useSubscription();
  
  if (!isPro) {
    return <Navigate to="/pricing" state={{ reason: 'collections' }} />;
  }
  
  return <CollectionsPage />;
}

// In router
<Route path="/collections" element={<ProtectedCollections />} />
```

### Mobile Implementation (Future)

#### Swift (iOS)

```swift
// SubscriptionManager.swift
class SubscriptionManager: ObservableObject {
    @Published var isPro: Bool = false
    
    func checkSubscription() async {
        let subscription = try? await api.getSubscription()
        isPro = subscription?.tier == "pro" && 
                (subscription?.status == "active" || 
                 subscription?.status == "trialing")
    }
}

// View modifier
struct ProFeature<Content: View>: View {
    let content: Content
    @EnvironmentObject var subscription: SubscriptionManager
    
    var body: some View {
        if subscription.isPro {
            content
        } else {
            UpgradePromptView()
        }
    }
}
```

#### Kotlin (Android)

```kotlin
// SubscriptionManager.kt
class SubscriptionManager(private val api: ApiService) {
    private val _isPro = MutableStateFlow(false)
    val isPro: StateFlow<Boolean> = _isPro.asStateFlow()
    
    suspend fun checkSubscription() {
        val subscription = api.getSubscription()
        _isPro.value = subscription.tier == "pro" && 
                       (subscription.status == "active" || 
                        subscription.status == "trialing")
    }
}

// Composable
@Composable
fun ProFeature(
    content: @Composable () -> Unit
) {
    val subscriptionManager = LocalSubscriptionManager.current
    val isPro by subscriptionManager.isPro.collectAsState()
    
    if (isPro) {
        content()
    } else {
        UpgradePrompt()
    }
}
```

## Rate Limits and Quotas

### Rate Limit Tiers

| Resource | Free | Pro | Window | Notes |
|----------|------|-----|--------|-------|
| API requests | 60 | 300 | per minute | Global API calls |
| API requests | 1,000 | 10,000 | per hour | Hourly cap |
| Clip submissions | 10 | 50 | per day | Submission quota |
| Comments | 30 | 100 | per hour | Comment posting |
| Votes | 100 | 500 | per hour | Upvote/downvote |
| Search queries | 50 | 500 | per hour | Search endpoint calls |
| Favorites | 50 | Unlimited | total | Storage quota |
| Collections | 0 | Unlimited | total | Pro only |
| Export requests | 0 | 10 | per hour | Pro only |

### Quota Enforcement Strategy

1. **Real-time Check**: Check quota before action
2. **Graceful Degradation**: Show remaining quota, not just error
3. **Upgrade Prompts**: Contextual CTAs when hitting limits
4. **Grace Period**: Allow slightly over limit, then block (soft limit)

### Error Responses

#### Quota Exceeded (Free User)

```json
{
  "error": "quota_exceeded",
  "message": "You've reached the limit of 50 favorites. Upgrade to Pro for unlimited favorites.",
  "current": 50,
  "limit": 50,
  "upgrade_url": "/pricing",
  "status": 403
}
```

#### Rate Limit Exceeded

```json
{
  "error": "rate_limit_exceeded",
  "message": "You've exceeded the rate limit. Try again in 45 seconds.",
  "limit": 60,
  "window": "1 minute",
  "retry_after": 45,
  "upgrade_url": "/pricing",
  "status": 429
}
```

## Testing Checklist

### Backend Tests

- [ ] Subscription middleware blocks non-Pro users from Pro endpoints
- [ ] Subscription middleware allows Pro users (status: active, trialing)
- [ ] Rate limits enforce different tiers correctly
- [ ] Quota enforcement works for favorites (50 vs unlimited)
- [ ] Quota enforcement works for submissions (10 vs 50)
- [ ] Feature toggles strip advanced filters for free users
- [ ] Webhook properly updates subscription status

### Frontend Tests

- [ ] `useSubscription` hook returns correct tier information
- [ ] ProFeature component shows content for Pro users
- [ ] ProFeature component shows upgrade prompt for free users
- [ ] Route guards redirect non-Pro users from /collections
- [ ] Quota displays show correct remaining count
- [ ] Quota displays show upgrade prompt when near limit
- [ ] Pro badge displays on Pro user profiles
- [ ] Ads hidden for Pro users

### Integration Tests

- [ ] End-to-end subscription flow (checkout → webhook → access)
- [ ] Cancellation removes Pro access at period end
- [ ] Failed payment moves to grace period
- [ ] Trial period provides Pro access
- [ ] Feature access matches entitlement matrix

## Related Documentation

- **[Premium Tiers](./PREMIUM_TIERS.md)** - Pricing and tier benefits
- **[Trials and Discounts](./TRIALS_AND_DISCOUNTS.md)** - Promotion policies
- **[Subscription Privileges Matrix](./SUBSCRIPTION_PRIVILEGES_MATRIX.md)** - Original implementation reference
- **[Stripe Integration](./SUBSCRIPTIONS.md)** - Payment setup
- **[API Documentation](./API.md)** - API endpoints and authentication
- **[Architecture](./ARCHITECTURE.md)** - System architecture

---

**Last Updated**: 2025-11-03  
**Status**: Approved for Implementation  
**Maintainers**: Engineering Team  
**Questions**: Create issue with `entitlement` or `premium` label
