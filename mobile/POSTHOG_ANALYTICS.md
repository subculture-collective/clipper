# PostHog Analytics Integration

This document describes the PostHog analytics implementation for the Clipper mobile app.

## Overview

PostHog is integrated into the React Native/Expo mobile app to provide product analytics, feature flags, and user insights while respecting user privacy preferences.

## Features

### Analytics Tracking
- **40+ Product Events**: Pre-defined event schemas covering authentication, submissions, engagement, premium features, navigation, settings, errors, and performance
- **Screen View Tracking**: Automatic tracking of screen navigation with context
- **User Properties**: Track user metadata, roles, and behavior
- **Device Properties**: Automatically collect device info (OS, model, locale, timezone)
- **Error Tracking**: Capture errors with stack traces and context

### Feature Flags
- Retrieve feature flag values for A/B testing and gradual rollouts
- Check if specific features are enabled
- Force reload flags from server
- Support for boolean and variant flags

### Privacy Controls
- **Opt-in by Default**: Analytics disabled until explicit user consent
- **Consent Integration**: Respects ConsentContext preferences
- **User Control**: Enable/disable tracking at any time
- **No PII**: Minimal personally identifiable information collected
- **Anonymization**: Option to reset user identity

### Session Management
- Cohesive session tracking across app lifecycle
- App lifecycle event tracking (foreground/background)
- Deep link tracking

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Enable analytics tracking (set to false to disable)
EXPO_PUBLIC_ENABLE_ANALYTICS=true

# PostHog Configuration
EXPO_PUBLIC_POSTHOG_API_KEY=your_posthog_api_key_here
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Dependencies

The following packages are required:

```json
{
  "posthog-react-native": "^4.x",
  "expo-file-system": "^19.x",
  "expo-application": "^7.x",
  "expo-device": "^8.x",
  "expo-localization": "^17.x"
}
```

Install with:

```bash
npm install posthog-react-native expo-file-system expo-application expo-device expo-localization
```

## Architecture

### Components

1. **lib/analytics.ts** - Core analytics module
   - PostHog SDK initialization
   - Event tracking functions
   - Feature flag management
   - Privacy controls

2. **components/PostHogProvider.tsx** - React Provider
   - Wraps app to provide analytics context
   - Handles screen view tracking
   - Integrates with ConsentContext and AuthContext
   - Manages user identification

3. **Integration Points**:
   - `ConsentContext`: Privacy preferences
   - `AuthContext`: User identification
   - `expo-router`: Screen navigation tracking

### Data Flow

```
User Action
    ↓
Event Tracking Function (trackEvent, trackScreenView, etc.)
    ↓
Check if Analytics Enabled (config.enabled)
    ↓
Check User Consent (ConsentContext)
    ↓
PostHog SDK (capture event)
    ↓
PostHog Server
```

## Usage

### Initialize Analytics

Analytics is automatically initialized in `app/_layout.tsx` via the `PostHogProvider`:

```tsx
<ConsentProvider>
  <PostHogProvider>
    {/* Your app components */}
  </PostHogProvider>
</ConsentProvider>
```

### Track Events

```typescript
import {  
  trackEvent,
  AuthEvents,
  SubmissionEvents,
  EngagementEvents
} from '@/lib/analytics';

// Track a simple event
trackEvent(AuthEvents.LOGIN_COMPLETED);

// Track an event with properties
trackEvent(SubmissionEvents.SUBMISSION_VIEWED, {
  submission_id: '123',
  submission_type: 'clip',
  duration_seconds: 45,
});

// Track user engagement
trackEvent(EngagementEvents.UPVOTE_CLICKED, {
  content_id: '456',
  content_type: 'clip',
});
```

### Track Screen Views

Screen views are tracked automatically by the `PostHogProvider`. You can also track them manually:

```typescript
import { trackScreenView } from '@/lib/analytics';

trackScreenView('SettingsScreen', {
  previous_screen: 'ProfileScreen',
});
```

### Identify Users

User identification happens automatically when users log in (via `AuthContext` integration):

```typescript
import { identifyUser, resetUser } from '@/lib/analytics';

// Manually identify a user
identifyUser('user_123', {
  username: 'johndoe',
  role: 'user',
  plan: 'free',
  reputation_score: 100,
});

// Reset user identity on logout
resetUser();
```

### Track Errors

```typescript
import { trackError, ErrorEvents } from '@/lib/analytics';

try {
  // Some code that might fail
} catch (error) {
  trackError(error as Error, {
    errorType: 'NetworkError',
    errorCode: 'TIMEOUT',
  });
}
```

### Feature Flags

```typescript
import {
  isFeatureFlagEnabled,
  getFeatureFlag,
  getAllFeatureFlags,
  reloadFeatureFlags,
} from '@/lib/analytics';

// Check if a feature is enabled
if (isFeatureFlagEnabled('new-ui-redesign')) {
  // Show new UI
}

// Get feature flag value (supports variants)
const theme = getFeatureFlag('theme-variant', 'default');

// Get all flags
const flags = getAllFeatureFlags();

// Force reload flags from server
await reloadFeatureFlags();
```

### Group Analytics

```typescript
import { groupIdentify } from '@/lib/analytics';

// Associate user with a group/organization
groupIdentify('company', 'acme-corp', {
  name: 'Acme Corporation',
  plan: 'enterprise',
  employee_count: 500,
});
```

## Event Schema

### Event Categories

All events are organized into categories for consistency:

- **AuthEvents**: Authentication and authorization events
- **SubmissionEvents**: Clip submission lifecycle events
- **EngagementEvents**: User engagement (votes, comments, follows)
- **PremiumEvents**: Subscription and payment events
- **NavigationEvents**: Screen views and navigation
- **SettingsEvents**: User preferences and settings
- **ErrorEvents**: Error tracking
- **PerformanceEvents**: Performance metrics

### Example Events

```typescript
// Authentication
trackEvent(AuthEvents.SIGNUP_STARTED);
trackEvent(AuthEvents.LOGIN_COMPLETED);
trackEvent(AuthEvents.OAUTH_CALLBACK, { provider: 'twitch' });

// Submissions
trackEvent(SubmissionEvents.SUBMISSION_CREATE_STARTED);
trackEvent(SubmissionEvents.SUBMISSION_VIEWED, { 
  submission_id: '123',
  from_search: true 
});

// Engagement
trackEvent(EngagementEvents.UPVOTE_CLICKED, { content_id: '456' });
trackEvent(EngagementEvents.COMMENT_CREATE_COMPLETED, {
  comment_length: 50,
  has_mentions: true,
});

// Errors
trackEvent(ErrorEvents.API_ERROR, {
  endpoint: '/api/clips',
  status_code: 500,
});
```

## Privacy & GDPR Compliance

### Privacy-First Design

1. **Opt-in by Default**: Analytics is disabled until user explicitly grants consent
2. **Consent Management**: Integrated with `ConsentContext` for GDPR compliance
3. **User Control**: Users can enable/disable at any time in settings
4. **Data Minimization**: Only collect necessary data
5. **No Sensitive PII**: Email addresses and other sensitive data are not tracked
6. **Anonymization**: Users can reset their identity

### Consent Flow

```typescript
import { useConsent } from '@/contexts/ConsentContext';
import { enableAnalytics, disableAnalytics } from '@/lib/analytics';

function PrivacySettings() {
  const { consent, updateConsent } = useConsent();
  
  const handleToggleAnalytics = async (enabled: boolean) => {
    if (enabled) {
      await enableAnalytics();
      await updateConsent({ analytics: true });
    } else {
      await disableAnalytics();
      await updateConsent({ analytics: false });
    }
  };
  
  return (
    <Switch
      value={consent.analytics}
      onValueChange={handleToggleAnalytics}
    />
  );
}
```

### What We Track

**Automatically Collected:**
- Device type, OS, and version
- App version and build number
- Device locale and timezone
- Screen dimensions
- Network connectivity status

**User-Provided:**
- User ID (non-sensitive identifier)
- Username (public profile name)
- User role and reputation score
- User preferences (theme, language)

**NOT Tracked:**
- Email addresses
- Passwords or tokens
- Payment information
- Private messages
- IP addresses (anonymized by PostHog)

## Testing

Tests are located in `__tests__/posthog-analytics.test.ts`.

Run tests:

```bash
npm test -- __tests__/posthog-analytics.test.ts
```

Test coverage includes:
- Initialization with/without consent
- Event tracking
- User identification
- Feature flags
- Privacy controls
- Error tracking
- Group analytics

## Debugging

Enable debug mode during development:

```typescript
// Debug mode is automatically enabled in __DEV__
if (__DEV__) {
  console.log('[Analytics] Debug mode enabled');
}
```

Check if analytics is working:

```typescript
import { isAnalyticsEnabled, getPostHogClient } from '@/lib/analytics';

console.log('Analytics enabled:', isAnalyticsEnabled());
console.log('PostHog client:', getPostHogClient());
```

## Performance Considerations

- **Lazy Loading**: PostHog SDK is only loaded after user grants consent
- **Batch Events**: Events are batched and sent efficiently
- **Minimal Overhead**: < 50KB additional bundle size
- **Async Operations**: All tracking operations are asynchronous
- **Caching**: Feature flags are cached locally

## Migration from Stub Implementation

The existing analytics.ts stub implementation has been replaced with full PostHog integration. If you were using the previous stub, note these changes:

1. Events are now actually sent to PostHog (not just logged)
2. Feature flags now work (no longer return default values)
3. User identification persists across sessions
4. Privacy controls are more robust

## Troubleshooting

### Analytics not working

1. Check environment variables are set correctly
2. Verify user has granted analytics consent
3. Check `EXPO_PUBLIC_ENABLE_ANALYTICS` is `'true'`
4. Ensure PostHog API key is valid

### Events not appearing in PostHog

1. Events may take a few minutes to appear in PostHog dashboard
2. Check debug console for "[Analytics]" logs
3. Verify network connectivity
4. Check PostHog host is accessible

### Feature flags not loading

1. Ensure PostHog project has feature flags configured
2. Call `reloadFeatureFlags()` after user login
3. Check user is properly identified
4. Verify API key has feature flags permission

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog React Native SDK](https://posthog.com/docs/libraries/react-native)
- [Feature Flags Guide](https://posthog.com/docs/feature-flags)
- [Privacy & GDPR](https://posthog.com/docs/privacy)

## Support

For issues or questions:
1. Check this documentation
2. Review PostHog SDK documentation
3. Check mobile/ARCHITECTURE.md for app structure
4. Open an issue in the repository
