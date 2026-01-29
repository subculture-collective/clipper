---
title: "Entitlements"
summary: "Feature access control and gating based on subscription tier."
tags: ["premium", "entitlements", "access-control"]
area: "product"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["feature gates", "access control"]
---

# Entitlements

Feature access control based on subscription tier.

## Principles

1. **Consistency**: Features behave the same across web, mobile, API
2. **Transparency**: Clear messaging when features are gated
3. **Grace**: Helpful upgrade prompts, not frustrating blocks
4. **Progressive**: Free provides value; Pro removes friction

## Entitlement Check

Backend middleware verifies subscription status:

```go
func RequirePro(c *gin.Context) {
  user := GetUserFromContext(c)
  if user.Subscription.Tier != "pro" || user.Subscription.Status != "active" {
    c.JSON(403, gin.H{"error": "Pro subscription required"})
    return
  }
  c.Next()
}
```

Frontend hook:

```tsx
const { isPro, canUseFeature } = useEntitlement();

if (!canUseFeature('collections')) {
  return <UpgradePrompt feature="Collections" />;
}
```

## Feature Gates

### Quota-Based

- Favorites: Check count before allowing new favorite
- Clip submissions: Rate limit per day based on tier
- Collections: Binary gate (0 for free, unlimited for pro)

### Filter-Based

- Advanced search filters disabled in UI for free tier
- API rejects filter params if not entitled
- Saved searches hidden from free users

### Access-Based

- Data export endpoint returns 403 for free tier
- Ad-free experience controlled by tier flag
- Priority support badge shown only to Pro users

## Implementation

Database:

```sql
SELECT tier, status FROM subscriptions WHERE user_id = $1;
```

Service layer:

```go
func (s *UserService) CanCreateCollection(userID string) bool {
  sub, _ := s.subscriptionRepo.GetByUserID(userID)
  return sub.Tier == "pro" && sub.Status == "active"
}
```

Frontend:

```tsx
const canCreateCollection = isPro && subscription.status === 'active';
```

## Upgrade Flow

1. User attempts gated feature
2. Check entitlement
3. If denied, show PaywallModal with feature context
4. Track analytics event: `feature_gate_encountered`
5. User proceeds to checkout or dismisses

## Grace Period

Users with expired subscriptions retain Pro features for 7 days to allow payment recovery.

## Testing

Mock subscription in tests:

```go
user.Subscription = &models.Subscription{
  Tier: "pro",
  Status: "active",
}
```

Frontend:

```tsx
<EntitlementProvider value={{ isPro: true }}>
  <YourComponent />
</EntitlementProvider>
```

---

Related: [[overview|Overview]] · [[tiers|Tiers]] · [[stripe|Stripe]] · [[../backend/api|API]]

[[../index|← Back to Index]]
