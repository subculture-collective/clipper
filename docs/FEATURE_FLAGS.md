# Feature Flags Guide

This document describes the feature flag system in Clipper and how to use it for gradual rollouts and testing.

## Table of Contents

- [Overview](#overview)
- [Available Feature Flags](#available-feature-flags)
- [Configuration](#configuration)
- [Usage in Code](#usage-in-code)
- [Deployment Strategy](#deployment-strategy)
- [Best Practices](#best-practices)

## Overview

Feature flags allow us to:

- **Gradual Rollout**: Enable features for a subset of users or environments
- **A/B Testing**: Test different feature variations
- **Quick Rollback**: Disable problematic features without code deployment
- **Environment-Specific**: Enable different features in staging vs production
- **Risk Mitigation**: Test features in production with limited exposure

## Available Feature Flags

### FEATURE_SEMANTIC_SEARCH

**Default**: `false`  
**Dependencies**: Requires `EMBEDDING_ENABLED=true` and `OPENAI_API_KEY`

Enables semantic search capabilities using vector embeddings.

**When enabled:**
- Clips can be searched using natural language queries
- Semantic similarity ranking is available
- Background job generates embeddings for new clips

**Use case**: Enable in staging first, then gradually in production after validating performance impact.

### FEATURE_PREMIUM_SUBSCRIPTIONS

**Default**: `false`  
**Dependencies**: Requires Stripe configuration (`STRIPE_SECRET_KEY`)

Enables premium subscription features and payment processing.

**When enabled:**
- Subscription checkout flows available
- Premium features unlocked for subscribers
- Webhook handling for subscription events
- Dunning process for failed payments

**Use case**: Enable after Stripe integration is fully tested and legal/billing processes are ready.

### FEATURE_EMAIL_NOTIFICATIONS

**Default**: `false`  
**Dependencies**: Requires `EMAIL_ENABLED=true` and `SENDGRID_API_KEY`

Enables email notification system for user alerts.

**When enabled:**
- Users receive email notifications for events (comments, votes, etc.)
- Welcome emails sent on registration
- Email preferences available in user settings
- Rate limiting enforced

**Use case**: Enable after email templates are ready and SMTP/SendGrid is configured.

### FEATURE_PUSH_NOTIFICATIONS

**Default**: `false`  
**Dependencies**: Mobile app push notification service configured

Enables push notifications for mobile apps.

**When enabled:**
- Push notifications sent for mobile app events
- Device token registration available
- Notification preferences in settings

**Use case**: Enable when mobile app is deployed and push notification service is configured.

### FEATURE_ANALYTICS

**Default**: `true`

Enables analytics tracking and metrics collection.

**When enabled:**
- User activity tracked
- Analytics events logged
- Metrics collected for monitoring
- Analytics dashboard available

**Use case**: Enabled by default for monitoring and insights.

### FEATURE_MODERATION

**Default**: `true`

Enables moderation features for content management.

**When enabled:**
- Report system available
- Moderation queue accessible
- Admin moderation tools available
- Content flagging and review workflows

**Use case**: Enabled by default for community management.

### FEATURE_DISCOVERY_LISTS

**Default**: `false`

Enables curated discovery lists and featured content.

**When enabled:**
- Discovery lists available in feed
- Featured content sections displayed
- List management in admin panel
- Custom content curation

**Use case**: Enable when editorial process and list management tools are ready.

## Configuration

### Environment Variables

Set feature flags in your `.env` file or environment:

```bash
# Development - test new features
FEATURE_SEMANTIC_SEARCH=true
FEATURE_PREMIUM_SUBSCRIPTIONS=false
FEATURE_EMAIL_NOTIFICATIONS=false
FEATURE_PUSH_NOTIFICATIONS=false
FEATURE_ANALYTICS=true
FEATURE_MODERATION=true
FEATURE_DISCOVERY_LISTS=false
```

```bash
# Production - conservative approach
FEATURE_SEMANTIC_SEARCH=false    # Enable after performance testing
FEATURE_PREMIUM_SUBSCRIPTIONS=false  # Enable after legal/billing ready
FEATURE_EMAIL_NOTIFICATIONS=false    # Enable after template testing
FEATURE_PUSH_NOTIFICATIONS=false     # Enable with mobile app launch
FEATURE_ANALYTICS=true               # Always enabled
FEATURE_MODERATION=true              # Always enabled
FEATURE_DISCOVERY_LISTS=false        # Enable when lists are curated
```

### Configuration File

Feature flags are loaded in `backend/config/config.go`:

```go
FeatureFlags: FeatureFlagsConfig{
    SemanticSearch:       getEnv("FEATURE_SEMANTIC_SEARCH", "false") == "true",
    PremiumSubscriptions: getEnv("FEATURE_PREMIUM_SUBSCRIPTIONS", "false") == "true",
    EmailNotifications:   getEnv("FEATURE_EMAIL_NOTIFICATIONS", "false") == "true",
    PushNotifications:    getEnv("FEATURE_PUSH_NOTIFICATIONS", "false") == "true",
    Analytics:            getEnv("FEATURE_ANALYTICS", "true") == "true",
    Moderation:           getEnv("FEATURE_MODERATION", "true") == "true",
    DiscoveryLists:       getEnv("FEATURE_DISCOVERY_LISTS", "false") == "true",
}
```

## Usage in Code

### Backend (Go)

Access feature flags through the config:

```go
package handlers

import (
    "github.com/subculture-collective/clipper/backend/config"
)

func (h *Handler) SearchClips(c *gin.Context) {
    cfg := c.MustGet("config").(*config.Config)
    
    // Check if semantic search is enabled
    if cfg.FeatureFlags.SemanticSearch {
        // Use semantic search
        results, err := h.searchService.SemanticSearch(query)
    } else {
        // Use traditional full-text search
        results, err := h.searchService.FullTextSearch(query)
    }
}
```

```go
// In service layer
func (s *ClipService) CreateClip(clip *models.Clip) error {
    // Save clip
    err := s.repo.Create(clip)
    if err != nil {
        return err
    }
    
    // Generate embeddings if feature is enabled
    if s.config.FeatureFlags.SemanticSearch && s.config.Embedding.Enabled {
        go s.embeddingService.GenerateEmbedding(clip.ID)
    }
    
    return nil
}
```

### Frontend (TypeScript/React)

Feature flags should be exposed through the API:

```typescript
// types/config.ts
export interface FeatureFlags {
  semanticSearch: boolean;
  premiumSubscriptions: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  analytics: boolean;
  moderation: boolean;
  discoveryLists: boolean;
}

// API endpoint to get feature flags
// GET /api/v1/config/features
export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  const response = await api.get('/api/v1/config/features');
  return response.data;
};
```

```tsx
// Usage in components
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

function SearchBar() {
  const { semanticSearch } = useFeatureFlags();
  
  return (
    <div>
      <input type="text" placeholder="Search clips..." />
      {semanticSearch && (
        <div className="hint">
          💡 Try natural language search like "funny fail moments"
        </div>
      )}
    </div>
  );
}
```

```tsx
// Conditional rendering
function ClipCard({ clip }) {
  const { premiumSubscriptions } = useFeatureFlags();
  
  return (
    <div className="clip-card">
      <ClipVideo clip={clip} />
      {premiumSubscriptions && clip.isPremium && (
        <PremiumBadge />
      )}
    </div>
  );
}
```

## Deployment Strategy

### Phase 1: Development Testing

1. Enable feature flag in development environment
2. Test thoroughly with realistic data
3. Verify feature works as expected
4. Measure performance impact

```bash
# .env.development
FEATURE_NEW_FEATURE=true
```

### Phase 2: Staging Validation

1. Enable feature flag in staging
2. Run full test suite
3. Perform manual testing
4. Run load tests if needed
5. Gather feedback from team

```bash
# .env.staging
FEATURE_NEW_FEATURE=true
```

### Phase 3: Production Rollout

#### Option A: Immediate Enable (Low Risk Features)

```bash
# .env.production
FEATURE_NEW_FEATURE=true
```

Deploy and monitor closely for 24-48 hours.

#### Option B: Gradual Rollout (High Risk Features)

For features with potential impact:

1. **Week 1**: Internal team only (5% of users)
   ```bash
   FEATURE_NEW_FEATURE=true
   # + Code logic to check if user is internal
   ```

2. **Week 2**: Beta users (10% of users)
   ```bash
   # Expand to beta testers
   ```

3. **Week 3**: Wider rollout (50% of users)
   ```bash
   # A/B test with 50% of users
   ```

4. **Week 4**: Full rollout (100% of users)
   ```bash
   FEATURE_NEW_FEATURE=true
   # Remove percentage-based logic
   ```

#### Option C: Rollback (If Issues Found)

If issues are discovered:

```bash
# Quick rollback without code deployment
FEATURE_NEW_FEATURE=false
```

Restart the application:
```bash
docker-compose restart backend
```

## Best Practices

### 1. Default to Safe Values

Always default to `false` for new features:

```go
SemanticSearch: getEnv("FEATURE_SEMANTIC_SEARCH", "false") == "true",
```

### 2. Document Dependencies

Clearly document what must be configured for a feature:

```go
// FEATURE_SEMANTIC_SEARCH
// Requires: EMBEDDING_ENABLED=true, OPENAI_API_KEY set
// Impact: Generates embeddings for all clips, increases API costs
```

### 3. Fail Gracefully

Always have fallback behavior:

```go
if cfg.FeatureFlags.SemanticSearch {
    results, err := h.searchService.SemanticSearch(query)
    if err != nil {
        // Fallback to traditional search
        log.Warn("Semantic search failed, falling back to full-text")
        results, err = h.searchService.FullTextSearch(query)
    }
}
```

### 4. Monitor Flag Usage

Log when features are used:

```go
if cfg.FeatureFlags.SemanticSearch {
    log.Info("Using semantic search", "query", query)
    // ... semantic search logic
}
```

### 5. Clean Up Old Flags

Remove feature flags once features are stable:

```go
// Before (with flag)
if cfg.FeatureFlags.DiscoveryLists {
    // feature code
}

// After (flag removed, feature always on)
// feature code
```

### 6. Test Both States

Always test with feature enabled AND disabled:

```go
func TestClipSearch(t *testing.T) {
    t.Run("with semantic search enabled", func(t *testing.T) {
        cfg := &config.Config{
            FeatureFlags: config.FeatureFlagsConfig{
                SemanticSearch: true,
            },
        }
        // test logic
    })
    
    t.Run("with semantic search disabled", func(t *testing.T) {
        cfg := &config.Config{
            FeatureFlags: config.FeatureFlagsConfig{
                SemanticSearch: false,
            },
        }
        // test logic
    })
}
```

### 7. Communicate Changes

Before enabling a feature in production:

- Notify the team in Slack/Discord
- Update deployment notes
- Brief support team on new features
- Prepare rollback plan

### 8. Monitor After Enabling

After enabling a feature:

- Watch error rates in Sentry
- Monitor API response times
- Check database query performance
- Review user feedback
- Track resource usage (CPU, memory, API costs)

## Runtime Flag Updates

Currently, feature flags require application restart. For hot-reloading:

1. **Option 1**: Use environment variable reload signal
   ```bash
   # Send SIGHUP to reload config
   kill -HUP $(pgrep -f "clipper-backend")
   ```

2. **Option 2**: Use API endpoint (future enhancement)
   ```bash
   # Admin API to update flags
   curl -X POST /api/v1/admin/features/semantic-search/enable
   ```

3. **Option 3**: Use external feature flag service
   - LaunchDarkly
   - Split.io
   - Feature flagging as a service

## Checklist for New Feature Flags

When adding a new feature flag:

- [ ] Add to `FeatureFlagsConfig` struct
- [ ] Add environment variable to `.env.example`
- [ ] Add environment variable to `.env.production.example`
- [ ] Document in this guide
- [ ] Add to preflight checklist if needed
- [ ] Add default value (usually `false`)
- [ ] Implement in relevant handlers/services
- [ ] Add frontend hook/utility if needed
- [ ] Test with flag enabled and disabled
- [ ] Update deployment documentation

## Examples

### Example: Gradual Premium Rollout

```bash
# Week 1: Staging testing
# staging.env
FEATURE_PREMIUM_SUBSCRIPTIONS=true
STRIPE_SECRET_KEY=sk_test_...

# Week 2: Production with whitelist
# production.env
FEATURE_PREMIUM_SUBSCRIPTIONS=true
STRIPE_SECRET_KEY=sk_live_...
# + Code check for beta user list

# Week 3: Full rollout
# production.env
FEATURE_PREMIUM_SUBSCRIPTIONS=true
STRIPE_SECRET_KEY=sk_live_...
# Remove beta user check
```

### Example: Emergency Disable

```bash
# Production issue detected with semantic search
# 1. SSH to server
ssh deploy@production-server

# 2. Update environment variable
cd /opt/clipper
sed -i 's/FEATURE_SEMANTIC_SEARCH=true/FEATURE_SEMANTIC_SEARCH=false/' .env

# 3. Restart application
docker-compose restart backend

# 4. Verify feature disabled
curl https://clipper.example.com/api/v1/config/features | jq '.semanticSearch'
# Should return: false

# 5. Monitor for stabilization
docker-compose logs -f backend --tail=100
```

## References

- [Preflight Checklist](./PREFLIGHT_CHECKLIST.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Configuration Documentation](./CONFIGURATION.md)
- [Martin Fowler - Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-14 | Initial feature flags documentation | DevOps Team |

---

**Remember**: Feature flags are powerful but add complexity. Use them wisely and remove them once features are stable.
