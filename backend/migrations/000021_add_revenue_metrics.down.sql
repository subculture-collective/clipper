-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_revenue_metrics_updated_at ON revenue_metrics;
DROP TRIGGER IF EXISTS trigger_cohort_retention_updated_at ON cohort_retention;

-- Drop functions
DROP FUNCTION IF EXISTS update_revenue_metrics_updated_at();
DROP FUNCTION IF EXISTS update_cohort_retention_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_revenue_metrics_date;
DROP INDEX IF EXISTS idx_cohort_retention_cohort_month;
DROP INDEX IF EXISTS idx_cohort_retention_months_since_join;

-- Drop tables
DROP TABLE IF EXISTS cohort_retention;
DROP TABLE IF EXISTS revenue_metrics;
