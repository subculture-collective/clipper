# Monitoring and Error Tracking Setup Guide

This guide covers how to set up Sentry for error tracking and integrate it with the Clipper application.

## Table of Contents

- [Overview](#overview)
- [Sentry Setup](#sentry-setup)
- [Backend Configuration](#backend-configuration)
- [Frontend Configuration](#frontend-configuration)
- [Release Tracking](#release-tracking)
- [Source Maps](#source-maps)
- [Alert Configuration](#alert-configuration)
- [Dashboard Setup](#dashboard-setup)
- [Best Practices](#best-practices)

## Overview

Clipper uses Sentry for:
- **Error Tracking**: Capture and track application errors
- **Performance Monitoring**: Monitor API response times and slow queries
- **Release Tracking**: Track errors by deployment version
- **User Context**: Associate errors with users (privacy-safe with hashed IDs)
- **Breadcrumbs**: Track user actions leading to errors

### Architecture

```
┌─────────────┐         ┌──────────────┐
│   Browser   │────────▶│   Sentry     │
│  (Frontend) │         │   (SaaS)     │
└─────────────┘         └──────────────┘
                               ▲
                               │
┌─────────────┐                │
│   Backend   │────────────────┘
│   (API)     │
└─────────────┘
```

## Sentry Setup

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io) and sign up
2. Choose a plan (Developer plan is free)
3. Create an organization

### 2. Create Projects

Create two projects:

#### Backend Project

1. Click "Create Project"
2. Select platform: **Go**
3. Name: `clipper-backend`
4. Set alert frequency to your preference
5. Click "Create Project"
6. Copy the **DSN** (you'll need this for backend configuration)

#### Frontend Project

1. Click "Create Project"
2. Select platform: **React**
3. Name: `clipper-frontend`
4. Set alert frequency to your preference
5. Click "Create Project"
6. Copy the **DSN** (you'll need this for frontend configuration)

### 3. Configure Team Alerts

1. Go to **Settings** > **Alerts**
2. Set up alert rules (see [Alert Configuration](#alert-configuration))
3. Configure notification channels (email, Slack, etc.)

## Backend Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Sentry Configuration
SENTRY_ENABLED=true
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
```

### Configuration Details

- **SENTRY_ENABLED**: Set to `true` in production, `false` in development
- **SENTRY_DSN**: Your project's DSN from Sentry
- **SENTRY_ENVIRONMENT**: Environment name (production, staging, development)
- **SENTRY_RELEASE**: Version/release identifier (e.g., git SHA or semver)
- **SENTRY_TRACES_SAMPLE_RATE**: Percentage of transactions to monitor (0.0 to 1.0)
  - Development: 1.0 (100%)
  - Production: 0.1 (10%) to reduce load

### PII Protection

The backend automatically scrubs sensitive data:
- Authorization headers
- Cookie values
- CSRF tokens
- User emails and IPs
- Passwords, tokens, secrets in breadcrumbs
- User IDs are hashed using SHA-256

### Testing

Test error capture:

```bash
# Send a test error
curl -X POST http://localhost:8080/api/v1/test-error

# Check Sentry dashboard
```

## Frontend Configuration

### Environment Variables

Add these to your `.env` or `.env.production` file:

```bash
# Sentry Configuration
VITE_SENTRY_ENABLED=true
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=v1.0.0
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
```

### Configuration Details

- **VITE_SENTRY_ENABLED**: Set to `true` in production, `false` in development
- **VITE_SENTRY_DSN**: Your project's DSN from Sentry
- **VITE_SENTRY_ENVIRONMENT**: Environment name
- **VITE_SENTRY_RELEASE**: Version identifier (must match backend for correlation)
- **VITE_SENTRY_TRACES_SAMPLE_RATE**: Performance monitoring sample rate

### PII Protection

The frontend automatically scrubs:
- Authorization headers and tokens
- Cookie values
- User emails and IPs
- Passwords, tokens, API keys
- User IDs are hashed to match backend

### Error Boundary

The global `ErrorBoundary` component catches all React errors:

```typescript
// Automatically integrated in main.tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

Features:
- Catches all React component errors
- Reports to Sentry with component stack
- Shows user-friendly error page
- Allows page reload or return to home

### Testing

Test error capture:

```javascript
// In browser console
throw new Error('Test frontend error');

// Or trigger a component error
// Navigate to a route that doesn't exist
```

## Release Tracking

Release tracking helps identify which deployment introduced an error.

### Manual Deployment

Set the release version when deploying:

```bash
# Backend
export SENTRY_RELEASE=$(git rev-parse HEAD)
./scripts/deploy.sh

# Frontend
export VITE_SENTRY_RELEASE=$(git rev-parse HEAD)
npm run build
```

### GitHub Actions

Example workflow for automatic release tracking:

```yaml
- name: Set Release Version
  id: version
  run: echo "RELEASE_SHA=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

- name: Build Backend
  env:
    SENTRY_RELEASE: ${{ steps.version.outputs.RELEASE_SHA }}
  run: go build ./cmd/api

- name: Build Frontend
  env:
    VITE_SENTRY_RELEASE: ${{ steps.version.outputs.RELEASE_SHA }}
  run: npm run build

- name: Create Sentry Release
  uses: getsentry/action-release@v1
  with:
    environment: production
    version: ${{ steps.version.outputs.RELEASE_SHA }}
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: clipper-backend
```

### Semantic Versioning

For production releases, use semantic versioning:

```bash
# Tag release
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# Deploy with version
export SENTRY_RELEASE=v1.2.3
export VITE_SENTRY_RELEASE=v1.2.3
```

## Source Maps

Source maps help Sentry show readable stack traces for production builds.

### Automatic Upload

The frontend is configured to automatically upload source maps:

1. **Get Sentry Auth Token**:
   - Go to Sentry Settings > Auth Tokens
   - Create a new token with `project:releases` and `project:write` scopes
   - Store as environment variable: `SENTRY_AUTH_TOKEN`

2. **Configure Environment Variables**:

```bash
# For CI/CD
export SENTRY_AUTH_TOKEN=your-auth-token
export SENTRY_ORG=your-org-name
export SENTRY_PROJECT=clipper-frontend
```

3. **Build**:

```bash
npm run build
# Source maps are automatically uploaded and deleted locally
```

### Manual Upload

If automatic upload fails:

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Upload source maps
sentry-cli releases files v1.2.3 upload-sourcemaps ./dist \
  --url-prefix '~/assets/' \
  --rewrite
```

### Security

Source maps contain your source code. Recommendations:
- Only upload to Sentry (don't deploy to production server)
- The Vite config automatically deletes source maps after upload
- Use `.sentryclirc` for auth token (don't commit to git)

## Alert Configuration

### Recommended Alerts

#### 1. High Error Rate

```
Name: High Error Rate - Production
Condition: 50+ events in 5 minutes
Environment: production
Action: Notify #alerts channel + email on-call
```

#### 2. New Issue

```
Name: New Issue - Production
Condition: First seen
Environment: production
Action: Notify #alerts channel
```

#### 3. Issue Regression

```
Name: Resolved Issue Reoccurred
Condition: Issue state changes to unresolved
Environment: production
Action: Notify original resolver + #alerts channel
```

#### 4. Performance Degradation

```
Name: Slow API Response
Condition: P95 response time > 2 seconds
Environment: production
Action: Notify #performance channel
```

### Notification Channels

#### Slack Integration

1. Go to **Settings** > **Integrations** > **Slack**
2. Click "Add Workspace"
3. Authorize Sentry
4. Configure channel for alerts

#### Email

1. Go to **Settings** > **Alerts**
2. Add email addresses to notification list
3. Set frequency (immediate, daily digest, etc.)

#### PagerDuty (Critical Alerts)

1. Go to **Settings** > **Integrations** > **PagerDuty**
2. Connect your PagerDuty account
3. Configure for P0/P1 alerts only

## Dashboard Setup

### Key Metrics Dashboard

Create a dashboard with these widgets:

1. **Error Rate**: Graph of errors over time
2. **Affected Users**: Count of unique users with errors
3. **Top Issues**: Table of most frequent issues
4. **Release Health**: Error rate by release version
5. **Response Time**: P50, P95, P99 percentiles
6. **Availability**: Percentage of successful requests

### Creating Dashboard

1. Go to **Dashboards** > **Create Dashboard**
2. Name: "Production Health"
3. Add widgets:
   - Click "Add Widget"
   - Select visualization type
   - Configure query and filters
   - Save widget

### Sharing Dashboard

Generate a shareable link:
1. Open dashboard
2. Click "Share"
3. Copy public link (optional: password protect)

## Best Practices

### 1. Error Grouping

Sentry groups similar errors. Ensure good grouping by:
- Using consistent error messages
- Including error codes in messages
- Adding custom fingerprints for unique scenarios

```go
// Backend example
sentry.ConfigureScope(func(scope *sentry.Scope) {
    scope.SetFingerprint([]string{"database-connection-error"})
})
```

```typescript
// Frontend example
Sentry.withScope(scope => {
  scope.setFingerprint(['api-timeout-error']);
  Sentry.captureException(error);
});
```

### 2. Add Context

Always add relevant context to errors:

```go
// Backend
sentry.WithScope(func(scope *sentry.Scope) {
    scope.SetTag("route", "/api/v1/clips")
    scope.SetContext("query", map[string]interface{}{
        "limit": 10,
        "sort": "hot",
    })
    sentry.CaptureException(err)
})
```

```typescript
// Frontend
Sentry.withScope(scope => {
  scope.setTag('component', 'ClipCard');
  scope.setContext('clip', { id: clip.id, title: clip.title });
  Sentry.captureException(error);
});
```

### 3. Breadcrumbs

Add breadcrumbs for user actions:

```typescript
// Before API calls
Sentry.addBreadcrumb({
  category: 'api',
  message: 'Fetching clips',
  level: 'info',
});

// After user actions
Sentry.addBreadcrumb({
  category: 'user',
  message: 'User voted on clip',
  data: { clipId: '123', voteType: 'up' },
  level: 'info',
});
```

### 4. Sampling

Adjust sample rates based on traffic:

| Environment | Error Sample | Trace Sample |
|------------|--------------|--------------|
| Development | 100% | 100% |
| Staging | 100% | 50% |
| Production (low traffic) | 100% | 10% |
| Production (high traffic) | 50% | 1% |

### 5. Performance Budget

Set performance budgets:
- API responses: < 500ms (P50), < 2s (P95)
- Frontend page load: < 3s
- Database queries: < 100ms

Alert when budgets are exceeded.

### 6. PII Compliance

Always review and scrub PII:
- User emails
- IP addresses
- Authentication tokens
- Payment information
- Personal messages

Our implementation already handles this, but always verify:
- Check Sentry events don't contain PII
- Review breadcrumbs for sensitive data
- Test with real user data in staging

### 7. Maintenance

Regular maintenance tasks:
- **Weekly**: Review new issues, triage
- **Monthly**: Check alert effectiveness, adjust thresholds
- **Quarterly**: Review sampling rates, clean up ignored issues
- **Yearly**: Audit PII protection, review access controls

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN**: Verify correct DSN in environment variables
2. **Check Enabled Flag**: Ensure `SENTRY_ENABLED=true`
3. **Check Network**: Ensure outbound HTTPS to sentry.io allowed
4. **Check Logs**: Look for Sentry initialization errors
5. **Test Connection**: Use `sentry-cli info` to verify

### Too Many Errors

1. **Adjust Sample Rate**: Lower `SENTRY_TRACES_SAMPLE_RATE`
2. **Ignore Known Issues**: Mark recurring non-critical errors as ignored
3. **Add Filters**: Configure inbound filters in Sentry project settings
4. **Review Alerts**: Reduce alert noise by adjusting thresholds

### Missing Source Maps

1. **Check Upload**: Verify source maps uploaded: `sentry-cli releases files list VERSION`
2. **Check Auth Token**: Ensure `SENTRY_AUTH_TOKEN` has correct permissions
3. **Check Build**: Ensure `sourcemap: true` in Vite config
4. **Manual Upload**: Try uploading manually with `sentry-cli`

### Performance Impact

Sentry has minimal performance impact:
- Errors are sent asynchronously
- Performance monitoring uses sampling
- Source maps only uploaded during build

If concerns:
1. Lower trace sample rate
2. Disable session replay
3. Reduce breadcrumb limit
4. Use local Sentry instance (self-hosted)

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry Go SDK](https://docs.sentry.io/platforms/go/)
- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)
- [Sentry CLI](https://docs.sentry.io/product/cli/)
