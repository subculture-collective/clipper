package services

import (
	"context"
	"log"
	"time"

	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// Pricing constants in cents
const (
	// ProMonthlyPriceCents is the monthly Pro plan price in cents ($9.99)
	ProMonthlyPriceCents = 999
	// ProYearlyMonthlyEquivalentCents is the yearly Pro plan's monthly equivalent in cents ($99.99/12 ≈ $8.33)
	ProYearlyMonthlyEquivalentCents = 833
)

// RevenueService handles revenue analytics business logic
type RevenueService struct {
	revenueRepo      *repository.RevenueRepository
	subscriptionRepo *repository.SubscriptionRepository
	cfg              *config.Config
}

// NewRevenueService creates a new revenue service
func NewRevenueService(
	revenueRepo *repository.RevenueRepository,
	subscriptionRepo *repository.SubscriptionRepository,
	cfg *config.Config,
) *RevenueService {
	return &RevenueService{
		revenueRepo:      revenueRepo,
		subscriptionRepo: subscriptionRepo,
		cfg:              cfg,
	}
}

// GetRevenueOverview returns current revenue metrics overview
func (s *RevenueService) GetRevenueOverview(ctx context.Context) (*models.RevenueOverview, error) {
	// Get latest metrics from cache (revenue_metrics table)
	metrics, err := s.revenueRepo.GetLatestMetrics(ctx)
	if err != nil {
		// If no cached metrics, calculate from subscriptions
		return s.calculateCurrentMetrics(ctx)
	}

	// Calculate monthly churn and growth rates from last 30 days of data
	endDate := time.Now().UTC().Truncate(24 * time.Hour)
	startDate := endDate.AddDate(0, -1, 0) // 30 days ago

	historicalMetrics, err := s.revenueRepo.GetMetricsByDateRange(ctx, startDate, endDate)
	if err != nil {
		log.Printf("[REVENUE] Error fetching historical metrics: %v", err)
	}

	churnRate := 0.0
	growthRate := 0.0
	if len(historicalMetrics) >= 2 {
		first := historicalMetrics[0]
		last := historicalMetrics[len(historicalMetrics)-1]

		// Calculate churn rate
		if first.ActiveSubscribers > 0 {
			totalChurned := 0
			for _, m := range historicalMetrics {
				totalChurned += m.ChurnedSubscribers
			}
			churnRate = float64(totalChurned) / float64(first.ActiveSubscribers) * 100
		}

		// Calculate growth rate
		if first.ActiveSubscribers > 0 {
			growthRate = float64(last.ActiveSubscribers-first.ActiveSubscribers) / float64(first.ActiveSubscribers) * 100
		}
	}

	return &models.RevenueOverview{
		CurrentMRR:        float64(metrics.MRRCents) / 100.0,
		CurrentARR:        float64(metrics.ARRCents) / 100.0,
		ARPU:              float64(metrics.ARPUCents) / 100.0,
		TotalSubscribers:  metrics.TotalSubscribers,
		ActiveSubscribers: metrics.ActiveSubscribers,
		MonthlyChurnRate:  churnRate,
		MonthlyGrowthRate: growthRate,
	}, nil
}

// calculateCurrentMetrics calculates metrics directly from subscriptions table
func (s *RevenueService) calculateCurrentMetrics(ctx context.Context) (*models.RevenueOverview, error) {
	total, active, trialing, free, err := s.revenueRepo.GetTotalSubscriberCount(ctx)
	if err != nil {
		return nil, err
	}

	// Get subscription counts by price ID
	monthlyCount, yearlyCount, err := s.revenueRepo.GetSubscriptionCountsByPriceID(
		ctx,
		s.cfg.Stripe.ProMonthlyPriceID,
		s.cfg.Stripe.ProYearlyPriceID,
	)
	if err != nil {
		log.Printf("[REVENUE] Error getting subscription counts by price ID: %v", err)
		monthlyCount = 0
		yearlyCount = 0
	}

	// Calculate MRR based on plan prices
	mrrCents := int64(monthlyCount)*ProMonthlyPriceCents + int64(yearlyCount)*ProYearlyMonthlyEquivalentCents

	// Calculate ARPU
	totalPaid := active + trialing
	arpuCents := int64(0)
	if totalPaid > 0 {
		arpuCents = mrrCents / int64(totalPaid)
	}

	// Users without subscriptions are "free"
	usersWithoutSub, err := s.revenueRepo.GetUserCountWithoutSubscription(ctx)
	if err != nil {
		log.Printf("[REVENUE] Error getting users without subscription: %v", err)
	}
	freeTotal := free + usersWithoutSub

	return &models.RevenueOverview{
		CurrentMRR:        float64(mrrCents) / 100.0,
		CurrentARR:        float64(mrrCents*12) / 100.0,
		ARPU:              float64(arpuCents) / 100.0,
		TotalSubscribers:  total + freeTotal,
		ActiveSubscribers: active + trialing,
		MonthlyChurnRate:  0, // Cannot calculate without historical data
		MonthlyGrowthRate: 0,
	}, nil
}

// GetPlanDistribution returns the distribution of subscribers across plans
func (s *RevenueService) GetPlanDistribution(ctx context.Context) (*models.PlanDistribution, error) {
	// Get subscription counts by price ID
	monthlyCount, yearlyCount, err := s.revenueRepo.GetSubscriptionCountsByPriceID(
		ctx,
		s.cfg.Stripe.ProMonthlyPriceID,
		s.cfg.Stripe.ProYearlyPriceID,
	)
	if err != nil {
		return nil, err
	}

	// Get free count
	_, _, _, freeCount, err := s.revenueRepo.GetTotalSubscriberCount(ctx)
	if err != nil {
		return nil, err
	}

	// Add users without subscription records
	usersWithoutSub, err := s.revenueRepo.GetUserCountWithoutSubscription(ctx)
	if err != nil {
		log.Printf("[REVENUE] Error getting users without subscription: %v", err)
	}
	freeCount += usersWithoutSub

	total := monthlyCount + yearlyCount + freeCount
	if total == 0 {
		return &models.PlanDistribution{}, nil
	}

	return &models.PlanDistribution{
		MonthlyCount: monthlyCount,
		YearlyCount:  yearlyCount,
		FreeCount:    freeCount,
		MonthlyPct:   float64(monthlyCount) / float64(total) * 100,
		YearlyPct:    float64(yearlyCount) / float64(total) * 100,
		FreePct:      float64(freeCount) / float64(total) * 100,
	}, nil
}

// GetMRRTrend returns MRR trend data for the specified number of days
func (s *RevenueService) GetMRRTrend(ctx context.Context, days int) ([]models.RevenueTrendDataPoint, error) {
	endDate := time.Now().UTC().Truncate(24 * time.Hour)
	startDate := endDate.AddDate(0, 0, -days)

	metrics, err := s.revenueRepo.GetMetricsByDateRange(ctx, startDate, endDate)
	if err != nil {
		return nil, err
	}

	trend := make([]models.RevenueTrendDataPoint, len(metrics))
	for i, m := range metrics {
		trend[i] = models.RevenueTrendDataPoint{
			Date:  m.Date,
			Value: float64(m.MRRCents) / 100.0,
		}
	}

	return trend, nil
}

// GetSubscriberTrend returns subscriber count trend data for the specified number of days
func (s *RevenueService) GetSubscriberTrend(ctx context.Context, days int) ([]models.RevenueTrendDataPoint, error) {
	endDate := time.Now().UTC().Truncate(24 * time.Hour)
	startDate := endDate.AddDate(0, 0, -days)

	metrics, err := s.revenueRepo.GetMetricsByDateRange(ctx, startDate, endDate)
	if err != nil {
		return nil, err
	}

	trend := make([]models.RevenueTrendDataPoint, len(metrics))
	for i, m := range metrics {
		trend[i] = models.RevenueTrendDataPoint{
			Date:  m.Date,
			Value: float64(m.ActiveSubscribers),
		}
	}

	return trend, nil
}

// GetChurnTrend returns churn trend data for the specified number of days
func (s *RevenueService) GetChurnTrend(ctx context.Context, days int) ([]models.RevenueTrendDataPoint, error) {
	endDate := time.Now().UTC().Truncate(24 * time.Hour)
	startDate := endDate.AddDate(0, 0, -days)

	metrics, err := s.revenueRepo.GetMetricsByDateRange(ctx, startDate, endDate)
	if err != nil {
		return nil, err
	}

	trend := make([]models.RevenueTrendDataPoint, len(metrics))
	for i, m := range metrics {
		trend[i] = models.RevenueTrendDataPoint{
			Date:  m.Date,
			Value: float64(m.ChurnedSubscribers),
		}
	}

	return trend, nil
}

// GetCohortRetention returns cohort retention matrix for the last numMonths
func (s *RevenueService) GetCohortRetention(ctx context.Context, numMonths int) ([]models.CohortRetentionRow, error) {
	cohorts, err := s.revenueRepo.GetCohortRetention(ctx, numMonths)
	if err != nil {
		return nil, err
	}

	// Group by cohort month
	cohortMap := make(map[string]*models.CohortRetentionRow)
	for _, c := range cohorts {
		monthStr := c.CohortMonth.Format("2006-01")
		if row, exists := cohortMap[monthStr]; exists {
			// Ensure we have enough slots for the retention rate
			for len(row.RetentionRates) <= c.MonthsSinceJoin {
				row.RetentionRates = append(row.RetentionRates, 0)
			}
			row.RetentionRates[c.MonthsSinceJoin] = c.RetentionRate * 100 // Convert to percentage
		} else {
			rates := make([]float64, c.MonthsSinceJoin+1)
			rates[c.MonthsSinceJoin] = c.RetentionRate * 100
			cohortMap[monthStr] = &models.CohortRetentionRow{
				CohortMonth:    monthStr,
				InitialCount:   c.InitialSubscribers,
				RetentionRates: rates,
			}
		}
	}

	// Convert map to sorted slice
	result := make([]models.CohortRetentionRow, 0, len(cohortMap))
	for _, row := range cohortMap {
		result = append(result, *row)
	}

	return result, nil
}

// SyncDailyMetrics calculates and stores daily revenue metrics (backfill job)
func (s *RevenueService) SyncDailyMetrics(ctx context.Context) error {
	log.Println("[REVENUE] Starting daily metrics sync...")

	today := time.Now().UTC().Truncate(24 * time.Hour)
	yesterday := today.AddDate(0, 0, -1)

	// Get current subscription counts
	total, active, trialing, free, err := s.revenueRepo.GetTotalSubscriberCount(ctx)
	if err != nil {
		return err
	}

	// Get subscription counts by price ID
	monthlyCount, yearlyCount, err := s.revenueRepo.GetSubscriptionCountsByPriceID(
		ctx,
		s.cfg.Stripe.ProMonthlyPriceID,
		s.cfg.Stripe.ProYearlyPriceID,
	)
	if err != nil {
		log.Printf("[REVENUE] Warning: Could not get subscription counts by price ID: %v", err)
	}

	// Get churned and new subscribers for today
	churned, err := s.revenueRepo.GetChurnedSubscribersCount(ctx, yesterday, today)
	if err != nil {
		log.Printf("[REVENUE] Warning: Could not get churned count: %v", err)
	}

	newSubs, err := s.revenueRepo.GetNewSubscribersCount(ctx, yesterday, today)
	if err != nil {
		log.Printf("[REVENUE] Warning: Could not get new subscriber count: %v", err)
	}

	// Calculate MRR based on plan prices
	mrrCents := int64(monthlyCount)*ProMonthlyPriceCents + int64(yearlyCount)*ProYearlyMonthlyEquivalentCents
	arrCents := mrrCents * 12

	// Calculate ARPU
	totalPaid := active + trialing
	arpuCents := int64(0)
	if totalPaid > 0 {
		arpuCents = mrrCents / int64(totalPaid)
	}

	// Get users without subscription (free users)
	usersWithoutSub, err := s.revenueRepo.GetUserCountWithoutSubscription(ctx)
	if err != nil {
		log.Printf("[REVENUE] Warning: Could not get users without subscription: %v", err)
	}

	metrics := &models.RevenueMetrics{
		Date:                today,
		MRRCents:            mrrCents,
		ARRCents:            arrCents,
		TotalSubscribers:    total + usersWithoutSub,
		ActiveSubscribers:   active + trialing,
		TrialingSubscribers: trialing,
		ChurnedSubscribers:  churned,
		NewSubscribers:      newSubs,
		ARPUCents:           arpuCents,
		MonthlyPlanCount:    monthlyCount,
		YearlyPlanCount:     yearlyCount,
		FreePlanCount:       free + usersWithoutSub,
	}

	if err := s.revenueRepo.UpsertDailyMetrics(ctx, metrics); err != nil {
		return err
	}

	log.Printf("[REVENUE] Daily metrics synced: MRR=$%.2f, Active=%d, New=%d, Churned=%d",
		float64(mrrCents)/100.0, active+trialing, newSubs, churned)

	return nil
}

// SyncCohortRetention calculates and stores cohort retention data
func (s *RevenueService) SyncCohortRetention(ctx context.Context, numMonths int) error {
	log.Printf("[REVENUE] Starting cohort retention sync for %d months...", numMonths)

	now := time.Now().UTC()

	for i := 0; i < numMonths; i++ {
		// Use AddDate to correctly handle month boundaries (e.g., January - 2 months = November of previous year)
		cohortDate := now.AddDate(0, -i, 0)
		cohortMonth := time.Date(cohortDate.Year(), cohortDate.Month(), 1, 0, 0, 0, 0, time.UTC)

		initialCount, currentActiveCount, err := s.revenueRepo.GetCohortSubscribers(ctx, cohortMonth)
		if err != nil {
			log.Printf("[REVENUE] Error getting cohort subscribers for %s: %v", cohortMonth.Format("2006-01"), err)
			continue
		}

		if initialCount == 0 {
			continue
		}

		// Calculate months since join for this cohort
		monthsSinceJoin := i

		retentionRate := float64(currentActiveCount) / float64(initialCount)

		cohort := &models.CohortRetention{
			CohortMonth:         cohortMonth,
			MonthsSinceJoin:     monthsSinceJoin,
			InitialSubscribers:  initialCount,
			RetainedSubscribers: currentActiveCount,
			RetentionRate:       retentionRate,
		}

		if err := s.revenueRepo.UpsertCohortRetention(ctx, cohort); err != nil {
			log.Printf("[REVENUE] Error upserting cohort retention for %s: %v", cohortMonth.Format("2006-01"), err)
		}
	}

	log.Println("[REVENUE] Cohort retention sync completed")
	return nil
}

// BackfillMetrics fills in missing historical metrics for the specified number of days
func (s *RevenueService) BackfillMetrics(ctx context.Context, days int) error {
	log.Printf("[REVENUE] Starting metrics backfill for %d days...", days)

	// For backfill, we just sync current day metrics since historical data
	// would require historical Stripe data which we don't have access to
	// In a real implementation, you'd use Stripe's API to fetch historical invoice data

	if err := s.SyncDailyMetrics(ctx); err != nil {
		return err
	}

	if err := s.SyncCohortRetention(ctx, 12); err != nil {
		return err
	}

	log.Println("[REVENUE] Backfill completed")
	return nil
}
