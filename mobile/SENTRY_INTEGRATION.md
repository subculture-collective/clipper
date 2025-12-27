# Sentry Crash Reporting Integration

This document describes the Sentry crash reporting and performance monitoring integration for the Clipper mobile app.

## Overview

Sentry is integrated to provide:
- **Crash Reporting**: Automatic capture of native crashes (iOS/Android) and JavaScript errors
- **Error Tracking**: Centralized error logging with stack traces and context
- **Performance Monitoring**: Transaction tracking for app startup, navigation, and API calls
- **Release Tracking**: Version and build metadata for each release
- **Source Maps**: Symbolication of minified JavaScript stack traces

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# Sentry DSN (Data Source Name) - Get from Sentry project settings
EXPO_PUBLIC_SENTRY_DSN=https://your-key@sentry.io/your-project-id

# Environment (development, preview, production)
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development

# Enable/disable Sentry (set to true in production)
EXPO_PUBLIC_SENTRY_ENABLED=false
```

### Getting Your Sentry DSN

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new project for "React Native"
3. Copy the DSN from Project Settings → Client Keys (DSN)
4. Set the organization and project name in `app.json` (already configured as `subculture-collective/clipper-mobile`)

## Features

### 1. Automatic Crash Capture

Both native crashes and JavaScript errors are automatically captured and sent to Sentry.

**Native Crashes (iOS/Android)**:
- Uncaught exceptions
- Segmentation faults
- Memory issues
- ANR (Application Not Responding)

**JavaScript Errors**:
- Unhandled promise rejections
- Component render errors (via Error Boundary)
- Runtime exceptions

### 2. Error Boundary

The app is wrapped with an `ErrorBoundary` component that:
- Catches React component errors
- Reports them to Sentry with component stack trace
- Shows a user-friendly error screen
- Provides a "Try Again" option to recover

### 3. User Context

When users authenticate, their context is automatically set in Sentry:
```typescript
// User ID and username are tracked (no PII)
setSentryUser({ id: user.id, username: user.username });
```

This helps identify which users are affected by specific errors.

### 4. Performance Monitoring

Performance transactions are tracked for:

**App Start**:
```typescript
trackAppStart(); // Measures time to first render
```

**Screen Navigation**:
```typescript
trackScreenTransition('HomeScreen'); // Tracks navigation performance
```

**API Requests**:
```typescript
const tracker = trackApiRequest('/api/v1/clips');
// ... make request ...
tracker.finish(200); // Record when request completes with status code
```

**Note**: The performance tracking functions use a simplified approach where spans are created when `finish()` is called. For long-running async operations, consider using Sentry's native span management for more accurate timing.

### 5. PII Scrubbing

Personally Identifiable Information (PII) is automatically removed:
- Request cookies and headers
- User email addresses and phone numbers
- Sensitive breadcrumbs (console logs, auth requests)
- Request/response bodies in fetch breadcrumbs

Only non-identifying information is kept:
- User ID (internal identifier)
- Username (public display name)

### 6. Breadcrumbs

Breadcrumbs provide context leading up to errors:
- Navigation events
- User interactions
- API requests (URL and method only)
- Console messages (filtered)

Add custom breadcrumbs:
```typescript
import { addBreadcrumb } from '../lib/sentry';

addBreadcrumb('User submitted clip', 'user-action', 'info', {
  clipId: '123',
});
```

### 7. Manual Error Reporting

Capture errors manually when needed:

```typescript
import { captureException, captureMessage } from '../lib/sentry';

try {
  // ... some operation
} catch (error) {
  captureException(error, {
    component: 'ClipSubmission',
    action: 'submit',
  });
}

// Or capture a message
captureMessage('Unexpected state detected', 'warning');
```

## Building for Production

### EAS Build Configuration

Source maps are automatically uploaded during EAS builds using the `@sentry/react-native/expo` plugin configured in `app.json`.

Build profiles in `eas.json`:
- **development**: Sentry disabled, useful for local testing
- **preview**: Sentry enabled with preview environment
- **production**: Sentry enabled with production environment

### Build Commands

```bash
# Preview build (internal testing)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all
```

### Source Map Upload

Source maps are automatically uploaded during the build process. The Sentry plugin:
1. Generates source maps during the build
2. Uploads them to Sentry with the release version
3. Associates them with the correct release

Release format: `{slug}@{version}` (e.g., `mobile@1.0.0`)

## Monitoring

### Sentry Dashboard

Access your Sentry project at: `https://sentry.io/organizations/subculture-collective/projects/clipper-mobile/`

View:
- **Issues**: Errors grouped by type with stack traces
- **Performance**: Transaction data and slow operations
- **Releases**: Track errors by version
- **Alerts**: Configure notifications for critical errors

### Sample Rates

Sample rates control how much data is sent to Sentry:

**Development**:
- Traces: 100% (all transactions tracked)
- Profiles: 50% (half of transactions profiled)

**Production**:
- Traces: 20% (1 in 5 transactions tracked)
- Profiles: 10% (1 in 10 transactions profiled)

Adjust these in `lib/sentry.ts` based on your needs and Sentry quota.

## Testing

### Test Crash Reporting

1. **Test JavaScript Error**:
```typescript
// In any component
throw new Error('Test Sentry error');
```

2. **Test Native Crash** (iOS):
```typescript
import { Sentry } from '../lib/sentry';
Sentry.nativeCrash();
```

3. **Test Error Boundary**:
```typescript
// In any component
const Component = () => {
  throw new Error('Test error boundary');
};
```

### Verify in Sentry

1. Go to your Sentry project dashboard
2. Navigate to Issues
3. You should see the test error with:
   - Symbolicated stack trace
   - Device information
   - Breadcrumbs leading to the error
   - User context (if authenticated)

### Run Tests

```bash
cd mobile
npm test
```

The test suite includes:
- Sentry initialization tests
- User context tests
- PII scrubbing validation
- Breadcrumb filtering tests

## Troubleshooting

### Source Maps Not Working

If stack traces are not symbolicated:
1. Verify the Sentry plugin is in `app.json`
2. Check that builds are uploaded with `eas build`
3. Confirm the release version matches in Sentry
4. Check Sentry project settings for source map uploads

### No Errors Appearing

1. Verify `EXPO_PUBLIC_SENTRY_ENABLED=true`
2. Check the DSN is correct
3. Ensure the app has internet connectivity
4. Look for initialization errors in console

### Performance Data Missing

1. Check sample rates in `lib/sentry.ts`
2. Verify performance monitoring is enabled in Sentry project settings
3. Ensure transactions are being created and finished

## Privacy Considerations

- **No PII**: Email, phone, and other PII are automatically scrubbed
- **Minimal User Data**: Only user ID and username are tracked
- **No Request Bodies**: API request/response bodies are not captured
- **Filtered Breadcrumbs**: Sensitive console logs and auth requests are excluded

## Best Practices

1. **Don't Over-Sample**: Keep production sample rates low to manage quota
2. **Add Context**: Use breadcrumbs and tags to provide context for errors
3. **Filter Noise**: Add expected errors to `ignoreErrors` in `lib/sentry.ts`
4. **Monitor Regularly**: Set up alerts for critical errors
5. **Test Before Release**: Always test crash reporting in preview builds

## Resources

- [Sentry React Native Docs](https://docs.sentry.io/platforms/react-native/)
- [Sentry Expo Guide](https://docs.sentry.io/platforms/react-native/guides/expo/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## Support

For issues or questions:
1. Check the [Sentry documentation](https://docs.sentry.io/)
2. Review the `lib/sentry.ts` implementation
3. Check Sentry project settings
4. Contact the team in #mobile-dev channel
