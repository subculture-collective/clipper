# Engagement Metrics

## Overview

This document defines the engagement metrics system used to measure user activity and platform health in Clipper. These metrics provide insights into user behavior, content performance, and overall platform vitality.

## User Engagement Score

### Components

The User Engagement Score is a composite metric (0-100 scale) that measures individual user activity and participation. It is calculated using weighted components based on a rolling 30-day window.

#### 1. Posts Activity (Weight: 20%)

- **Definition**: Number of clip submissions per week
- **Calculation**: `(submissions_last_7_days / 10) * 100`
- **Cap**: Maximum of 10 submissions per week for scoring purposes
- **Normalization**: Score capped at 100

#### 2. Comments Activity (Weight: 25%)

- **Definition**: Number of comments posted per week
- **Calculation**: `(comments_last_7_days / 20) * 100`
- **Cap**: Maximum of 20 comments per week for scoring purposes
- **Normalization**: Score capped at 100

#### 3. Voting Activity (Weight: 20%)

- **Definition**: Number of votes cast per week
- **Calculation**: `(votes_last_7_days / 50) * 100`
- **Cap**: Maximum of 50 votes per week for scoring purposes
- **Normalization**: Score capped at 100

#### 4. Login Frequency (Weight: 20%)

- **Definition**: Number of unique days logged in over the last 30 days
- **Calculation**: `(unique_login_days_last_30 / 30) * 100`
- **Normalization**: Score capped at 100

#### 5. Time Spent (Weight: 15%)

- **Definition**: Average daily active time on platform
- **Calculation**: `(avg_daily_minutes_last_30 / 60) * 100`
- **Cap**: Maximum of 60 minutes per day for scoring purposes
- **Normalization**: Score capped at 100

### Formula

```
User Engagement Score = (
  Posts_Score * 0.20 +
  Comments_Score * 0.25 +
  Voting_Score * 0.20 +
  Login_Frequency_Score * 0.20 +
  Time_Spent_Score * 0.15
)
```

### Recency Weighting

Activities are weighted by recency using an exponential decay function:

```
Weight(age_in_days) = 1.0 * exp(-0.1 * age_in_days)
```

This ensures recent activities have more impact on the score than older activities within the rolling window.

### Score Tiers

- **0-25**: Inactive
- **26-50**: Low Engagement
- **51-75**: Moderate Engagement
- **76-90**: High Engagement
- **91-100**: Very High Engagement

## Content Engagement

### Metrics

#### 1. View Count

- **Definition**: Total number of times a clip has been viewed
- **Source**: `analytics_events` table with `event_type = 'clip_view'`
- **Update Frequency**: Real-time

#### 2. Vote Ratio

- **Definition**: Ratio of upvotes to total votes
- **Calculation**: `upvotes / (upvotes + downvotes)`
- **Range**: 0.0 to 1.0
- **Normalization**: `vote_ratio * 100` for percentage

#### 3. Comment Count

- **Definition**: Total number of comments on a clip
- **Source**: `clips.comment_count` (auto-updated by trigger)
- **Update Frequency**: Real-time

#### 4. Share Count

- **Definition**: Number of times a clip has been shared
- **Source**: `analytics_events` table with `event_type = 'clip_share'`
- **Update Frequency**: Real-time

#### 5. Favorite Rate

- **Definition**: Percentage of viewers who favorited the clip
- **Calculation**: `(favorite_count / view_count) * 100`
- **Range**: 0% to 100%

### Content Engagement Score

```
Content Engagement Score = (
  (normalized_views * 0.25) +
  (vote_ratio * 100 * 0.30) +
  (normalized_comments * 0.20) +
  (normalized_shares * 0.15) +
  (favorite_rate * 0.10)
)
```

Where normalized values are calculated as:
```
normalized_value = min(100, (actual_value / expected_90th_percentile) * 100)
```

## Platform Health

### Daily Active Users (DAU)

- **Definition**: Number of unique users who performed any activity on a given day
- **Activities Counted**: Login, view clip, vote, comment, favorite, search
- **Calculation Period**: Last 24 hours
- **Update Frequency**: Hourly

### Weekly Active Users (WAU)

- **Definition**: Number of unique users who performed any activity in the last 7 days
- **Calculation Period**: Rolling 7-day window
- **Update Frequency**: Daily at midnight UTC

### Monthly Active Users (MAU)

- **Definition**: Number of unique users who performed any activity in the last 30 days
- **Calculation Period**: Rolling 30-day window
- **Update Frequency**: Daily at midnight UTC

### Stickiness Ratio

```
Stickiness = DAU / MAU
```

- **Target**: > 0.20 (20%)
- **Good**: > 0.30 (30%)
- **Excellent**: > 0.40 (40%)

### Retention Rate by Cohort

#### Definition

Percentage of users from a specific cohort (e.g., signup month) who return to the platform.

#### Calculation

```
Retention(cohort, period) = (
  active_users_from_cohort_in_period /
  total_users_in_cohort
) * 100
```

#### Cohorts

- **Day 1 Retention**: Users active 1 day after signup
- **Day 7 Retention**: Users active 7 days after signup
- **Day 30 Retention**: Users active 30 days after signup
- **Month N Retention**: Users active N months after signup month

#### Targets

- **Day 1**: > 40%
- **Day 7**: > 20%
- **Day 30**: > 10%

### Churn Rate

#### Definition

Percentage of users who stop using the platform in a given period.

#### Calculation

```
Monthly Churn Rate = (
  users_who_stopped_in_month /
  total_active_users_start_of_month
) * 100
```

A user is considered "churned" if they have no activity for 30 consecutive days after being active.

#### Targets

- **Acceptable**: < 5% monthly
- **Good**: < 3% monthly
- **Excellent**: < 1% monthly

## Calculation Rules

### Rolling Windows

All metrics use rolling windows to provide continuous, up-to-date measurements:

- **7-day window**: Includes the current day plus the previous 6 days
- **30-day window**: Includes the current day plus the previous 29 days

### Weighting by Recency

More recent activities have higher weights using exponential decay:

```
weight = exp(-lambda * days_ago)
```

Where:
- `lambda = 0.1` for 30-day windows
- `lambda = 0.2` for 7-day windows

### Normalization to 0-100 Scale

All scores are normalized to a 0-100 scale for consistency:

1. **Identify Expected Maximum**: Use 90th percentile of historical data
2. **Calculate Raw Score**: Based on actual metrics
3. **Normalize**: `score = min(100, (raw_score / expected_max) * 100)`
4. **Round**: Round to nearest integer

### Aggregation Frequency

- **Real-time Metrics**: Updated on every event (views, votes, comments)
- **Daily Aggregations**: Run at 00:00 UTC daily
- **Weekly Summaries**: Calculated every Monday at 00:00 UTC
- **Monthly Reports**: Generated on the 1st of each month at 00:00 UTC

## API Endpoints

### User Engagement

#### Get User Engagement Score

```
GET /api/v1/users/:userId/engagement
```

**Response:**
```json
{
  "user_id": "uuid",
  "score": 75,
  "tier": "High Engagement",
  "components": {
    "posts": {
      "score": 40,
      "count": 4,
      "weight": 0.20
    },
    "comments": {
      "score": 75,
      "count": 15,
      "weight": 0.25
    },
    "votes": {
      "score": 80,
      "count": 40,
      "weight": 0.20
    },
    "login_frequency": {
      "score": 90,
      "days": 27,
      "weight": 0.20
    },
    "time_spent": {
      "score": 70,
      "avg_daily_minutes": 42,
      "weight": 0.15
    }
  },
  "calculated_at": "2025-12-09T00:00:00Z"
}
```

### Platform Health

#### Get Platform Health Metrics

```
GET /api/v1/admin/analytics/health
```

**Response:**
```json
{
  "dau": 1250,
  "wau": 5430,
  "mau": 18900,
  "stickiness": 0.066,
  "retention": {
    "day1": 42.5,
    "day7": 23.8,
    "day30": 12.4
  },
  "churn_rate_monthly": 4.2,
  "trends": {
    "dau_change_wow": 5.2,
    "mau_change_mom": 12.8
  },
  "calculated_at": "2025-12-09T00:00:00Z"
}
```

### Trending

#### Get Trending Metrics

```
GET /api/v1/admin/analytics/trending?metric=dau&days=7
```

**Response:**
```json
{
  "metric": "dau",
  "period_days": 7,
  "data": [
    {
      "date": "2025-12-02",
      "value": 1180,
      "change_from_previous": 3.2
    },
    {
      "date": "2025-12-03",
      "value": 1205,
      "change_from_previous": 2.1
    },
    // ... more data points
  ],
  "week_over_week_change": 5.2,
  "summary": {
    "min": 1150,
    "max": 1280,
    "avg": 1225,
    "trend": "increasing"
  }
}
```

### Export

#### Export Engagement Data

```
GET /api/v1/admin/analytics/export?metrics=dau,mau,engagement&format=csv&start_date=2025-11-01&end_date=2025-12-01
```

**Response:**
CSV file download with requested metrics.

## Dashboard Visualizations

### Admin Dashboard

#### User Engagement Panel

- **Current Score Distribution**: Histogram showing distribution of users across engagement tiers
- **Top Engaged Users**: Leaderboard of highest engagement scores
- **Engagement Trends**: Line chart showing average engagement score over time

#### Platform Health Panel

- **Active Users**: Line chart showing DAU, WAU, MAU trends
- **Stickiness Gauge**: Current stickiness ratio with target threshold
- **Retention Cohort Table**: Heatmap showing retention rates by cohort
- **Churn Rate**: Line chart with alert threshold

#### Content Performance Panel

- **Top Clips by Engagement**: Table showing highest engagement scores
- **Engagement Distribution**: Box plot of content engagement scores
- **Vote Ratio Trends**: Line chart showing average vote ratios over time

#### Trending Panel

- **Week-over-Week Changes**: Bar chart showing % changes in key metrics
- **Growth Indicators**: Sparklines for quick visual trends
- **Anomaly Detection**: Highlighted metrics that deviate significantly from expected values

### Individual User Dashboard

- **Personal Engagement Score**: Large gauge showing current score and tier
- **Activity Breakdown**: Pie chart showing contribution of each component
- **Activity Timeline**: Calendar heatmap showing active days
- **Comparison**: How user's score compares to platform average

## Alerts and Monitoring

### Alert Thresholds

#### Critical Alerts (P1)

- **DAU Drop**: > 20% decrease day-over-day
- **MAU Drop**: > 15% decrease month-over-month
- **Churn Rate Spike**: > 7% in a single month
- **Stickiness Drop**: < 0.15 (15%)

#### Warning Alerts (P2)

- **DAU Drop**: > 10% decrease day-over-day
- **WAU Drop**: > 10% decrease week-over-week
- **Churn Rate Increase**: > 5% in a single month
- **Retention Drop**: Day 1 retention < 30%

#### Info Alerts (P3)

- **Engagement Score Drop**: Average user score drops > 10 points
- **Content Engagement Drop**: Average content score drops > 15 points

### Alert Channels

- **Slack**: Real-time notifications to #platform-health channel
- **Email**: Daily digest to ops team
- **Grafana**: Visual alerts in dashboard
- **PagerDuty**: P1 alerts only for on-call engineer

### Alert Actions

1. **Investigate**: Check logs and metrics for root cause
2. **Document**: Record findings in incident log
3. **Respond**: Implement fixes or adjustments
4. **Review**: Post-mortem for P1 alerts
5. **Iterate**: Update thresholds based on learnings

## Data Retention

- **Raw Events**: 90 days in hot storage, archived after
- **Daily Aggregations**: 2 years
- **Weekly Summaries**: 3 years
- **Monthly Reports**: Indefinite

## Privacy Considerations

- **IP Anonymization**: Last octet removed for IPv4, last 80 bits for IPv6
- **User Aggregation**: Individual user metrics only visible to user and admins
- **Data Export**: PII excluded from bulk exports
- **Consent**: Users can opt-out of detailed tracking via privacy settings

## Performance Optimization

### Caching Strategy

- **User Engagement Scores**: Cached for 1 hour, recalculated on-demand
- **Platform Metrics**: Cached for 15 minutes
- **Trending Data**: Cached for 5 minutes

### Pre-aggregation

- **Daily Jobs**: Calculate and store daily aggregations at 00:00 UTC
- **Weekly Jobs**: Calculate weekly summaries every Monday
- **Monthly Jobs**: Calculate monthly reports on 1st of month

### Database Indexes

```sql
-- User engagement lookups
CREATE INDEX idx_analytics_events_user_time ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_type_time ON analytics_events(event_type, created_at DESC);

-- Cohort analysis
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login_at);

-- Content engagement
CREATE INDEX idx_clips_engagement ON clips(vote_score DESC, comment_count DESC, favorite_count DESC);
```

## Implementation Notes

### Tech Stack

- **Backend**: Go services for calculation and aggregation
- **Database**: PostgreSQL for storage
- **Cache**: Redis for computed scores
- **Monitoring**: Prometheus for metrics collection
- **Visualization**: Grafana for dashboards
- **Scheduling**: Cron jobs for aggregations

### Testing Strategy

- **Unit Tests**: Test calculation formulas and edge cases
- **Integration Tests**: Test full pipeline from events to scores
- **Load Tests**: Ensure performance at scale
- **Accuracy Tests**: Validate against known datasets

## Glossary

- **DAU**: Daily Active Users
- **WAU**: Weekly Active Users
- **MAU**: Monthly Active Users
- **Cohort**: Group of users who signed up in the same period
- **Churn**: Users who stop using the platform
- **Stickiness**: Measure of how often users return (DAU/MAU)
- **Engagement Score**: Composite metric of user activity level
- **Retention**: Percentage of users who return after signup

## References

- [Analytics Service](../backend/internal/services/analytics_service.go)
- [Analytics Repository](../backend/internal/repository/analytics_repository.go)
- [Database Schema](DATABASE-SCHEMA.md)
- [Monitoring Guide](operations/monitoring.md)

## Changelog

- **2025-12-09**: Initial documentation created
