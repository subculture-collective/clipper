-- ============================================================================
-- Metabase Dashboard SQL Queries
-- ============================================================================
-- This file contains SQL queries for building Metabase dashboards for Clipper
-- These queries leverage the existing analytics and subscription tables
--
-- Usage: Copy these queries into Metabase as needed for each dashboard
--
-- IMPORTANT: Price Mapping Configuration
-- ============================================================================
-- Multiple queries use hardcoded price mappings for MRR calculation.
-- Before using these queries in production, you MUST:
-- 1. Update the CASE statements in MRR queries (lines ~90-110 and ~115-135)
--    with your actual Stripe price IDs and amounts
-- 2. OR better yet: Create a dedicated price_tiers table and reference it
-- 3. Keep price mappings in sync across all queries that use them
--
-- Example:
--   WHEN stripe_price_id = 'price_1234567890' THEN 9.99
--   WHEN stripe_price_id = 'price_0987654321' THEN 99.99 / 12
-- ============================================================================

-- ============================================================================
-- EXECUTIVE DASHBOARD QUERIES
-- ============================================================================

-- Query: Daily Active Users (DAU)
-- Description: Count of unique users active each day
-- Dashboard: Executive
-- Visualization: Line chart or number
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE user_id IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- Query: Weekly Active Users (WAU)
-- Description: Count of unique users active in the past 7 days
-- Dashboard: Executive
-- Visualization: Number or line chart
SELECT 
    date_trunc('week', created_at) as week,
    COUNT(DISTINCT user_id) as wau
FROM analytics_events
WHERE user_id IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY date_trunc('week', created_at)
ORDER BY week DESC;

-- Query: Monthly Active Users (MAU)
-- Description: Count of unique users active in the past 30 days
-- Dashboard: Executive
-- Visualization: Number or line chart
SELECT 
    date_trunc('month', created_at) as month,
    COUNT(DISTINCT user_id) as mau
FROM analytics_events
WHERE user_id IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY date_trunc('month', created_at)
ORDER BY month DESC;

-- Query: Total Users Trend
-- Description: Cumulative count of registered users over time
-- Dashboard: Executive
-- Visualization: Line chart
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(*) as new_users,
    SUM(COUNT(*)) OVER (ORDER BY date_trunc('day', created_at)) as total_users
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- Query: Premium Subscribers Trend
-- Description: Count of active premium subscribers over time
-- Dashboard: Executive
-- Visualization: Line chart
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(*) FILTER (WHERE status IN ('active', 'trialing')) as premium_subscribers
FROM subscriptions
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
    AND tier != 'free'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- Query: Current Premium Subscribers Count
-- Description: Total active premium subscribers right now
-- Dashboard: Executive
-- Visualization: Number
SELECT COUNT(*) as current_premium_subscribers
FROM subscriptions
WHERE status IN ('active', 'trialing')
    AND tier != 'free';

-- Query: Monthly Recurring Revenue (MRR)
-- Description: Calculate MRR from active subscriptions
-- Dashboard: Executive
-- Visualization: Number or line chart
-- Note: Assumes stripe_price_id contains pricing info; adjust based on your pricing structure
WITH price_mapping AS (
    SELECT 
        stripe_price_id,
        CASE 
            -- Add your actual Stripe price IDs and amounts here
            WHEN stripe_price_id LIKE '%_monthly%' THEN 9.99
            WHEN stripe_price_id LIKE '%_annual%' THEN 99.99 / 12  -- Convert annual to monthly
            ELSE 0
        END as monthly_amount
    FROM subscriptions
    WHERE status = 'active'
)
SELECT 
    date_trunc('month', s.current_period_start) as month,
    SUM(pm.monthly_amount) as mrr
FROM subscriptions s
JOIN price_mapping pm ON s.stripe_price_id = pm.stripe_price_id
WHERE s.status = 'active'
    AND s.current_period_start >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY date_trunc('month', s.current_period_start)
ORDER BY month DESC;

-- Query: Current MRR
-- Description: Current month's MRR
-- Dashboard: Executive
-- Visualization: Number
WITH price_mapping AS (
    SELECT 
        stripe_price_id,
        CASE 
            WHEN stripe_price_id LIKE '%_monthly%' THEN 9.99
            WHEN stripe_price_id LIKE '%_annual%' THEN 99.99 / 12
            ELSE 0
        END as monthly_amount
    FROM subscriptions
    WHERE status = 'active'
)
SELECT SUM(pm.monthly_amount) as current_mrr
FROM subscriptions s
JOIN price_mapping pm ON s.stripe_price_id = pm.stripe_price_id
WHERE s.status = 'active';

-- Query: Churn Rate
-- Description: Monthly subscription churn rate (churned customers / active customers at month start)
-- Dashboard: Executive
-- Visualization: Number or line chart
-- Note: This calculates churn as customers who canceled in a month divided by active at start of month
WITH monthly_churns AS (
    SELECT 
        date_trunc('month', canceled_at) as month,
        COUNT(*) as churned_customers
    FROM subscriptions
    WHERE canceled_at IS NOT NULL
        AND canceled_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY date_trunc('month', canceled_at)
),
active_by_month AS (
    -- Count active subscriptions at the start of each month
    SELECT 
        date_trunc('month', d.month_start) as month,
        COUNT(*) as active_at_start
    FROM (
        SELECT generate_series(
            date_trunc('month', CURRENT_DATE - INTERVAL '12 months'),
            date_trunc('month', CURRENT_DATE),
            INTERVAL '1 month'
        ) as month_start
    ) d
    CROSS JOIN subscriptions s
    WHERE s.created_at < d.month_start
        AND (s.canceled_at IS NULL OR s.canceled_at >= d.month_start)
        AND s.tier != 'free'
    GROUP BY date_trunc('month', d.month_start)
)
SELECT 
    COALESCE(mc.month, am.month) as month,
    COALESCE(mc.churned_customers, 0) as churned_customers,
    am.active_at_start,
    CASE 
        WHEN am.active_at_start > 0 
        THEN ROUND((COALESCE(mc.churned_customers, 0)::NUMERIC / am.active_at_start::NUMERIC) * 100, 2)
        ELSE 0 
    END as churn_rate_percent
FROM active_by_month am
LEFT JOIN monthly_churns mc ON am.month = mc.month
ORDER BY COALESCE(mc.month, am.month) DESC;

-- ============================================================================
-- PRODUCT DASHBOARD QUERIES
-- ============================================================================

-- Query: Submissions Per Day
-- Description: Count of new clip submissions by day
-- Dashboard: Product
-- Visualization: Bar chart or line chart
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(*) as submissions
FROM clips
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- Query: Search Queries Per Day
-- Description: Count of search events by day
-- Dashboard: Product
-- Visualization: Bar chart or line chart
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(*) as search_queries
FROM analytics_events
WHERE event_type = 'search'
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- Query: Engagement Rate
-- Description: Calculate engagement rate (interactions / views)
-- Dashboard: Product
-- Visualization: Number or line chart
WITH daily_metrics AS (
    SELECT 
        date_trunc('day', created_at) as date,
        COUNT(*) FILTER (WHERE event_type = 'clip_view') as views,
        COUNT(*) FILTER (WHERE event_type IN ('vote', 'comment', 'favorite', 'share')) as interactions
    FROM analytics_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date_trunc('day', created_at)
)
SELECT 
    date,
    views,
    interactions,
    CASE 
        WHEN views > 0 
        THEN ROUND((interactions::NUMERIC / views::NUMERIC) * 100, 2)
        ELSE 0 
    END as engagement_rate_percent
FROM daily_metrics
ORDER BY date DESC;

-- Query: Feature Adoption - Favorites
-- Description: Track adoption of favorites feature over time
-- Dashboard: Product
-- Visualization: Line chart
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(DISTINCT user_id) as users_using_favorites,
    COUNT(*) as total_favorite_events
FROM analytics_events
WHERE event_type = 'favorite'
    AND created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- Query: Feature Adoption - Comments
-- Description: Track adoption of comments feature over time
-- Dashboard: Product
-- Visualization: Line chart
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(DISTINCT user_id) as users_posting_comments,
    COUNT(*) as total_comments
FROM analytics_events
WHERE event_type = 'comment'
    AND created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- Query: Feature Adoption - Voting
-- Description: Track voting activity over time
-- Dashboard: Product
-- Visualization: Line chart
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(DISTINCT user_id) as users_voting,
    COUNT(*) as total_votes
FROM analytics_events
WHERE event_type = 'vote'
    AND created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- Query: Top Creators by Engagement
-- Description: Most engaging creators based on views and interactions
-- Dashboard: Product
-- Visualization: Table or bar chart
SELECT 
    creator_name,
    total_clips,
    total_views,
    total_upvotes,
    total_comments,
    avg_engagement_rate,
    ROUND((total_views::NUMERIC / NULLIF(total_clips, 0)), 2) as avg_views_per_clip
FROM creator_analytics
ORDER BY total_views DESC
LIMIT 20;

-- Query: Content Performance by Game
-- Description: Analyze clip performance by game
-- Dashboard: Product
-- Visualization: Bar chart or table
SELECT 
    game_name,
    COUNT(*) as clip_count,
    SUM(view_count) as total_views,
    AVG(view_count) as avg_views_per_clip,
    SUM(vote_score) as total_score
FROM clips
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND is_removed = false
GROUP BY game_name
ORDER BY total_views DESC
LIMIT 20;

-- ============================================================================
-- REVENUE DASHBOARD QUERIES
-- ============================================================================

-- Query: New Subscriptions
-- Description: Count of new subscriptions by day
-- Dashboard: Revenue
-- Visualization: Bar chart or line chart
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(*) as new_subscriptions,
    COUNT(*) FILTER (WHERE tier = 'premium') as premium_subscriptions,
    COUNT(*) FILTER (WHERE trial_start IS NOT NULL) as trial_subscriptions
FROM subscriptions
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
    AND tier != 'free'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- Query: Subscription Cancellations
-- Description: Count of cancellations by day
-- Dashboard: Revenue
-- Visualization: Bar chart or line chart
SELECT 
    date_trunc('day', canceled_at) as date,
    COUNT(*) as cancellations,
    COUNT(*) FILTER (WHERE cancel_at_period_end = true) as scheduled_cancellations,
    COUNT(*) FILTER (WHERE cancel_at_period_end = false) as immediate_cancellations
FROM subscriptions
WHERE canceled_at >= CURRENT_DATE - INTERVAL '90 days'
    AND canceled_at IS NOT NULL
GROUP BY date_trunc('day', canceled_at)
ORDER BY date DESC;

-- Query: Revenue by Payment Status
-- Description: Breakdown of payment intents by status
-- Dashboard: Revenue
-- Visualization: Pie chart or bar chart
SELECT 
    status,
    COUNT(*) as payment_count,
    SUM(amount_cents) / 100.0 as total_amount_usd
FROM stripe_payment_intents
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY status
ORDER BY total_amount_usd DESC;

-- Query: Customer Lifetime Value (LTV) - Simplified
-- Description: Average revenue per customer (simplified LTV)
-- Dashboard: Revenue
-- Visualization: Number
WITH customer_revenue AS (
    SELECT 
        stripe_customer_id,
        SUM(amount_cents) / 100.0 as total_revenue
    FROM stripe_payment_intents
    WHERE status = 'succeeded'
    GROUP BY stripe_customer_id
)
SELECT 
    COUNT(*) as total_customers,
    SUM(total_revenue) as total_revenue,
    AVG(total_revenue) as avg_ltv
FROM customer_revenue;

-- Query: Revenue by Cohort (Monthly)
-- Description: Revenue grouped by customer signup month
-- Dashboard: Revenue
-- Visualization: Stacked bar chart or line chart
WITH customer_cohorts AS (
    SELECT 
        u.id as user_id,
        sc.stripe_customer_id,
        date_trunc('month', u.created_at) as cohort_month
    FROM users u
    JOIN stripe_customers sc ON u.id = sc.user_id
),
cohort_revenue AS (
    SELECT 
        cc.cohort_month,
        date_trunc('month', spi.created_at) as revenue_month,
        SUM(spi.amount_cents) / 100.0 as revenue
    FROM customer_cohorts cc
    JOIN stripe_payment_intents spi ON cc.stripe_customer_id = spi.stripe_customer_id
    WHERE spi.status = 'succeeded'
        AND spi.created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY cc.cohort_month, date_trunc('month', spi.created_at)
)
SELECT 
    cohort_month,
    revenue_month,
    revenue,
    EXTRACT(MONTH FROM AGE(revenue_month, cohort_month)) as months_since_signup
FROM cohort_revenue
ORDER BY cohort_month DESC, revenue_month DESC;

-- Query: Subscription Conversion Rate
-- Description: Trial to paid conversion rate
-- Dashboard: Revenue
-- Visualization: Number or line chart
WITH trial_conversions AS (
    SELECT 
        date_trunc('month', trial_start) as trial_month,
        COUNT(*) as trials_started,
        COUNT(*) FILTER (WHERE status = 'active' AND trial_end IS NOT NULL AND current_period_start > trial_end) as conversions
    FROM subscriptions
    WHERE trial_start IS NOT NULL
        AND trial_start >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY date_trunc('month', trial_start)
)
SELECT 
    trial_month,
    trials_started,
    conversions,
    CASE 
        WHEN trials_started > 0 
        THEN ROUND((conversions::NUMERIC / trials_started::NUMERIC) * 100, 2)
        ELSE 0 
    END as conversion_rate_percent
FROM trial_conversions
ORDER BY trial_month DESC;

-- Query: Average Revenue Per User (ARPU)
-- Description: Monthly ARPU calculation
-- Dashboard: Revenue
-- Visualization: Line chart or number
WITH monthly_revenue AS (
    SELECT 
        date_trunc('month', created_at) as month,
        SUM(amount_cents) / 100.0 as revenue
    FROM stripe_payment_intents
    WHERE status = 'succeeded'
        AND created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY date_trunc('month', created_at)
),
monthly_users AS (
    SELECT 
        date_trunc('month', created_at) as month,
        COUNT(*) as active_users
    FROM analytics_events
    WHERE user_id IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY date_trunc('month', created_at)
)
SELECT 
    mr.month,
    mr.revenue,
    mu.active_users,
    ROUND(mr.revenue / NULLIF(mu.active_users, 0), 2) as arpu
FROM monthly_revenue mr
JOIN monthly_users mu ON mr.month = mu.month
ORDER BY mr.month DESC;

-- ============================================================================
-- CROSS-DASHBOARD QUERIES
-- ============================================================================

-- Query: Platform Health Snapshot
-- Description: High-level metrics for overall platform health
-- Dashboard: All
-- Visualization: Scorecard/Numbers
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM clips WHERE is_removed = false) as total_clips,
    (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= CURRENT_DATE) as dau,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND tier != 'free') as active_subscribers,
    (SELECT COUNT(*) FROM analytics_events WHERE created_at >= CURRENT_DATE) as events_today;

-- Query: User Retention by Cohort
-- Description: Retention rates for user cohorts
-- Dashboard: Executive, Product
-- Visualization: Retention matrix
WITH user_cohorts AS (
    SELECT 
        id as user_id,
        date_trunc('month', created_at) as cohort_month
    FROM users
    WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
),
user_activity AS (
    SELECT DISTINCT
        user_id,
        date_trunc('month', created_at) as activity_month
    FROM analytics_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
        AND user_id IS NOT NULL
)
SELECT 
    uc.cohort_month,
    COUNT(DISTINCT uc.user_id) as cohort_size,
    ua.activity_month,
    COUNT(DISTINCT ua.user_id) as active_users,
    ROUND((COUNT(DISTINCT ua.user_id)::NUMERIC / COUNT(DISTINCT uc.user_id)::NUMERIC) * 100, 2) as retention_percent
FROM user_cohorts uc
LEFT JOIN user_activity ua ON uc.user_id = ua.user_id
GROUP BY uc.cohort_month, ua.activity_month
ORDER BY uc.cohort_month DESC, ua.activity_month DESC;
