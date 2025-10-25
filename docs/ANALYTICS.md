# Analytics System

This document describes the analytics system implemented in Clipper for tracking and displaying platform metrics.

## Overview

The analytics system provides comprehensive insights for:

- **Creators**: Track performance of their clips, views, votes, and engagement
- **Admins**: Monitor platform health, user growth, and content trends
- **Users**: View personal statistics and engagement metrics

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
- **Authentication**: Analytics endpoints require proper authentication
- **Authorization**: Admin analytics require admin/moderator role
- **User Privacy**: Personal stats only accessible by the user themselves

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
