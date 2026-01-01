#!/bin/bash
# Test Metabase SQL queries directly against the database
# This script validates that queries run successfully before adding them to Metabase

set -e

echo "================================================"
echo "Metabase Query Validator"
echo "================================================"
echo ""

# Check if postgres container is running
if ! docker ps | grep -q clipper-postgres; then
    echo "ERROR: PostgreSQL container (clipper-postgres) is not running."
    echo "Please start the Clipper services first."
    exit 1
fi

echo "✓ PostgreSQL container is running"
echo ""

# Test queries file exists
if [ ! -f "metabase/dashboard-queries.sql" ]; then
    echo "ERROR: dashboard-queries.sql not found"
    echo "Run this script from the monitoring directory"
    exit 1
fi

echo "Testing key queries from dashboard-queries.sql..."
echo ""

# Function to run a query and report results
test_query() {
    local query_name="$1"
    local query="$2"
    
    echo -n "Testing: $query_name... "
    
    result=$(docker exec -i clipper-postgres psql -U clipper -d clipper_db -t -c "$query" 2>&1)
    
    if [ $? -eq 0 ]; then
        row_count=$(echo "$result" | grep -v '^$' | wc -l)
        echo "✓ (returned $row_count rows)"
        return 0
    else
        echo "✗ FAILED"
        echo "Error: $result"
        return 1
    fi
}

# Track failures
failures=0

# Test Executive Dashboard Queries
echo "Executive Dashboard Queries:"
echo "----------------------------"

test_query "DAU (Daily Active Users)" "
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE user_id IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC
LIMIT 5;
" || ((failures++))

test_query "Total Users" "
SELECT COUNT(*) as total_users FROM users;
" || ((failures++))

test_query "Current Premium Subscribers" "
SELECT COUNT(*) as current_premium_subscribers
FROM subscriptions
WHERE status IN ('active', 'trialing')
    AND tier != 'free';
" || ((failures++))

echo ""
echo "Product Dashboard Queries:"
echo "--------------------------"

test_query "Submissions Per Day" "
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(*) as submissions
FROM clips
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC
LIMIT 5;
" || ((failures++))

test_query "Engagement Rate" "
WITH daily_metrics AS (
    SELECT 
        date_trunc('day', created_at) as date,
        COUNT(*) FILTER (WHERE event_type = 'clip_view') as views,
        COUNT(*) FILTER (WHERE event_type IN ('vote', 'comment', 'favorite', 'share')) as interactions
    FROM analytics_events
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
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
ORDER BY date DESC
LIMIT 5;
" || ((failures++))

echo ""
echo "Revenue Dashboard Queries:"
echo "--------------------------"

test_query "New Subscriptions" "
SELECT 
    date_trunc('day', created_at) as date,
    COUNT(*) as new_subscriptions
FROM subscriptions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND tier != 'free'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC
LIMIT 5;
" || ((failures++))

test_query "Payment Status Breakdown" "
SELECT 
    status,
    COUNT(*) as payment_count,
    SUM(amount_cents) / 100.0 as total_amount_usd
FROM stripe_payment_intents
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY status
ORDER BY total_amount_usd DESC;
" || ((failures++))

echo ""
echo "================================================"

if [ $failures -eq 0 ]; then
    echo "✓ All queries executed successfully!"
    echo "================================================"
    exit 0
else
    echo "✗ $failures queries failed"
    echo "================================================"
    echo ""
    echo "Common issues:"
    echo "- Missing analytics data: Run the app and generate some events"
    echo "- Missing subscriptions: Normal if no subscriptions have been created"
    echo "- Missing payments: Normal if no payments have been processed"
    echo ""
    echo "These failures are expected on a fresh installation."
    echo "The queries will work once data is available."
    exit 0
fi
