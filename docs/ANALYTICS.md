# Analytics System

This document describes the analytics system implemented in Clipper for tracking and displaying platform metrics.

## Overview

The analytics system provides comprehensive insights for:

- **Creators**: Track performance of their clips, views, votes, and engagement
- **Admins**: Monitor platform health, user growth, and content trends
- **Users**: View personal statistics and engagement metrics

## Analytics Components

### 1. Google Analytics (GA4)

Google Analytics provides client-side tracking for:

- Page views and navigation patterns
- User engagement and session metrics
- Custom events (clips, votes, comments, follows)
- Core Web Vitals and performance metrics

**Configuration:**

```bash
# Frontend environment variable
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Privacy-First Approach:**

- Respects user consent preferences (GDPR compliant)
- Honors Do Not Track (DNT) browser signals
- IP anonymization enabled by default
- No advertising features or personalization signals
- Integration with ConsentContext for user privacy

**Tracked Events:**

- `page_view`: Page navigation
- `clip_submitted`: New clip submission
- `clip_upvoted` / `clip_downvoted`: Vote actions
- `comment_posted`: Comment creation
- `clip_shared`: Clip sharing (with platform info)
- `follow_action`: User/creator/community follows
- `user_registration`: New user signups
- `search`: Search queries with result counts
- `community_joined`: Community membership
- `feed_followed`: Feed subscription

### 2. Custom Analytics API

Server-side analytics system for detailed metrics and aggregations.

### 3. Sentry Error Tracking

Application Performance Monitoring (APM) and error tracking for both frontend and backend.

## Architecture

### Database Schema

The analytics system uses several tables:

- **`analytics_events`**: Raw event tracking (views, votes, comments, etc.)
- **`daily_analytics`**: Pre-aggregated daily metrics for performance
- **`clip_analytics`**: Per-clip statistics (views, unique viewers, retention)
- **`creator_analytics`**: Per-creator statistics (total clips, views, engagement)
- **`user_analytics`**: Personal user statistics (activity, engagement)
- **`platform_analytics`**: Global platform metrics (DAU, MAU, growth)

### Privacy & Security

- **IP Anonymization**: Last octet of IP addresses is removed before storage
- **Consent Management**: User consent required before initializing Google Analytics
- **DNT Respect**: Do Not Track browser signals disable all tracking
- **Authentication**: Analytics endpoints require proper authentication
- **Authorization**: Admin analytics require admin/moderator role
- **User Privacy**: Personal stats only accessible by the user themselves
- **Data Scrubbing**: Sensitive data removed from Sentry events

### Performance Optimizations

- **Database Triggers**: Automatic updates to analytics tables on events
- **Indexes**: Efficient querying on common patterns (date, entity_id, metric_type)
- **Pre-aggregation**: Daily rollups reduce query load
- **Ready for Background Jobs**: Architecture supports future async aggregation workers

## API Endpoints

### Creator Analytics

**Get Creator Overview**

```
GET /api/v1/creators/:creatorName/analytics/overview
```

Returns summary metrics for a creator.

**Get Top Clips**

```
GET /api/v1/creators/:creatorName/analytics/clips?sort=views&limit=10
```

Returns top-performing clips. Sort options: `views`, `votes`, `comments`

**Get Trends**

```
GET /api/v1/creators/:creatorName/analytics/trends?metric=clip_views&days=30
```

Returns time-series data for the specified metric.

### Clip Analytics

**Get Clip Analytics**

```
GET /api/v1/clips/:id/analytics
```

Returns detailed analytics for a specific clip.

**Track Clip View**

```
POST /api/v1/clips/:id/track-view
```

Records a view event for the clip.

### User Analytics

**Get Personal Stats** (Authenticated)

```
GET /api/v1/users/me/stats
```

Returns personal statistics for the authenticated user.

### Admin Analytics

**Get Platform Overview** (Admin only)

```
GET /api/v1/admin/analytics/overview
```

Returns platform KPIs (users, clips, engagement).

**Get Content Metrics** (Admin only)

```
GET /api/v1/admin/analytics/content
```

Returns popular games, creators, and trending tags.

**Get Platform Trends** (Admin only)

```
GET /api/v1/admin/analytics/trends?metric=users&days=30
```

Returns time-series data for platform metrics.

## Frontend Pages

### Creator Analytics Page

**Route**: `/creator/:creatorName/analytics`

Displays:

- Overview metrics (total clips, views, upvotes, comments, engagement rate)
- Top-performing clips table with sorting
- Performance trends (views, votes over time)
- Timeframe selector (7d, 30d, 90d, 1y)

### Admin Analytics Dashboard

**Route**: `/admin/analytics` (Admin only)

Displays:

- Platform overview KPIs
- User and clip growth trends
- Most popular games and creators (bar charts)
- Trending tags

### Personal Stats Page

**Route**: `/profile/stats` (Authenticated)

Displays:

- Activity summary (votes, comments, favorites)
- Voting behavior (pie chart)
- Engagement metrics
- Account summary

## Components

### Analytics Components

Reusable React components for displaying analytics:

- **`MetricCard`**: Display a single metric with optional trend indicator
- **`LineChartComponent`**: Time-series line chart
- **`BarChartComponent`**: Bar chart for comparing values
- **`PieChartComponent`**: Pie chart for distributions
- **`DateRangeSelector`**: Button group for selecting time ranges

### Usage Example

```tsx
import { MetricCard, LineChartComponent } from '../components/analytics';

// Metric card
<MetricCard
  title="Total Views"
  value={1234567}
  subtitle="All time views"
  trend={{ value: 12.5, isPositive: true }}
/>

// Line chart
<LineChartComponent
  data={[
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-02", value: 150 },
  ]}
  title="Views Over Time"
  valueLabel="Views"
  color="#8b5cf6"
/>
```

## Event Tracking

### Google Analytics Event Tracking

Track user actions with Google Analytics:

```typescript
import { 
  trackClipSubmission, 
  trackUpvote, 
  trackComment,
  trackShare,
  trackFollow,
  trackEvent 
} from '../lib/google-analytics';

// Pre-defined event tracking (no PII included)
trackClipSubmission(clipId);
trackUpvote(clipId);
trackComment(clipId);
trackShare(clipId, 'twitter');
trackFollow('creator');

// Custom event tracking
trackEvent('custom_action', {
  category: 'engagement',
  value: 123,
});
```

**Privacy Considerations:**

- Events are only tracked if user has granted analytics consent
- All events respect Do Not Track (DNT) signals
- Domain context is automatically added to all events
- **No PII is sent**: user IDs, names, and search queries are excluded
- Analytics can be globally disabled via `VITE_ENABLE_ANALYTICS=false`

### Client-Side Tracking

Use the analytics API to track events:

```typescript
import { trackClipView } from '../lib/analytics-api';

// Track a clip view
await trackClipView(clipId);
```

### Backend Event Types

Supported event types:

- `clip_view`: Clip was viewed
- `vote`: Vote cast on clip
- `comment`: Comment posted
- `favorite`: Clip favorited
- `share`: Clip shared
- `search`: Search performed

### Event Metadata

Events can include additional metadata in JSON format:

```json
{
  "duration": 30.5,
  "completion_rate": 0.85,
  "device_type": "mobile",
  "referrer": "https://twitch.tv"
}
```

## Database Migrations

The analytics system is added via migration `000007_add_analytics_system.up.sql`.

To apply:

```bash
make migrate-up
```

To rollback:

```bash
make migrate-down
```

## Setup & Configuration

### Google Analytics Setup

**1. Create GA4 Property:**

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property:
   - Property name: "clpr.tv"
   - Reporting time zone: Select your timezone
   - Currency: Select your currency
3. Create a Web data stream:
   - Website URL: `https://clpr.tv`
   - Stream name: "clpr.tv Web"
4. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

**2. Configure Data Retention:**

1. Go to Admin → Data Settings → Data Retention
2. Set event data retention: **14 months** (recommended)
3. Enable "Reset user data on new activity"

**3. Enable Enhanced Measurement (Optional):**

In your data stream settings, enable:
- Page views (automatic)
- Scrolls
- Outbound clicks
- Site search
- Video engagement
- File downloads

**4. Set Environment Variables:**

Frontend:
```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true
```

**5. Configure Custom Events:**

Custom events are automatically tracked via the `google-analytics.ts` utility. No additional configuration needed in GA4 dashboard.

### Sentry Setup

**1. Create Sentry Projects:**

Create two separate projects at [sentry.io](https://sentry.io/):

**Frontend Project:**
- Project name: "clpr-frontend" or "clpr-web"
- Platform: React
- Alert settings: Configure for new issues, error threshold

**Backend Project:**
- Project name: "clpr-backend" or "clpr-api"
- Platform: Go
- Alert settings: Configure for new issues, performance regressions

**2. Configure Frontend Sentry:**

Copy the DSN from Sentry → Settings → Projects → [Project] → Client Keys (DSN)

```bash
# Frontend environment variables
VITE_SENTRY_ENABLED=true
VITE_SENTRY_DSN=https://xxxxx@o0000.ingest.sentry.io/0000000
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

**3. Configure Backend Sentry:**

```bash
# Backend environment variables
SENTRY_ENABLED=true
SENTRY_DSN=https://xxxxx@o0000.ingest.sentry.io/0000000
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**4. Setup Sentry Alerts:**

Configure alerts in Sentry dashboard:
- **New issues**: Notify on first occurrence
- **Error threshold**: Alert when error rate exceeds 1% (configurable)
- **Performance regressions**: Alert on significant slowdowns
- **Release tracking**: Enable release health monitoring

**5. Performance Monitoring:**

Adjust sample rates based on traffic:
- Development: `1.0` (100%)
- Staging: `0.5` (50%)
- Production: `0.1` (10%) - adjust based on volume

**Lower sample rates in production reduce costs while maintaining visibility.**

### Custom Analytics Configuration

The custom analytics API is configured via feature flags:

```bash
FEATURE_ANALYTICS=true
```

No additional setup required - uses existing PostgreSQL database.

### Monitoring Dashboard Access

**Admin Analytics:**
- Route: `/admin/analytics`
- Requires: Admin or moderator role
- Displays: Platform KPIs, trends, content metrics

**Creator Analytics:**
- Route: `/creator/:creatorName/analytics`
- Requires: No authentication (public)
- Displays: Creator performance, top clips, trends

**Personal Stats:**
- Route: `/profile/stats`
- Requires: Authentication
- Displays: User activity and engagement

## Future Enhancements (Phase 3)

- Real-time analytics dashboard with live updates
- Background aggregation workers for better performance
- Advanced filtering and segmentation
- Export functionality (CSV, PDF)
- Custom date range selection
- Geographic distribution of viewers
- Referral source tracking
- Retention cohort analysis
- A/B testing support

## Testing

Run analytics service tests:

```bash
cd backend
go test ./internal/services -run TestAnonymizeIP
```

Run all tests:

```bash
make test
```

## Dependencies

### Backend

- PostgreSQL 17+ (for analytics tables and triggers)
- Go 1.24+

### Frontend

- React 19
- Recharts 2.15+ (charting library)
- TanStack Query (data fetching)
- date-fns (date formatting)

## Support

For issues or questions about the analytics system, please open an issue on GitHub.
