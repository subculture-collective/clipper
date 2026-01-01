# Metabase Dashboard Templates

This directory contains dashboard templates and configurations for Metabase.

## Dashboard Structure

### Executive Dashboard

**Purpose**: High-level KPIs for executives and stakeholders

**Metrics**:
1. **Active Users** (Row 1)
   - DAU (Daily Active Users) - Line chart
   - WAU (Weekly Active Users) - Number card
   - MAU (Monthly Active Users) - Number card

2. **User Growth** (Row 2)
   - Total Users Trend - Line chart (full width)

3. **Subscriptions** (Row 3)
   - Current Premium Subscribers - Number card
   - Premium Subscriber Trend - Line chart

4. **Revenue** (Row 4)
   - Current MRR - Number card (formatted as currency)
   - MRR Trend - Line chart

5. **Health Metrics** (Row 5)
   - Churn Rate - Number card (formatted as percentage)
   - Churn Rate Trend - Line chart

**Filters**:
- Date range filter (default: last 90 days)

**Refresh**: Every 1 hour

---

### Product Dashboard

**Purpose**: Product metrics for product managers and growth team

**Metrics**:
1. **Content Activity** (Row 1)
   - Submissions Per Day - Bar chart
   - Search Queries Per Day - Line chart

2. **Engagement** (Row 2)
   - Current Engagement Rate - Number card
   - Engagement Rate Trend - Line chart

3. **Feature Adoption** (Row 3)
   - Favorites Adoption - Line chart
   - Comments Adoption - Line chart
   - Voting Activity - Line chart

4. **Content Performance** (Row 4)
   - Top Creators - Table
   - Content by Game - Bar chart

**Filters**:
- Date range filter (default: last 30 days)
- Game filter (optional)
- Creator filter (optional)

**Refresh**: Every 30 minutes

---

### Revenue Dashboard

**Purpose**: Financial metrics for finance team and leadership

**Metrics**:
1. **Subscription Funnel** (Row 1)
   - New Subscriptions - Bar chart (stacked: premium vs trial)
   - Cancellations - Line chart

2. **Revenue Breakdown** (Row 2)
   - Revenue by Payment Status - Pie chart
   - Revenue Trend - Line chart

3. **Customer Value** (Row 3)
   - Average LTV - Number card
   - ARPU - Line chart

4. **Cohort Analysis** (Row 4)
   - Revenue by Cohort - Cohort chart or stacked area chart

5. **Conversion** (Row 5)
   - Trial Conversion Rate - Number card
   - Conversion Rate Trend - Line chart

**Filters**:
- Date range filter (default: last 90 days)
- Subscription tier filter (optional)

**Refresh**: Every 1 hour

---

## Creating Dashboards

### Step-by-Step Guide

1. **Log into Metabase** at http://localhost:13000

2. **Create a new dashboard**:
   - Click "New" → "Dashboard"
   - Name it (e.g., "Executive Dashboard")
   - Add a description

3. **Add questions to dashboard**:
   - Click "Add a question"
   - For each metric, create a "New Question"
   - Choose "Native query" (SQL)
   - Copy the SQL from `dashboard-queries.sql`
   - Configure visualization (chart type, axes, formatting)
   - Save the question
   - Add it to the dashboard

4. **Arrange dashboard layout**:
   - Drag and drop cards to arrange
   - Resize cards for proper display
   - Recommended widths:
     - Number cards: 3-4 grid units wide
     - Charts: 6-12 grid units wide
     - Tables: 8-12 grid units wide

5. **Add filters**:
   - Click "Add a filter"
   - Choose "Time" for date range filters
   - Map filter to questions that support it
   - Set default value (e.g., "Past 90 days")

6. **Configure refresh**:
   - Click dashboard settings (gear icon)
   - Set "Auto-refresh" interval
   - Executive: 1 hour
   - Product: 30 minutes
   - Revenue: 1 hour

7. **Share dashboard**:
   - Click "Share" icon
   - Add team members
   - Set up subscriptions (email reports)

### Tips for Effective Dashboards

1. **Visual Hierarchy**:
   - Place most important metrics at the top
   - Use larger cards for primary KPIs
   - Group related metrics together

2. **Color Coding**:
   - Green for positive metrics (growth, conversions)
   - Red for negative metrics (churn, cancellations)
   - Blue/neutral for informational metrics

3. **Number Formatting**:
   - Currency: $X,XXX.XX
   - Percentages: XX.X%
   - Large numbers: X.XK or X.XM

4. **Chart Types**:
   - Line charts: Trends over time
   - Bar charts: Comparisons across categories
   - Number cards: Single important values
   - Tables: Detailed breakdowns
   - Pie charts: Composition (use sparingly)

5. **Performance**:
   - Use date range filters to limit data
   - Consider materialized views for slow queries
   - Set appropriate auto-refresh intervals

---

## Exporting and Version Control

To export dashboards for version control:

1. **Export dashboard**:
   - Settings → Admin → Data Model
   - Select dashboard
   - Click "..." → "Export"
   - Save JSON file

2. **Commit to git**:
   ```bash
   # Save dashboard exports here
   git add monitoring/metabase/dashboards/
   git commit -m "Update Metabase dashboards"
   ```

3. **Import dashboard**:
   - Settings → Admin → Data Model
   - Click "Import"
   - Upload JSON file

---

## Maintenance Checklist

### Weekly
- [ ] Review dashboard accuracy
- [ ] Check for slow queries
- [ ] Verify data freshness

### Monthly
- [ ] Update SQL queries if schema changes
- [ ] Add new metrics as needed
- [ ] Review user feedback
- [ ] Clean up unused questions

### Quarterly
- [ ] Audit dashboard access
- [ ] Review and update goals/targets
- [ ] Optimize slow queries
- [ ] Update documentation

---

## Common Issues

### Dashboard loads slowly
- Add indexes on frequently queried columns
- Reduce date range in queries
- Use materialized views for complex aggregations

### Data looks incorrect
- Verify analytics events are being tracked
- Check subscription webhooks are processing
- Run data validation queries
- Check for data gaps

### Charts look broken
- Verify date columns are properly formatted
- Check for null values in aggregations
- Ensure proper axis configuration
- Review color schemes

---

## Resources

- [Metabase Visualization Guide](https://www.metabase.com/docs/latest/questions/sharing/visualizing-results.html)
- [Metabase Dashboard Best Practices](https://www.metabase.com/learn/dashboards/)
- SQL queries: `monitoring/metabase/dashboard-queries.sql`
