# Mobile Submit Clip Flow - Implementation Documentation

## Overview
This document describes the implementation of the mobile clip submission flow, a multi-step wizard that allows users to submit Twitch clips for review and publication.

## Features

### 1. Multi-Step Wizard UI
The submission flow is divided into four logical steps:

#### Step 1: URL Input
- **Purpose**: Capture the Twitch clip URL from the user
- **Features**:
  - URL validation (Twitch clip format)
  - Support for both formats:
    - `https://clips.twitch.tv/ClipSlug`
    - `https://www.twitch.tv/streamer/clip/ClipSlug`
  - Helpful instructions on how to get clip URLs
  - Real-time validation feedback

#### Step 2: Metadata Override
- **Purpose**: Display auto-detected clip information and allow overrides
- **Features**:
  - Shows detected streamer name and game
  - Optional custom title field (200 characters max)
  - Optional streamer name override
  - Loading state while fetching metadata
  - Clear indication when values are overridden

#### Step 3: Tags & NSFW
- **Purpose**: Add metadata and content warnings
- **Features**:
  - Add up to 5 custom tags
  - Suggested tags for quick selection
  - NSFW toggle with clear explanation
  - Tag management (add/remove)
  - Visual feedback for tag limits

#### Step 4: Review & Submit
- **Purpose**: Final review before submission
- **Features**:
  - Summary of all entered information
  - Highlight of overridden values
  - Visual warning for NSFW content
  - Submission guidelines reminder
  - Submit button with loading state

### 2. Success View
- **Features**:
  - Clear success indicator
  - Status-specific messages (pending/approved)
  - Explanation of next steps
  - Navigation to feed or submit another clip
  - Visual distinction for auto-approved clips

### 3. Error View
- **Features**:
  - Clear error messaging
  - Detailed error information when available
  - Common issues checklist
  - Retry option for transient errors
  - Option to go back and edit

### 4. API Integration

#### Endpoints Used
- `POST /clips/submit` - Submit a new clip
- `GET /submissions` - Get user's submissions
- `GET /submissions/stats` - Get submission statistics

#### Request Format
```typescript
{
  clip_url: string;
  custom_title?: string;
  broadcaster_name_override?: string;
  tags?: string[];
  is_nsfw?: boolean;
  submission_reason?: string;
}
```

#### Response Format
```typescript
{
  success: boolean;
  message: string;
  submission: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    // ... other fields
  }
}
```

### 5. Validation

#### Client-Side Validation
- URL format validation using regex
- Empty field checks
- Tag count limits (max 5)
- Character limits (title: 200 chars, tags: 20 chars each)

#### Server-Side Validation (Handled by API)
- Duplicate clip detection
- Rate limiting (5 per hour, 20 per day)
- Karma requirements (100 minimum)
- Clip quality checks (age, duration, metadata)
- Authentication verification

### 6. Error Handling

The implementation uses the enhanced API client error types:
- `NETWORK` - Network connectivity issues
- `TIMEOUT` - Request timeout
- `OFFLINE` - Device is offline
- `RATE_LIMIT` - Rate limit exceeded
- `AUTH` - Authentication required or failed
- `VALIDATION` - Validation errors (duplicate, karma, etc.)
- `SERVER` - Server errors
- `UNKNOWN` - Unexpected errors

Each error type has:
- User-friendly message
- Technical details for debugging
- Retry capability indicator

## User Flow

```
[Start] → Authentication Check
    ↓
[Step 1] URL Input
    ↓ (validate & fetch metadata)
[Step 2] Metadata Override
    ↓
[Step 3] Tags & NSFW
    ↓
[Step 4] Review & Submit
    ↓ (API call)
[Success] → Feed or Submit Another
    OR
[Error] → Retry or Cancel
```

## Component Architecture

```
app/submit/index.tsx (Main orchestrator)
    ├── components/submit/StepIndicator.tsx
    ├── components/submit/UrlInputStep.tsx
    ├── components/submit/MetadataOverrideStep.tsx
    ├── components/submit/TagsNsfwStep.tsx
    ├── components/submit/ReviewSubmitStep.tsx
    ├── components/submit/SuccessView.tsx
    └── components/submit/ErrorView.tsx
```

## State Management

The submit screen manages state using React hooks:
- `currentStep` - Current step in the wizard
- `clipUrl` - The clip URL being submitted
- `customTitle` - Optional custom title
- `streamerOverride` - Optional streamer name override
- `tags` - Array of tags (max 5)
- `isNsfw` - NSFW flag
- `clipMetadata` - Fetched clip metadata
- `isLoadingMetadata` - Loading state for metadata fetch
- `isSubmitting` - Loading state for submission
- `submissionResult` - Result of submission (success/error)

## Styling

The implementation uses:
- NativeWind (Tailwind CSS for React Native)
- Consistent color scheme with primary colors
- Responsive layouts
- Platform-specific behavior (iOS/Android)

## Authentication Integration

The flow checks authentication at mount and before submission:
- Redirects to login if not authenticated
- Shows appropriate error message
- Passes authentication token in API requests

## Future Enhancements

Potential improvements for future iterations:
1. Real-time clip preview during metadata step
2. Clip thumbnail display
3. Save draft functionality
4. Submission history view
5. Edit/delete submitted clips (before approval)
6. Rich text editor for custom titles
7. More sophisticated tag suggestions based on content
8. Social sharing of approved clips
9. Notification when submission is reviewed

## Testing

The implementation includes:
- TypeScript type checking
- ESLint validation
- Basic test structure (expandable)

To add comprehensive tests:
1. Set up React Native Testing Library
2. Test each step component in isolation
3. Test navigation between steps
4. Test API integration with mocks
5. Test error scenarios
6. Test validation logic

## Accessibility

The implementation follows React Native accessibility guidelines:
- Semantic component usage
- Clear text labels
- Appropriate touch targets
- Color contrast for readability
- Screen reader support (via default RN components)

## Performance Considerations

- Lazy loading of step components
- Efficient state updates
- Debounced validation
- Minimal re-renders
- Optimized scroll views

## Deployment Notes

Before deploying to production:
1. Update the mock metadata fetching with real API integration
2. Configure proper error tracking (Sentry integration ready)
3. Test on both iOS and Android devices
4. Test various network conditions
5. Verify authentication flows
6. Load test submission endpoints
7. Review and update submission guidelines
8. Set up monitoring for submission rates

## API Backend Requirements

The backend should implement:
- `/clips/submit` endpoint with validation
- Duplicate detection logic
- Rate limiting middleware
- Karma verification
- Twitch API integration for metadata
- Moderation queue system
- Auto-approval logic for trusted users
- Notification system for review results

## Security Considerations

- CSRF protection (via backend)
- Rate limiting (via backend)
- Input sanitization (via backend)
- Authentication token validation
- Secure token storage (expo-secure-store)
- Content moderation before publication

## Monitoring and Analytics

Recommended metrics to track:
- Submission attempts
- Successful submissions
- Failed submissions (by error type)
- Average time to complete submission
- Step abandonment rates
- Auto-approval rate
- Manual review queue length
- Time to approval/rejection

## Support and Documentation

For users:
- In-app help text
- Submission guidelines
- FAQ section (future)
- Support contact information

For developers:
- This documentation
- API documentation
- Component prop types
- Code comments
