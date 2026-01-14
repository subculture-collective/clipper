# Metabase Quick Reference

Quick reference for common Metabase operations and SQL patterns.

## Connection String

When setting up the Clipper database in Metabase:

```
Host: postgres
Port: 5432
Database: clipper_db
Username: clipper
Password: <your_password>
```

## Common SQL Patterns

### Date Filtering with Parameters

```sql
-- Add a date parameter for dynamic filtering
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(*) as metric_value
FROM table_name
WHERE created_at >= {{start_date}}
    AND created_at <= {{end_date}}
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;
```

**Parameter Setup:**
- Type: Date
- Default: "Last 30 days"

### Time Series with Moving Average

```sql
WITH daily_data AS (
    SELECT 
        date_trunc('day', created_at) as date,
        COUNT(*) as daily_count
    FROM analytics_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY date_trunc('day', created_at)
)
SELECT 
    date,
    daily_count,
    AVG(daily_count) OVER (
        ORDER BY date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_7day
FROM daily_data
ORDER BY date DESC;
```

### Cohort Retention Analysis

```sql
WITH cohorts AS (
    SELECT 
        id,
        date_trunc('month', created_at) as cohort_month
    FROM users
),
activity AS (
    SELECT DISTINCT
        user_id,
        date_trunc('month', created_at) as activity_month
    FROM analytics_events
)
SELECT 
    c.cohort_month,
    a.activity_month,
    COUNT(DISTINCT a.user_id) as active_users,
    EXTRACT(MONTH FROM AGE(a.activity_month, c.cohort_month)) as month_number
FROM cohorts c
LEFT JOIN activity a ON c.id = a.user_id
GROUP BY c.cohort_month, a.activity_month
ORDER BY c.cohort_month DESC, a.activity_month DESC;
```

### Funnel Analysis

```sql
WITH funnel AS (
    SELECT 
        COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'page_view') as step_1_views,
        COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'clip_view') as step_2_engaged,
        COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'vote') as step_3_voted,
        COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'comment') as step_4_commented
    FROM analytics_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
    'Page Views' as step, step_1_views as users, 100.0 as conversion_rate FROM funnel
UNION ALL
SELECT 
    'Engaged', step_2_engaged, ROUND(step_2_engaged::NUMERIC / NULLIF(step_1_views, 0) * 100, 2) FROM funnel
UNION ALL
SELECT 
    'Voted', step_3_voted, ROUND(step_3_voted::NUMERIC / NULLIF(step_2_engaged, 0) * 100, 2) FROM funnel
UNION ALL
SELECT 
    'Commented', step_4_commented, ROUND(step_4_commented::NUMERIC / NULLIF(step_3_voted, 0) * 100, 2) FROM funnel;
```

## Visualization Tips

### Number Cards

```sql
-- Simple metric
SELECT COUNT(*) as "Active Users Today"
FROM analytics_events
WHERE created_at >= CURRENT_DATE
    AND user_id IS NOT NULL;
```

**Settings:**
- Visualization: Number
- Style: Compact or Detailed
- Show trend: Compare to previous period

### Line Charts

```sql
-- Time series data
SELECT 
    date_trunc('day', created_at) as "Date",
    COUNT(DISTINCT user_id) as "Active Users"
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY "Date" DESC;
```

**Settings:**
- X-axis: Date (automatic detection)
- Y-axis: Metric column
- Line style: Linear or stepped
- Show dots: Yes for sparse data

### Bar Charts

```sql
-- Categorical comparison
SELECT 
    game_name as "Game",
    COUNT(*) as "Clips",
    SUM(view_count) as "Total Views"
FROM clips
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND is_removed = false
GROUP BY game_name
ORDER BY COUNT(*) DESC
LIMIT 10;
```

**Settings:**
- X-axis: Category
- Y-axis: Metric(s)
- Stacked: For multiple metrics
- Sort: By value (descending)

### Pie/Donut Charts

```sql
-- Proportions
SELECT 
    tier as "Subscription Tier",
    COUNT(*) as "Subscribers"
FROM subscriptions
WHERE status = 'active'
GROUP BY tier;
```

**Settings:**
- Dimension: Category
- Metric: Count/sum
- Show percentages: Yes
- Show legend: Yes

### Tables

```sql
-- Detailed data
SELECT 
    creator_name as "Creator",
    total_clips as "Clips",
    total_views as "Views",
    ROUND(avg_engagement_rate, 2) as "Engagement %",
    ROUND(total_views::NUMERIC / NULLIF(total_clips, 0), 2) as "Avg Views/Clip"
FROM creator_analytics
ORDER BY total_views DESC
LIMIT 20;
```

**Settings:**
- Conditional formatting: Highlight high/low values
- Column widths: Auto or custom
- Sorting: Enable for all columns

## Filtering Best Practices

### Dashboard Filters

1. **Date Range** (most common):
   - Parameter name: `date_range`
   - Type: Date Range
   - Default: "Last 30 days"
   - Widget: Date range picker

2. **Category Selection**:
   - Parameter name: `game_id` or `creator_name`
   - Type: Text/ID
   - Default: "All"
   - Widget: Dropdown (populated from query)

3. **Multi-select**:
   - For filtering by multiple categories
   - Widget: Search/select dropdown

### Filter Query Examples

```sql
-- Optional text filter
SELECT * FROM clips
WHERE 1=1
    [[AND game_name = {{game}}]]
    [[AND creator_name = {{creator}}]]
ORDER BY created_at DESC;
```

```sql
-- Required filter with default
SELECT * FROM analytics_events
WHERE created_at >= {{start_date}}
    AND created_at <= {{end_date}}
    [[AND event_type = {{event_type}}]]
GROUP BY date_trunc('day', created_at);
```

## Performance Optimization

### Use WHERE Clauses Effectively

```sql
-- Good: Filter early
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(*)
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'  -- Filter first
    AND user_id IS NOT NULL
GROUP BY date_trunc('day', created_at);

-- Avoid: Late filtering
SELECT * FROM (
    SELECT * FROM analytics_events
) WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### Use Appropriate Aggregations

```sql
-- Efficient: COUNT DISTINCT with filter
SELECT COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE created_at >= CURRENT_DATE
    AND user_id IS NOT NULL;

-- Less efficient: Multiple subqueries
SELECT (
    SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= CURRENT_DATE
) as dau;
```

### Limit Result Sets

```sql
-- Always limit large result sets
SELECT * FROM clips
ORDER BY created_at DESC
LIMIT 100;  -- Add LIMIT

-- Use LIMIT with parameters
SELECT * FROM clips
ORDER BY created_at DESC
LIMIT {{result_limit}};  -- Default: 100
```

## Common Aggregations

```sql
-- Count, Sum, Average
SELECT 
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(amount_cents) / 100.0 as avg_amount,
    SUM(amount_cents) / 100.0 as total_revenue
FROM table_name;

-- Percentiles
SELECT 
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as p50,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration) as p99
FROM analytics_events;

-- Conditional aggregation
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'canceled') as canceled
FROM subscriptions;
```

## Formatting Numbers

```sql
-- Currency
SELECT 
    SUM(amount_cents) / 100.0 as "Total Revenue",
    AVG(amount_cents) / 100.0 as "Average Transaction"
FROM stripe_payment_intents;
-- Format as: $X,XXX.XX in visualization settings

-- Percentages
SELECT 
    ROUND((conversions::NUMERIC / trials::NUMERIC) * 100, 2) as "Conversion Rate %"
FROM metrics;
-- Format as: XX.X% in visualization settings

-- Large numbers
SELECT 
    COUNT(*) as "Total Views"
FROM analytics_events;
-- Format as: X.XM or X.XK in visualization settings
```

## Troubleshooting

### Query is slow
1. Check EXPLAIN ANALYZE output
2. Add indexes (see `000089_add_bi_analytics_indexes.up.sql`)
3. Reduce date range
4. Add WHERE clauses to filter early
5. Use materialized views for complex queries

### No data showing
1. Verify table has data: `SELECT COUNT(*) FROM table_name;`
2. Check date filters aren't too restrictive
3. Verify JOIN conditions
4. Check for NULL values

### Charts look wrong
1. Check data types (dates, numbers)
2. Verify aggregations (GROUP BY)
3. Check for NULLs in calculations
4. Review axis settings in visualization

### Permission denied
1. Verify database user has SELECT permissions
2. Check Metabase connection settings
3. Verify database is accessible from Metabase container

## Additional Resources

- [Metabase SQL Documentation](https://www.metabase.com/docs/latest/questions/native-editor/sql-parameters)
- [PostgreSQL Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL Aggregate Functions](https://www.postgresql.org/docs/current/functions-aggregate.html)
