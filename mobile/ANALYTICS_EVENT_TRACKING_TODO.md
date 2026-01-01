# Event Tracking Implementation Notes

## Current State

### ✅ Implemented
- **Screen View Tracking**: Automatic via `PostHogProvider.tsx`
  - Tracks all screen navigation automatically
  - Includes pathname and previous pathname context
  - Works for all screens in the app

- **User Identification**: Automatic when logged in
  - User ID, username, display name
  - User role and reputation score
  - Account creation date

- **Device Properties**: Automatic collection
  - App version and build number
  - Device OS, model, brand
  - Locale and timezone
  - Platform (always "mobile")

### 🟡 Needs Implementation

To fully utilize the dashboard suite, the following event tracking should be added to the mobile app:

#### 1. Authentication Events (Priority: High)
**Location**: `app/auth/` screens

```typescript
import { trackEvent, AuthEvents } from '@/lib/analytics';

// In signup flow
trackEvent(AuthEvents.SIGNUP_STARTED);
trackEvent(AuthEvents.SIGNUP_COMPLETED);

// In login flow
trackEvent(AuthEvents.LOGIN_STARTED);
trackEvent(AuthEvents.LOGIN_COMPLETED);
trackEvent(AuthEvents.LOGIN_FAILED, { error_type: 'invalid_credentials' });

// In OAuth flow
trackEvent(AuthEvents.OAUTH_REDIRECT, { provider: 'twitch' });
trackEvent(AuthEvents.OAUTH_CALLBACK, { provider: 'twitch', success: true });

// On logout
trackEvent(AuthEvents.LOGOUT);
```

#### 2. Submission Events (Priority: High)
**Location**: `app/submit/`, video player components

```typescript
import { trackEvent, SubmissionEvents } from '@/lib/analytics';

// When viewing a clip
trackEvent(SubmissionEvents.SUBMISSION_VIEWED, {
  submission_id: clip.id,
  submission_type: 'clip',
  from_search: false,
});

// When playing a clip
trackEvent(SubmissionEvents.SUBMISSION_PLAY_STARTED, {
  submission_id: clip.id,
  duration_seconds: clip.duration,
});

// When clip finishes playing
trackEvent(SubmissionEvents.SUBMISSION_PLAY_COMPLETED, {
  submission_id: clip.id,
  watch_percentage: 100,
});

// In submission creation flow
trackEvent(SubmissionEvents.SUBMISSION_CREATE_STARTED);
trackEvent(SubmissionEvents.SUBMISSION_CREATE_COMPLETED, {
  submission_id: newSubmission.id,
  has_custom_title: !!customTitle,
});
trackEvent(SubmissionEvents.SUBMISSION_CREATE_FAILED, {
  error_type: 'validation_error',
});

// When sharing
trackEvent(SubmissionEvents.SUBMISSION_SHARE_CLICKED, {
  submission_id: clip.id,
});
trackEvent(SubmissionEvents.SUBMISSION_SHARED, {
  submission_id: clip.id,
  share_method: 'native_share',
});
```

#### 3. Engagement Events (Priority: Medium)
**Location**: Voting components, comment components, follow buttons

```typescript
import { trackEvent, EngagementEvents } from '@/lib/analytics';

// Voting
trackEvent(EngagementEvents.UPVOTE_CLICKED, {
  content_id: clip.id,
  content_type: 'submission',
});

trackEvent(EngagementEvents.DOWNVOTE_CLICKED, {
  content_id: clip.id,
  content_type: 'submission',
});

// Comments
trackEvent(EngagementEvents.COMMENT_CREATE_STARTED, {
  parent_type: 'submission',
  parent_id: clip.id,
});

trackEvent(EngagementEvents.COMMENT_CREATE_COMPLETED, {
  comment_id: newComment.id,
  comment_length: newComment.body.length,
  has_mentions: newComment.body.includes('@'),
});

// Follow
trackEvent(EngagementEvents.FOLLOW_CLICKED, {
  target_type: 'streamer',
  target_id: streamer.id,
});

// Search
trackEvent(EngagementEvents.SEARCH_PERFORMED, {
  query: searchTerm,
  results_count: results.length,
});

trackEvent(EngagementEvents.SEARCH_RESULT_CLICKED, {
  query: searchTerm,
  result_position: index,
  result_id: result.id,
});
```

#### 4. Error Events (Priority: High for Stability Dashboard)
**Location**: Error boundaries, API error handlers, video player error handlers

```typescript
import { trackError, ErrorEvents } from '@/lib/analytics';

// In error boundaries or try-catch blocks
try {
  await api.submitClip(data);
} catch (error) {
  trackError(error as Error, {
    errorType: 'ApiError',
    errorCode: 'SUBMISSION_FAILED',
  });
}

// Video playback errors
trackEvent(ErrorEvents.VIDEO_PLAYBACK_ERROR, {
  error_message: error.message,
  video_id: clip.id,
  error_code: error.code,
});

// Network errors
trackEvent(ErrorEvents.NETWORK_ERROR, {
  endpoint: '/api/clips',
  error_message: error.message,
});
```

#### 5. Performance Events (Priority: Low)
**Location**: Performance monitoring code

```typescript
import { trackEvent, PerformanceEvents } from '@/lib/analytics';

// Page load time
trackEvent(PerformanceEvents.PAGE_LOAD_TIME, {
  screen_name: 'HomeScreen',
  duration: loadTime,
});

// API response time
trackEvent(PerformanceEvents.API_RESPONSE_TIME, {
  endpoint: '/api/clips',
  duration: responseTime,
});

// Video load time
trackEvent(PerformanceEvents.VIDEO_LOAD_TIME, {
  video_id: clip.id,
  duration: loadTime,
});
```

## Implementation Priority

### Phase 1: Critical for Dashboards (Week 1)
1. **Authentication Events** - Needed for onboarding funnel
2. **Submission Events** - Needed for content engagement funnel
3. **Error Events** - Needed for stability dashboard

### Phase 2: Enhanced Analytics (Week 2)
4. **Engagement Events** - Voting, comments, follows
5. **Search Events** - Search tracking

### Phase 3: Optimization (Week 3+)
6. **Performance Events** - Load times, response times
7. **Custom Properties** - Additional context as needed

## Testing Event Tracking

After implementing event tracking, test in development:

```typescript
// In a development-only screen or debug panel
import { getPostHogClient } from '@/lib/analytics';

// Enable PostHog debug mode
const client = getPostHogClient();
if (client && __DEV__) {
  console.log('[Analytics] PostHog Debug Mode Enabled');
  // Check console for event tracking
}
```

Or use PostHog's Live Events view:
1. Go to PostHog → Live Events
2. Filter by `platform = mobile`
3. Perform actions in the app
4. Verify events appear in real-time

## Dashboard Readiness

### Ready Now (with current tracking)
- ✅ **Screen Views Dashboard** - Automatic screen tracking is working
- ✅ **DAU/MAU Dashboard** - User identification is working

### Needs Manual Events
- 🟡 **User Funnels Dashboard** - Needs auth and submission events
- 🟡 **Retention Dashboard** - Needs engagement events
- 🟡 **Stability Dashboard** - Needs error tracking

## Code Examples

### Example 1: Submit Flow with Tracking

```typescript
// app/submit/index.tsx
import { trackEvent, SubmissionEvents } from '@/lib/analytics';

const handleSubmit = async () => {
  try {
    trackEvent(SubmissionEvents.SUBMISSION_CREATE_STARTED);
    
    const result = await submitClip({
      clip_url: clipUrl,
      custom_title: customTitle,
      tags: tags,
    });
    
    trackEvent(SubmissionEvents.SUBMISSION_CREATE_COMPLETED, {
      submission_id: result.id,
      has_custom_title: !!customTitle,
      tags_count: tags.length,
    });
    
    setSubmissionResult(result);
  } catch (error) {
    trackEvent(SubmissionEvents.SUBMISSION_CREATE_FAILED, {
      error_type: error.name,
      error_message: error.message,
    });
    
    trackError(error as Error, {
      errorType: 'SubmissionError',
    });
  }
};
```

### Example 2: Auth Flow with Tracking

```typescript
// app/auth/login.tsx
import { trackEvent, AuthEvents } from '@/lib/analytics';

const handleLogin = async (email: string, password: string) => {
  trackEvent(AuthEvents.LOGIN_STARTED);
  
  try {
    await signIn(email, password);
    trackEvent(AuthEvents.LOGIN_COMPLETED);
    router.push('/(tabs)');
  } catch (error) {
    trackEvent(AuthEvents.LOGIN_FAILED, {
      error_type: error.name,
    });
    setError(error.message);
  }
};
```

### Example 3: Video Playback with Tracking

```typescript
// components/VideoPlayer.tsx
import { trackEvent, SubmissionEvents, ErrorEvents } from '@/lib/analytics';

const VideoPlayer = ({ clip }) => {
  const handlePlayStart = () => {
    trackEvent(SubmissionEvents.SUBMISSION_PLAY_STARTED, {
      submission_id: clip.id,
      duration_seconds: clip.duration,
    });
  };
  
  const handlePlayEnd = (watchedSeconds: number) => {
    const watchPercentage = (watchedSeconds / clip.duration) * 100;
    trackEvent(SubmissionEvents.SUBMISSION_PLAY_COMPLETED, {
      submission_id: clip.id,
      watch_percentage: watchPercentage,
      watched_seconds: watchedSeconds,
    });
  };
  
  const handleError = (error: Error) => {
    trackEvent(ErrorEvents.VIDEO_PLAYBACK_ERROR, {
      error_message: error.message,
      video_id: clip.id,
      video_url: clip.url,
    });
  };
  
  return (
    <VideoComponent
      onPlayStart={handlePlayStart}
      onPlayEnd={handlePlayEnd}
      onError={handleError}
      {...otherProps}
    />
  );
};
```

## Verification Checklist

Before considering tracking complete:

- [ ] Auth events firing on signup/login/logout
- [ ] Submission events firing on create/view/play
- [ ] Error events firing on exceptions
- [ ] All events include `platform = mobile` property
- [ ] User ID properly set when logged in
- [ ] Events appear in PostHog Live Events
- [ ] Event properties match expected schema
- [ ] No duplicate events firing

## Dashboard Impact

Once manual event tracking is implemented:

1. **Funnels Dashboard** - Will show complete user journey flows
2. **Retention Dashboard** - Will accurately track engagement-based retention
3. **Stability Dashboard** - Will provide real error rate metrics
4. **Screen Views** - Already working, will be enriched with context
5. **DAU/MAU** - Already working, will show more detailed engagement

**Estimated Implementation Time**: 4-6 hours for core events (Phase 1)

---

**Next Steps**:
1. Create tracking implementation tickets for each screen/flow
2. Add tracking to critical user journeys first (auth, submit, play)
3. Test tracking in development environment
4. Validate with PostHog Live Events
5. Monitor dashboard population as events start flowing
