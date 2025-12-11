<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Analytics & Monitoring Setup for clpr.tv](#analytics--monitoring-setup-for-clprtv)
  - [Overview](#overview)
  - [Google Analytics Setup](#google-analytics-setup)
    - [1. Create GA4 Property](#1-create-ga4-property)
    - [2. Create Web Data Stream](#2-create-web-data-stream)
    - [3. Copy Measurement ID](#3-copy-measurement-id)
    - [4. Configure Data Settings](#4-configure-data-settings)
    - [5. Set Up Custom Events (Optional)](#5-set-up-custom-events-optional)
    - [6. Configure Environment Variables](#6-configure-environment-variables)
    - [7. Verify Installation](#7-verify-installation)
  - [Sentry Setup](#sentry-setup)
    - [1. Create Sentry Organization (if needed)](#1-create-sentry-organization-if-needed)
    - [2. Create Frontend Project](#2-create-frontend-project)
    - [3. Create Backend Project](#3-create-backend-project)
    - [4. Configure Performance Monitoring](#4-configure-performance-monitoring)
    - [5. Set Up Alerts](#5-set-up-alerts)
    - [6. Configure Environment Variables](#6-configure-environment-variables-1)
    - [7. Enable Source Maps (Optional but Recommended)](#7-enable-source-maps-optional-but-recommended)
    - [8. Verify Installation](#8-verify-installation)
  - [Custom Analytics API](#custom-analytics-api)
    - [Configuration](#configuration)
    - [Verify Installation](#verify-installation)
  - [Privacy & Compliance](#privacy--compliance)
    - [GDPR Compliance](#gdpr-compliance)
    - [Data Retention](#data-retention)
  - [Monitoring Best Practices](#monitoring-best-practices)
    - [Sample Rates](#sample-rates)
    - [Alert Thresholds](#alert-thresholds)
  - [Dashboards](#dashboards)
    - [Google Analytics Dashboard](#google-analytics-dashboard)
    - [Sentry Dashboard](#sentry-dashboard)
    - [Custom Analytics Dashboard](#custom-analytics-dashboard)
  - [Troubleshooting](#troubleshooting)
    - [Google Analytics Not Tracking](#google-analytics-not-tracking)
    - [Sentry Not Receiving Errors](#sentry-not-receiving-errors)
    - [Custom Analytics Not Recording](#custom-analytics-not-recording)
  - [Support](#support)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Analytics & Monitoring Setup for clpr.tv"
summary: "This guide covers the complete setup of analytics and monitoring for the clpr.tv domain."
tags: ['product']
area: "product"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Analytics & Monitoring Setup for clpr.tv

This guide covers the complete setup of analytics and monitoring for the clpr.tv domain.

## Overview

The platform uses three complementary systems:

1. **Google Analytics (GA4)** - User behavior, page views, and engagement metrics
2. **Sentry** - Error tracking and application performance monitoring (APM)
3. **Custom Analytics API** - Server-side event tracking and aggregated metrics

## Google Analytics Setup

### 1. Create GA4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon) in the bottom left
3. Click **Create Property**
   - Property name: **clpr.tv**
   - Reporting time zone: Select your timezone
   - Currency: Select your currency (e.g., USD)
   - Click **Next**

### 2. Create Web Data Stream

1. Select **Web** as platform
2. Enter website URL: `https://clpr.tv`
3. Stream name: **clpr.tv Web**
4. Enable Enhanced measurement (recommended):
   - ✅ Page views
   - ✅ Scrolls
   - ✅ Outbound clicks
   - ✅ Site search
   - ✅ Video engagement
   - ✅ File downloads
5. Click **Create stream**

### 3. Copy Measurement ID

1. You'll see your **Measurement ID** at the top (format: `G-XXXXXXXXXX`)
2. Copy this ID - you'll need it for configuration

### 4. Configure Data Settings

**Data Retention:**
1. Go to **Admin** → **Data Settings** → **Data Retention**
2. Set **Event data retention**: **14 months** (recommended)
3. Enable **Reset user data on new activity**: ✅

**Data Collection:**
1. Go to **Admin** → **Data Settings** → **Data Collection**
2. Verify these settings:
   - Google signals: **Off** (for privacy)
   - IP anonymization: **Automatic** (enabled by default in GA4)

### 5. Set Up Custom Events (Optional)

While our implementation automatically tracks custom events, you can create custom dimensions in GA4 for better reporting:

1. Go to **Admin** → **Data display** → **Custom definitions**
2. Click **Create custom dimension**
3. Add these dimensions:

| Dimension Name | Scope | Event Parameter | Description |
|----------------|-------|-----------------|-------------|
| Clip ID | Event | clip_id | Unique clip identifier |
| Creator Name | Event | creator_name | Name of creator |
| Share Platform | Event | platform | Platform where clip was shared |
| Target Type | Event | target_type | Type of follow target |

### 6. Configure Environment Variables

**Development (.env):**
```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=false  # Typically disabled in dev to avoid test data
# Set to true when testing analytics integration
VITE_DOMAIN=localhost  # Optional: defaults to window.location.hostname
```

**Production (.env.production):**
```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true
VITE_DOMAIN=clpr.tv  # Optional: defaults to window.location.hostname
```

**Kubernetes ConfigMap:**
```yaml
# frontend-config ConfigMap
GA_MEASUREMENT_ID: "G-XXXXXXXXXX"
```

### 7. Verify Installation

1. Deploy your changes
2. Visit https://clpr.tv
3. Open GA4 → **Reports** → **Realtime**
4. You should see your visit in real-time
5. Test custom events by interacting with the site (upvote, comment, etc.)
6. Check **Realtime** → **Event count by Event name** to verify custom events

## Sentry Setup

### 1. Create Sentry Organization (if needed)

1. Go to [sentry.io](https://sentry.io/)
2. Sign up or log in
3. Create a new organization or use existing

### 2. Create Frontend Project

1. Click **Projects** → **Create Project**
2. Select platform: **React**
3. Project name: `clpr-frontend` or `clpr-web`
4. Default alert settings: **Enable**
5. Click **Create Project**

**Get Frontend DSN:**
1. Go to **Settings** → **Projects** → **clpr-frontend**
2. Click **Client Keys (DSN)**
3. Copy the **DSN** value (format: `https://xxxxx@o0000.ingest.sentry.io/0000000`)

### 3. Create Backend Project

1. Click **Projects** → **Create Project**
2. Select platform: **Go**
3. Project name: `clpr-backend` or `clpr-api`
4. Default alert settings: **Enable**
5. Click **Create Project**

**Get Backend DSN:**
1. Go to **Settings** → **Projects** → **clpr-backend**
2. Click **Client Keys (DSN)**
3. Copy the **DSN** value

### 4. Configure Performance Monitoring

**Frontend Project:**
1. Go to **Settings** → **Projects** → **clpr-frontend** → **Performance**
2. Transaction sample rate: **0.1** (10% in production)
3. Enable Session Replay: **Yes**
   - Session sample rate: **0.1** (10%)
   - Error sample rate: **1.0** (100% of errors)

**Backend Project:**
1. Go to **Settings** → **Projects** → **clpr-backend** → **Performance**
2. Transaction sample rate: **0.1** (10% in production)

### 5. Set Up Alerts

**For Both Projects:**

1. Go to **Alerts** → **Create Alert**

**New Issue Alert:**
- Alert name: "New Error Occurred"
- When: "An event is seen"
- And: "The issue is new"
- Then: Send notification to email/Slack

**High Error Rate Alert:**
- Alert name: "High Error Rate"
- When: "An event is seen"
- And: "The issue is seen more than 100 times in 1 hour"
- Then: Send notification to email/Slack

**Performance Alert:**
- Alert name: "Slow Transaction"
- When: "A transaction occurs"
- And: "The transaction duration is greater than 1000ms"
- And: "The transaction name is /api/*"
- Then: Send notification to email/Slack

### 6. Configure Environment Variables

**Frontend (.env.production):**
```bash
VITE_SENTRY_ENABLED=true
VITE_SENTRY_DSN=https://xxxxx@o0000.ingest.sentry.io/0000000
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_RELEASE=  # Auto-set by CI/CD
```

**Backend (.env.production):**
```bash
SENTRY_ENABLED=true
SENTRY_DSN=https://xxxxx@o0000.ingest.sentry.io/0000000
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_RELEASE=  # Auto-set by CI/CD
```

**Kubernetes Secret (backend-secret):**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
type: Opaque
stringData:
  SENTRY_DSN: "https://xxxxx@o0000.ingest.sentry.io/0000000"
```

**Kubernetes ConfigMap:**
```yaml
# backend-config ConfigMap
SENTRY_ENABLED: "true"
SENTRY_ENVIRONMENT: "production"
SENTRY_TRACES_SAMPLE_RATE: "0.1"
```

### 7. Enable Source Maps (Optional but Recommended)

Source maps help Sentry show exact code locations for errors.

**Frontend (via CI/CD):**
```bash
# In GitHub Actions secrets
SENTRY_AUTH_TOKEN=<your-token>
SENTRY_ORG=<your-org-slug>
SENTRY_PROJECT=clpr-frontend
```

The `@sentry/vite-plugin` in `vite.config.ts` automatically uploads source maps during production builds.

**Backend:**
Enable debug info in Go builds for better stack traces:
```bash
go build -gcflags="all=-N -l"
```

### 8. Verify Installation

**Frontend:**
1. Trigger a test error:
   ```javascript
   // In browser console
   throw new Error("Test Sentry Error");
   ```
2. Check Sentry dashboard for the error

**Backend:**
1. Trigger a test error (if you have a test endpoint)
2. Or check Sentry for real errors after deployment

## Custom Analytics API

### Configuration

The custom analytics API uses the existing PostgreSQL database and requires no additional setup.

**Enable via Feature Flag:**
```bash
FEATURE_ANALYTICS=true
```

### Verify Installation

1. Check that analytics tables exist:
   ```sql
   SELECT tablename FROM pg_tables WHERE tablename LIKE '%analytics%';
   ```

2. Expected tables:
   - `analytics_events`
   - `clip_analytics`
   - `creator_analytics`
   - `user_analytics`
   - `platform_analytics`

3. Test event tracking:
   ```bash
   curl -X POST https://clpr.tv/api/v1/clips/{clip_id}/track-view
   ```

## Privacy & Compliance

### GDPR Compliance

✅ **Consent Management:**
- Users must grant consent before analytics tracking starts
- ConsentContext manages user preferences
- Consent banner shown on first visit

✅ **Do Not Track:**
- DNT browser signals are respected
- All tracking disabled when DNT is enabled

✅ **Data Minimization:**
- IP addresses anonymized (last octet removed)
- No personally identifiable information (PII) tracked
- User IDs hashed before sending to Sentry

✅ **User Rights:**
- Users can withdraw consent at any time
- Settings page allows toggling analytics preferences

### Data Retention

- **Google Analytics**: 14 months (configurable)
- **Sentry**: 90 days (default, configurable per plan)
- **Custom Analytics**: No automatic deletion (managed via database)

## Monitoring Best Practices

### Sample Rates

**Development:**
- GA: Enabled (for testing)
- Sentry Traces: 1.0 (100%)
- Custom Analytics: Enabled

**Staging:**
- GA: Enabled
- Sentry Traces: 0.5 (50%)
- Custom Analytics: Enabled

**Production:**
- GA: Enabled (based on consent)
- Sentry Traces: 0.1 (10%)
- Custom Analytics: Enabled

### Alert Thresholds

**Critical (P0):**
- New Sentry issues with >100 occurrences/hour
- API response time >2000ms
- Error rate >5%

**High (P1):**
- New Sentry issues with >10 occurrences/hour
- API response time >1000ms
- Error rate >1%

**Medium (P2):**
- First occurrence of new error
- Unusual traffic patterns
- Performance degradation trends

## Dashboards

### Google Analytics Dashboard

**Key Metrics to Monitor:**
1. Real-time users
2. Page views (24h, 7d, 30d)
3. Top pages
4. Top events
5. User acquisition sources
6. User retention
7. Core Web Vitals

**Access:** [analytics.google.com](https://analytics.google.com/)

### Sentry Dashboard

**Key Metrics to Monitor:**
1. Error count (24h, 7d, 30d)
2. Top issues by frequency
3. Top issues by affected users
4. Performance transactions
5. Slow transactions
6. Release health

**Access:** [sentry.io](https://sentry.io/)

### Custom Analytics Dashboard

**Admin Dashboard Routes:**
- Platform Overview: `/admin/analytics`
- Content Metrics: `/admin/analytics/content`
- Platform Trends: `/admin/analytics/trends`

**Creator Dashboard:**
- Creator Analytics: `/creator/:creatorName/analytics`

**User Dashboard:**
- Personal Stats: `/profile/stats`

## Troubleshooting

### Google Analytics Not Tracking

1. **Check Measurement ID:**
   ```bash
   echo $VITE_GA_MEASUREMENT_ID
   # Should output: G-XXXXXXXXXX
   ```

2. **Verify Consent:**
   - Open browser console
   - Check for: "Google Analytics initialized: G-XXXXXXXXXX"
   - If not present, user may have rejected analytics consent

3. **Check Browser:**
   - Verify no ad blockers are active
   - Check browser console for errors
   - Test in incognito mode

4. **Verify Data Stream:**
   - Go to GA4 → Admin → Data Streams
   - Ensure clpr.tv stream is active

### Sentry Not Receiving Errors

1. **Check DSN:**
   ```bash
   echo $VITE_SENTRY_DSN  # Frontend
   echo $SENTRY_DSN       # Backend
   ```

2. **Verify Enabled:**
   ```bash
   echo $VITE_SENTRY_ENABLED  # Should be "true"
   echo $SENTRY_ENABLED        # Should be "true"
   ```

3. **Check Console:**
   - Look for "Sentry initialized" message
   - Check for authentication errors

4. **Test Manually:**
   ```javascript
   // Browser console
   Sentry.captureMessage("Test message");
   ```

### Custom Analytics Not Recording

1. **Check Feature Flag:**
   ```bash
   echo $FEATURE_ANALYTICS  # Should be "true"
   ```

2. **Verify Database Connection:**
   ```bash
   # Check backend logs
   docker logs clipper-backend | grep -i analytics
   ```

3. **Test API Endpoint:**
   ```bash
   curl -X POST https://clpr.tv/api/v1/clips/{clip_id}/track-view
   ```

## Support

For issues or questions:
1. Check existing [GitHub Issues](https://github.com/subculture-collective/clipper/issues)
2. Review [ANALYTICS.md](./ANALYTICS.md) documentation
3. Create a new issue with logs and error details
