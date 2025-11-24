-- Create revenue_metrics table to store daily revenue metrics snapshots
CREATE TABLE IF NOT EXISTS revenue_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    mrr_cents BIGINT NOT NULL DEFAULT 0,  -- Monthly Recurring Revenue in cents
    arr_cents BIGINT NOT NULL DEFAULT 0,  -- Annual Recurring Revenue in cents
    total_subscribers INT NOT NULL DEFAULT 0,
    active_subscribers INT NOT NULL DEFAULT 0,
    trialing_subscribers INT NOT NULL DEFAULT 0,
    churned_subscribers INT NOT NULL DEFAULT 0,  -- Subscribers lost this day
    new_subscribers INT NOT NULL DEFAULT 0,  -- New subscribers this day
    arpu_cents BIGINT NOT NULL DEFAULT 0,  -- Average Revenue Per User in cents
    monthly_plan_count INT NOT NULL DEFAULT 0,
    yearly_plan_count INT NOT NULL DEFAULT 0,
    free_plan_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on date for efficient date range queries
CREATE INDEX idx_revenue_metrics_date ON revenue_metrics(date);

-- Create cohort_retention table for tracking subscriber retention by cohort
CREATE TABLE IF NOT EXISTS cohort_retention (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_month DATE NOT NULL,  -- Start of the month (e.g., 2024-01-01)
    months_since_join INT NOT NULL,  -- 0, 1, 2, 3... months after joining
    initial_subscribers INT NOT NULL DEFAULT 0,  -- Subscribers who joined in cohort_month
    retained_subscribers INT NOT NULL DEFAULT 0,  -- Subscribers still active after months_since_join
    retention_rate DECIMAL(5, 4) NOT NULL DEFAULT 0,  -- retained/initial as decimal (e.g., 0.8500)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cohort_month, months_since_join)
);

-- Create indexes for cohort queries
CREATE INDEX idx_cohort_retention_cohort_month ON cohort_retention(cohort_month);
CREATE INDEX idx_cohort_retention_months_since_join ON cohort_retention(months_since_join);

-- Add trigger to update updated_at timestamp for revenue_metrics
CREATE OR REPLACE FUNCTION update_revenue_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_revenue_metrics_updated_at
    BEFORE UPDATE ON revenue_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_revenue_metrics_updated_at();

-- Add trigger to update updated_at timestamp for cohort_retention
CREATE OR REPLACE FUNCTION update_cohort_retention_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cohort_retention_updated_at
    BEFORE UPDATE ON cohort_retention
    FOR EACH ROW
    EXECUTE FUNCTION update_cohort_retention_updated_at();
