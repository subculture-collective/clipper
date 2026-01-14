# Metabase Business Intelligence Dashboards

This directory contains configuration and queries for Metabase BI dashboards for Clipper analytics.

## Overview

Metabase provides business intelligence dashboards for:
- **Executive Dashboard**: High-level KPIs (DAU/WAU/MAU, MRR, Churn)
- **Product Dashboard**: User engagement and feature adoption metrics
- **Revenue Dashboard**: Subscription and payment analytics

## Quick Start

### 1. Configure Environment Variables

Add these to your `.env` file or environment:

```bash
# Metabase Configuration
METABASE_DB_NAME=metabase
METABASE_DB_USER=metabase
METABASE_DB_PASSWORD=your_secure_password_here
```

**Note**: Metabase uses a separate PostgreSQL database for its own metadata. This is different from the main Clipper database.

### 2. Create Metabase Database

Before starting Metabase, create its metadata database:

```bash
# Connect to PostgreSQL
docker exec -it clipper-postgres psql -U clipper -d clipper_db

# Create metabase database and user
# IMPORTANT: Replace 'your_secure_password_here' with the same password you set
# for METABASE_DB_PASSWORD in your .env file. Generate a strong password with:
# openssl rand -base64 32
CREATE DATABASE metabase;
CREATE USER metabase WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE metabase TO metabase;
\q
```

### 3. Start Metabase

```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d metabase
```

### 4. Initial Setup

1. **Access Metabase**: Navigate to http://localhost:13000
2. **Create Admin Account**:
   - Follow the setup wizard
   - Set up your admin email and password
   - Skip "Add your data" for now
3. **Connect to Clipper Database**:
   - Click "Add a database" or go to Settings → Admin → Databases
   - Select "PostgreSQL"
   - Configure:
     - Display name: `Clipper Production` (or your environment name)
     - Host: `postgres`
     - Port: `5432`
     - Database name: `clipper_db`
     - Username: `clipper` (or your DB user)
     - Password: Your database password
   - Click "Save"
   - Wait for Metabase to scan the schema

## Building Dashboards

### Executive Dashboard

Create a new dashboard called "Executive Dashboard" and add these questions:

#### 1. Daily Active Users (DAU)
- **Type**: Line chart
- **Query**: Use SQL from `dashboard-queries.sql` → "Daily Active Users (DAU)"
- **Visualization**: Line chart with date on X-axis, DAU on Y-axis

#### 2. Weekly Active Users (WAU)
- **Type**: Number
- **Query**: Use "Weekly Active Users (WAU)" query
- **Visualization**: Single value showing most recent WAU

#### 3. Monthly Active Users (MAU)
- **Type**: Number
- **Query**: Use "Monthly Active Users (MAU)" query
- **Visualization**: Single value showing most recent MAU

#### 4. Total Users Trend
- **Type**: Line chart
- **Query**: Use "Total Users Trend" query
- **Visualization**: Line chart showing cumulative user growth

#### 5. Premium Subscribers
- **Type**: Number + Line chart
- **Query**: Use "Premium Subscribers Trend" query
- **Visualization**: 
  - Number card showing current count
  - Line chart showing trend over time

#### 6. Monthly Recurring Revenue (MRR)
- **Type**: Number + Line chart
- **Query**: Use "Current MRR" and "Monthly Recurring Revenue (MRR)" queries
- **Visualization**: 
  - Number card formatted as currency
  - Line chart showing MRR trend
- **Note**: Update the price mapping in the query to match your actual Stripe price IDs

#### 7. Churn Rate
- **Type**: Number + Line chart
- **Query**: Use "Churn Rate" query
- **Visualization**: 
  - Number card showing current churn rate as percentage
  - Line chart showing churn trend

### Product Dashboard

Create a new dashboard called "Product Dashboard":

#### 1. Submissions Per Day
- **Query**: Use "Submissions Per Day" query
- **Visualization**: Bar chart or line chart

#### 2. Search Queries Per Day
- **Query**: Use "Search Queries Per Day" query
- **Visualization**: Line chart

#### 3. Engagement Rate
- **Query**: Use "Engagement Rate" query
- **Visualization**: 
  - Number card showing current rate
  - Line chart showing trend

#### 4. Feature Adoption
- **Query**: Use the three feature adoption queries (Favorites, Comments, Voting)
- **Visualization**: Multiple line charts showing adoption trends

#### 5. Top Creators
- **Query**: Use "Top Creators by Engagement" query
- **Visualization**: Table sorted by total views

#### 6. Content by Game
- **Query**: Use "Content Performance by Game" query
- **Visualization**: Bar chart or table

### Revenue Dashboard

Create a new dashboard called "Revenue Dashboard":

#### 1. New Subscriptions
- **Query**: Use "New Subscriptions" query
- **Visualization**: Stacked bar chart showing premium vs trial

#### 2. Cancellations
- **Query**: Use "Subscription Cancellations" query
- **Visualization**: Line chart with immediate vs scheduled cancellations

#### 3. Revenue by Status
- **Query**: Use "Revenue by Payment Status" query
- **Visualization**: Pie chart or horizontal bar chart

#### 4. Customer Lifetime Value (LTV)
- **Query**: Use "Customer Lifetime Value (LTV) - Simplified" query
- **Visualization**: Number cards showing avg LTV and total revenue

#### 5. Revenue by Cohort
- **Query**: Use "Revenue by Cohort (Monthly)" query
- **Visualization**: Cohort retention chart or stacked bar chart

#### 6. Conversion Rate
- **Query**: Use "Subscription Conversion Rate" query
- **Visualization**: Number card + line chart

#### 7. ARPU
- **Query**: Use "Average Revenue Per User (ARPU)" query
- **Visualization**: Line chart showing ARPU trend

## Dashboard Filters

Add these filters to your dashboards for interactivity:

### Common Filters
- **Date Range**: Add a date parameter to queries for dynamic filtering
- **Game/Creator**: Filter by specific games or creators
- **Subscription Tier**: Filter by premium tier

### Example Parameterized Query

```sql
-- DAU with date filter
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE user_id IS NOT NULL
    AND created_at >= {{start_date}}
    AND created_at <= {{end_date}}
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;
```

## Customizing Queries

The queries in `dashboard-queries.sql` are templates. You may need to customize them:

### 1. Update Price Mappings

In the MRR queries, update the price mapping to match your actual Stripe prices:

```sql
CASE 
    WHEN stripe_price_id = 'price_1234567890' THEN 9.99
    WHEN stripe_price_id = 'price_0987654321' THEN 99.99 / 12
    ELSE 0
END as monthly_amount
```

### 2. Adjust Time Ranges

Change the interval in queries based on your needs:
- `INTERVAL '30 days'` → `INTERVAL '90 days'`
- `INTERVAL '12 months'` → `INTERVAL '24 months'`

### 3. Add Custom Metrics

Extend queries with additional columns or filters based on your business needs.

## Sharing Dashboards

### Internal Team Access

1. **Create Team Accounts**:
   - Settings → Admin → People → Add new user
   - Assign appropriate permissions

2. **Create Collections**:
   - Organize dashboards into collections
   - Set permissions per collection

3. **Share Links**:
   - Click "Share" on any dashboard
   - Generate public link or email to team

### External Stakeholders

For board members or investors:

1. **Create Read-Only Account**:
   - Settings → Admin → People → Add new user
   - Set permissions to "View only"

2. **Dashboard Subscriptions**:
   - Set up email subscriptions
   - Settings → Dashboard → Subscriptions
   - Schedule daily/weekly reports

3. **Embedded Dashboards** (Optional):
   - Enable public sharing
   - Embed iframe in internal tools

## Maintenance

### Regular Tasks

1. **Monitor Metabase Performance**:
   ```bash
   docker logs clipper-metabase
   docker stats clipper-metabase
   ```

2. **Update Queries**: As your schema evolves, update queries in Metabase

3. **Backup Metabase Database**:
   ```bash
   docker exec clipper-postgres pg_dump -U metabase metabase > metabase_backup.sql
   ```

### Troubleshooting

#### Metabase won't start
- Check logs: `docker logs clipper-metabase`
- Verify database credentials
- Ensure metabase database exists

#### Queries are slow
- Add indexes to frequently queried columns
- Use the queries in `dashboard-queries.sql` as they're optimized
- Consider creating materialized views for complex aggregations

#### Data looks incorrect
- Verify analytics events are being tracked
- Check that subscriptions table is being updated
- Run data validation queries

## Performance Optimization

### Database Indexes

Ensure these indexes exist for optimal query performance:

```sql
-- Analytics events
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_user 
    ON analytics_events(created_at DESC, user_id);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_status 
    ON subscriptions(created_at DESC, status);

-- Stripe payment intents
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_created_status 
    ON stripe_payment_intents(created_at DESC, status);
```

### Materialized Views (Optional)

For frequently accessed metrics, create materialized views:

```sql
-- Daily platform metrics
CREATE MATERIALIZED VIEW daily_platform_metrics AS
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(DISTINCT user_id) as dau,
    COUNT(*) FILTER (WHERE event_type = 'clip_view') as views,
    COUNT(*) FILTER (WHERE event_type IN ('vote', 'comment')) as interactions
FROM analytics_events
WHERE user_id IS NOT NULL
GROUP BY date_trunc('day', created_at);

-- Refresh daily
REFRESH MATERIALIZED VIEW daily_platform_metrics;
```

## Security Considerations

1. **Use Strong Passwords**: For both Metabase admin and database connections
2. **Restrict Access**: Use Metabase's permission system
3. **SSL/TLS**: In production, enable SSL for Metabase
4. **Network Isolation**: Keep Metabase on internal network if possible
5. **Regular Updates**: Keep Metabase image updated

## Advanced Features

### Alerts

Set up alerts for important metrics:
1. Go to a question → Click bell icon
2. Set conditions (e.g., "Alert me when DAU drops below X")
3. Configure email notifications

### API Access

Metabase provides a REST API for programmatic access:
```bash
# Get API key from Settings → Admin → Settings → Embedding
curl -H "X-Metabase-Session: YOUR_SESSION_ID" \
     http://localhost:13000/api/dashboard/1
```

### Embedded Analytics

For embedding dashboards in your app:
1. Enable public sharing: Settings → Admin → Settings → Public Sharing
2. Enable embedding: Settings → Admin → Settings → Embedding
3. Generate signed embed URLs

## Resources

- [Metabase Documentation](https://www.metabase.com/docs/latest/)
- [Metabase SQL Reference](https://www.metabase.com/docs/latest/questions/native-editor/sql-parameters)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

## Support

For issues or questions:
1. Check Metabase logs: `docker logs clipper-metabase`
2. Review [Metabase Discourse](https://discourse.metabase.com/)
3. Open a GitHub issue with logs and error details
