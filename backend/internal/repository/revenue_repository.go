package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

// RevenueRepository handles database operations for revenue metrics
type RevenueRepository struct {
	db *pgxpool.Pool
}

// NewRevenueRepository creates a new revenue repository
func NewRevenueRepository(db *pgxpool.Pool) *RevenueRepository {
	return &RevenueRepository{db: db}
}

// UpsertDailyMetrics inserts or updates daily revenue metrics
func (r *RevenueRepository) UpsertDailyMetrics(ctx context.Context, metrics *models.RevenueMetrics) error {
	query := `
		INSERT INTO revenue_metrics (
			date, mrr_cents, arr_cents, total_subscribers, active_subscribers,
			trialing_subscribers, churned_subscribers, new_subscribers, arpu_cents,
			monthly_plan_count, yearly_plan_count, free_plan_count
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (date) DO UPDATE SET
			mrr_cents = EXCLUDED.mrr_cents,
			arr_cents = EXCLUDED.arr_cents,
			total_subscribers = EXCLUDED.total_subscribers,
			active_subscribers = EXCLUDED.active_subscribers,
			trialing_subscribers = EXCLUDED.trialing_subscribers,
			churned_subscribers = EXCLUDED.churned_subscribers,
			new_subscribers = EXCLUDED.new_subscribers,
			arpu_cents = EXCLUDED.arpu_cents,
			monthly_plan_count = EXCLUDED.monthly_plan_count,
			yearly_plan_count = EXCLUDED.yearly_plan_count,
			free_plan_count = EXCLUDED.free_plan_count
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query,
		metrics.Date, metrics.MRRCents, metrics.ARRCents, metrics.TotalSubscribers,
		metrics.ActiveSubscribers, metrics.TrialingSubscribers, metrics.ChurnedSubscribers,
		metrics.NewSubscribers, metrics.ARPUCents, metrics.MonthlyPlanCount,
		metrics.YearlyPlanCount, metrics.FreePlanCount,
	).Scan(&metrics.ID, &metrics.CreatedAt, &metrics.UpdatedAt)

	return err
}

// GetMetricsByDateRange retrieves revenue metrics for a date range
func (r *RevenueRepository) GetMetricsByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*models.RevenueMetrics, error) {
	query := `
		SELECT id, date, mrr_cents, arr_cents, total_subscribers, active_subscribers,
		       trialing_subscribers, churned_subscribers, new_subscribers, arpu_cents,
		       monthly_plan_count, yearly_plan_count, free_plan_count, created_at, updated_at
		FROM revenue_metrics
		WHERE date >= $1 AND date <= $2
		ORDER BY date ASC
	`

	rows, err := r.db.Query(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var metrics []*models.RevenueMetrics
	for rows.Next() {
		var m models.RevenueMetrics
		err := rows.Scan(
			&m.ID, &m.Date, &m.MRRCents, &m.ARRCents, &m.TotalSubscribers,
			&m.ActiveSubscribers, &m.TrialingSubscribers, &m.ChurnedSubscribers,
			&m.NewSubscribers, &m.ARPUCents, &m.MonthlyPlanCount,
			&m.YearlyPlanCount, &m.FreePlanCount, &m.CreatedAt, &m.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		metrics = append(metrics, &m)
	}

	return metrics, rows.Err()
}

// GetLatestMetrics retrieves the most recent revenue metrics
func (r *RevenueRepository) GetLatestMetrics(ctx context.Context) (*models.RevenueMetrics, error) {
	query := `
		SELECT id, date, mrr_cents, arr_cents, total_subscribers, active_subscribers,
		       trialing_subscribers, churned_subscribers, new_subscribers, arpu_cents,
		       monthly_plan_count, yearly_plan_count, free_plan_count, created_at, updated_at
		FROM revenue_metrics
		ORDER BY date DESC
		LIMIT 1
	`

	var m models.RevenueMetrics
	err := r.db.QueryRow(ctx, query).Scan(
		&m.ID, &m.Date, &m.MRRCents, &m.ARRCents, &m.TotalSubscribers,
		&m.ActiveSubscribers, &m.TrialingSubscribers, &m.ChurnedSubscribers,
		&m.NewSubscribers, &m.ARPUCents, &m.MonthlyPlanCount,
		&m.YearlyPlanCount, &m.FreePlanCount, &m.CreatedAt, &m.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &m, nil
}

// GetMetricsByDate retrieves revenue metrics for a specific date
func (r *RevenueRepository) GetMetricsByDate(ctx context.Context, date time.Time) (*models.RevenueMetrics, error) {
	query := `
		SELECT id, date, mrr_cents, arr_cents, total_subscribers, active_subscribers,
		       trialing_subscribers, churned_subscribers, new_subscribers, arpu_cents,
		       monthly_plan_count, yearly_plan_count, free_plan_count, created_at, updated_at
		FROM revenue_metrics
		WHERE date = $1
	`

	var m models.RevenueMetrics
	err := r.db.QueryRow(ctx, query, date).Scan(
		&m.ID, &m.Date, &m.MRRCents, &m.ARRCents, &m.TotalSubscribers,
		&m.ActiveSubscribers, &m.TrialingSubscribers, &m.ChurnedSubscribers,
		&m.NewSubscribers, &m.ARPUCents, &m.MonthlyPlanCount,
		&m.YearlyPlanCount, &m.FreePlanCount, &m.CreatedAt, &m.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &m, nil
}

// UpsertCohortRetention inserts or updates cohort retention data
func (r *RevenueRepository) UpsertCohortRetention(ctx context.Context, cohort *models.CohortRetention) error {
	query := `
		INSERT INTO cohort_retention (
			cohort_month, months_since_join, initial_subscribers,
			retained_subscribers, retention_rate
		) VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (cohort_month, months_since_join) DO UPDATE SET
			initial_subscribers = EXCLUDED.initial_subscribers,
			retained_subscribers = EXCLUDED.retained_subscribers,
			retention_rate = EXCLUDED.retention_rate
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query,
		cohort.CohortMonth, cohort.MonthsSinceJoin, cohort.InitialSubscribers,
		cohort.RetainedSubscribers, cohort.RetentionRate,
	).Scan(&cohort.ID, &cohort.CreatedAt, &cohort.UpdatedAt)

	return err
}

// GetCohortRetention retrieves cohort retention data for the last N months
func (r *RevenueRepository) GetCohortRetention(ctx context.Context, numMonths int) ([]*models.CohortRetention, error) {
	query := `
		SELECT id, cohort_month, months_since_join, initial_subscribers,
		       retained_subscribers, retention_rate, created_at, updated_at
		FROM cohort_retention
		WHERE cohort_month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * $1)
		ORDER BY cohort_month ASC, months_since_join ASC
	`

	rows, err := r.db.Query(ctx, query, numMonths)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cohorts []*models.CohortRetention
	for rows.Next() {
		var c models.CohortRetention
		err := rows.Scan(
			&c.ID, &c.CohortMonth, &c.MonthsSinceJoin, &c.InitialSubscribers,
			&c.RetainedSubscribers, &c.RetentionRate, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		cohorts = append(cohorts, &c)
	}

	return cohorts, rows.Err()
}

// GetSubscriptionCountsByPriceID returns subscription counts by price ID
func (r *RevenueRepository) GetSubscriptionCountsByPriceID(ctx context.Context, monthlyPriceID, yearlyPriceID string) (monthly, yearly int, err error) {
	query := `
		SELECT
			COUNT(*) FILTER (WHERE stripe_price_id = $1 AND (status = 'active' OR status = 'trialing')) AS monthly_count,
			COUNT(*) FILTER (WHERE stripe_price_id = $2 AND (status = 'active' OR status = 'trialing')) AS yearly_count
		FROM subscriptions
	`

	err = r.db.QueryRow(ctx, query, monthlyPriceID, yearlyPriceID).Scan(&monthly, &yearly)
	return
}

// GetChurnedSubscribersCount returns the count of subscribers who churned in a date range
func (r *RevenueRepository) GetChurnedSubscribersCount(ctx context.Context, startDate, endDate time.Time) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM subscriptions
		WHERE status = 'canceled'
		AND canceled_at >= $1 AND canceled_at < $2
	`

	var count int
	err := r.db.QueryRow(ctx, query, startDate, endDate).Scan(&count)
	return count, err
}

// GetNewSubscribersCount returns the count of new subscribers in a date range
func (r *RevenueRepository) GetNewSubscribersCount(ctx context.Context, startDate, endDate time.Time) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM subscriptions
		WHERE tier = 'pro'
		AND created_at >= $1 AND created_at < $2
	`

	var count int
	err := r.db.QueryRow(ctx, query, startDate, endDate).Scan(&count)
	return count, err
}

// GetCohortSubscribers returns subscribers grouped by their subscription start month
func (r *RevenueRepository) GetCohortSubscribers(ctx context.Context, cohortMonth time.Time) (initialCount int, currentActiveCount int, err error) {
	// Get initial count - subscribers who joined in this cohort month
	initialQuery := `
		SELECT COUNT(*)
		FROM subscriptions
		WHERE tier = 'pro'
		AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::timestamp)
	`

	if err = r.db.QueryRow(ctx, initialQuery, cohortMonth).Scan(&initialCount); err != nil {
		return
	}

	// Get current active count - subscribers from this cohort who are still active
	activeQuery := `
		SELECT COUNT(*)
		FROM subscriptions
		WHERE tier = 'pro'
		AND (status = 'active' OR status = 'trialing')
		AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::timestamp)
	`

	err = r.db.QueryRow(ctx, activeQuery, cohortMonth).Scan(&currentActiveCount)
	return
}

// GetTotalSubscriberCount returns total count of subscribers by tier
func (r *RevenueRepository) GetTotalSubscriberCount(ctx context.Context) (total, active, trialing, free int, err error) {
	query := `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status = 'active' AND tier = 'pro') AS active,
			COUNT(*) FILTER (WHERE status = 'trialing' AND tier = 'pro') AS trialing,
			COUNT(*) FILTER (WHERE tier = 'free' OR status IN ('inactive', 'canceled', 'unpaid')) AS free
		FROM subscriptions
	`

	err = r.db.QueryRow(ctx, query).Scan(&total, &active, &trialing, &free)
	return
}

// GetUserCountWithoutSubscription returns count of users without subscription records
func (r *RevenueRepository) GetUserCountWithoutSubscription(ctx context.Context) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM users u
		LEFT JOIN subscriptions s ON u.id = s.user_id
		WHERE s.id IS NULL
	`

	var count int
	err := r.db.QueryRow(ctx, query).Scan(&count)
	return count, err
}

// DeleteMetricsByID deletes revenue metrics by ID
func (r *RevenueRepository) DeleteMetricsByID(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM revenue_metrics WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
