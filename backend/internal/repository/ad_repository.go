package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/utils"
)

// AdRepository handles database operations for ads
type AdRepository struct {
	pool *pgxpool.Pool
}

// NewAdRepository creates a new AdRepository
func NewAdRepository(pool *pgxpool.Pool) *AdRepository {
	return &AdRepository{
		pool: pool,
	}
}

// GetActiveAds retrieves all active ads that are within their date range and budget
func (r *AdRepository) GetActiveAds(ctx context.Context, adType *string, width, height *int) ([]models.Ad, error) {
	whereClauses := []string{
		"is_active = true",
		"(start_date IS NULL OR start_date <= NOW())",
		"(end_date IS NULL OR end_date > NOW())",
		"(daily_budget_cents IS NULL OR spent_today_cents < daily_budget_cents)",
		"(total_budget_cents IS NULL OR spent_total_cents < total_budget_cents)",
	}
	args := []interface{}{}
	argIndex := 1

	if adType != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("ad_type = %s", utils.SQLPlaceholder(argIndex)))
		args = append(args, *adType)
		argIndex++
	}

	if width != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("(width IS NULL OR width = %s)", utils.SQLPlaceholder(argIndex)))
		args = append(args, *width)
		argIndex++
	}

	if height != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("(height IS NULL OR height = %s)", utils.SQLPlaceholder(argIndex)))
		args = append(args, *height)
		argIndex++
	}

	whereClause := whereClauses[0]
	for i := 1; i < len(whereClauses); i++ {
		whereClause += " AND " + whereClauses[i]
	}

	query := fmt.Sprintf(`
		SELECT id, name, advertiser_name, ad_type, content_url, click_url, alt_text,
			width, height, priority, weight, daily_budget_cents, total_budget_cents,
			spent_today_cents, spent_total_cents, cpm_cents, is_active, start_date,
			end_date, targeting_criteria, created_at, updated_at
		FROM ads
		WHERE %s
		ORDER BY priority DESC, weight DESC
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get active ads: %w", err)
	}
	defer rows.Close()

	var ads []models.Ad
	for rows.Next() {
		var ad models.Ad
		var targetingJSON []byte
		err := rows.Scan(
			&ad.ID, &ad.Name, &ad.AdvertiserName, &ad.AdType, &ad.ContentURL, &ad.ClickURL,
			&ad.AltText, &ad.Width, &ad.Height, &ad.Priority, &ad.Weight, &ad.DailyBudgetCents,
			&ad.TotalBudgetCents, &ad.SpentTodayCents, &ad.SpentTotalCents, &ad.CPMCents,
			&ad.IsActive, &ad.StartDate, &ad.EndDate, &targetingJSON, &ad.CreatedAt, &ad.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan ad: %w", err)
		}

		if targetingJSON != nil {
			if err := json.Unmarshal(targetingJSON, &ad.TargetingCriteria); err != nil {
				// Log warning but continue - targeting will be empty
				ad.TargetingCriteria = nil
			}
		}
		ads = append(ads, ad)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating ads: %w", err)
	}

	return ads, nil
}

// GetAdByID retrieves an ad by ID
func (r *AdRepository) GetAdByID(ctx context.Context, id uuid.UUID) (*models.Ad, error) {
	query := `
		SELECT id, name, advertiser_name, ad_type, content_url, click_url, alt_text,
			width, height, priority, weight, daily_budget_cents, total_budget_cents,
			spent_today_cents, spent_total_cents, cpm_cents, is_active, start_date,
			end_date, targeting_criteria, created_at, updated_at
		FROM ads
		WHERE id = $1
	`

	var ad models.Ad
	var targetingJSON []byte
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&ad.ID, &ad.Name, &ad.AdvertiserName, &ad.AdType, &ad.ContentURL, &ad.ClickURL,
		&ad.AltText, &ad.Width, &ad.Height, &ad.Priority, &ad.Weight, &ad.DailyBudgetCents,
		&ad.TotalBudgetCents, &ad.SpentTodayCents, &ad.SpentTotalCents, &ad.CPMCents,
		&ad.IsActive, &ad.StartDate, &ad.EndDate, &targetingJSON, &ad.CreatedAt, &ad.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get ad by ID: %w", err)
	}

	if targetingJSON != nil {
		if err := json.Unmarshal(targetingJSON, &ad.TargetingCriteria); err != nil {
			// Log warning but continue - targeting will be empty
			ad.TargetingCriteria = nil
		}
	}

	return &ad, nil
}

// CreateImpression creates a new ad impression record
func (r *AdRepository) CreateImpression(ctx context.Context, impression *models.AdImpression) error {
	query := `
		INSERT INTO ad_impressions (id, ad_id, user_id, session_id, platform, ip_address,
			user_agent, page_url, viewability_time_ms, is_viewable, is_clicked, cost_cents)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err := r.pool.Exec(ctx, query,
		impression.ID, impression.AdID, impression.UserID, impression.SessionID,
		impression.Platform, impression.IPAddress, impression.UserAgent, impression.PageURL,
		impression.ViewabilityTimeMs, impression.IsViewable, impression.IsClicked, impression.CostCents,
	)
	if err != nil {
		return fmt.Errorf("failed to create impression: %w", err)
	}

	return nil
}

// UpdateImpression updates an existing impression with viewability/click data
func (r *AdRepository) UpdateImpression(ctx context.Context, impressionID uuid.UUID, viewabilityTimeMs int, isViewable, isClicked bool) error {
	query := `
		UPDATE ad_impressions
		SET viewability_time_ms = $2, is_viewable = $3, is_clicked = $4,
			clicked_at = CASE WHEN $4 = true AND clicked_at IS NULL THEN NOW() ELSE clicked_at END
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query, impressionID, viewabilityTimeMs, isViewable, isClicked)
	if err != nil {
		return fmt.Errorf("failed to update impression: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("impression not found")
	}

	return nil
}

// GetImpressionByID retrieves an impression by ID
func (r *AdRepository) GetImpressionByID(ctx context.Context, id uuid.UUID) (*models.AdImpression, error) {
	query := `
		SELECT id, ad_id, user_id, session_id, platform, ip_address, user_agent, page_url,
			viewability_time_ms, is_viewable, is_clicked, clicked_at, cost_cents, created_at
		FROM ad_impressions
		WHERE id = $1
	`

	var imp models.AdImpression
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&imp.ID, &imp.AdID, &imp.UserID, &imp.SessionID, &imp.Platform, &imp.IPAddress,
		&imp.UserAgent, &imp.PageURL, &imp.ViewabilityTimeMs, &imp.IsViewable, &imp.IsClicked,
		&imp.ClickedAt, &imp.CostCents, &imp.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get impression: %w", err)
	}

	return &imp, nil
}

// IncrementAdSpend increments the spend counters for an ad
func (r *AdRepository) IncrementAdSpend(ctx context.Context, adID uuid.UUID, costCents int) error {
	query := `
		UPDATE ads
		SET spent_today_cents = spent_today_cents + $2,
			spent_total_cents = spent_total_cents + $2
		WHERE id = $1
	`

	_, err := r.pool.Exec(ctx, query, adID, costCents)
	if err != nil {
		return fmt.Errorf("failed to increment ad spend: %w", err)
	}

	return nil
}

// ResetDailySpend resets the daily spend for all ads (should be called at midnight)
func (r *AdRepository) ResetDailySpend(ctx context.Context) error {
	query := `UPDATE ads SET spent_today_cents = 0`

	_, err := r.pool.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to reset daily spend: %w", err)
	}

	return nil
}

// GetFrequencyCap gets the current frequency cap for a user/session and ad
func (r *AdRepository) GetFrequencyCap(ctx context.Context, adID uuid.UUID, userID *uuid.UUID, sessionID *string, windowType string) (*models.AdFrequencyCap, error) {
	var query string
	var args []interface{}

	if userID != nil {
		query = `
			SELECT id, ad_id, user_id, session_id, impression_count, window_start, window_type, created_at, updated_at
			FROM ad_frequency_caps
			WHERE ad_id = $1 AND user_id = $2 AND window_type = $3
		`
		args = []interface{}{adID, *userID, windowType}
	} else if sessionID != nil {
		query = `
			SELECT id, ad_id, user_id, session_id, impression_count, window_start, window_type, created_at, updated_at
			FROM ad_frequency_caps
			WHERE ad_id = $1 AND session_id = $2 AND window_type = $3
		`
		args = []interface{}{adID, *sessionID, windowType}
	} else {
		return nil, fmt.Errorf("either userID or sessionID must be provided")
	}

	var cap models.AdFrequencyCap
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&cap.ID, &cap.AdID, &cap.UserID, &cap.SessionID, &cap.ImpressionCount,
		&cap.WindowStart, &cap.WindowType, &cap.CreatedAt, &cap.UpdatedAt,
	)
	if err != nil {
		return nil, err // Let caller handle "no rows" error
	}

	return &cap, nil
}

// UpsertFrequencyCap creates or updates a frequency cap record
func (r *AdRepository) UpsertFrequencyCap(ctx context.Context, adID uuid.UUID, userID *uuid.UUID, sessionID *string, windowType string, windowStart time.Time) error {
	var query string
	var args []interface{}

	if userID != nil {
		query = `
			INSERT INTO ad_frequency_caps (id, ad_id, user_id, window_type, window_start, impression_count)
			VALUES ($1, $2, $3, $4, $5, 1)
			ON CONFLICT (ad_id, user_id, window_type)
			DO UPDATE SET 
				impression_count = CASE 
					WHEN ad_frequency_caps.window_start < $5 THEN 1 
					ELSE ad_frequency_caps.impression_count + 1 
				END,
				window_start = CASE 
					WHEN ad_frequency_caps.window_start < $5 THEN $5 
					ELSE ad_frequency_caps.window_start 
				END,
				updated_at = NOW()
		`
		args = []interface{}{uuid.New(), adID, *userID, windowType, windowStart}
	} else if sessionID != nil {
		query = `
			INSERT INTO ad_frequency_caps (id, ad_id, session_id, window_type, window_start, impression_count)
			VALUES ($1, $2, $3, $4, $5, 1)
			ON CONFLICT (ad_id, session_id, window_type)
			DO UPDATE SET 
				impression_count = CASE 
					WHEN ad_frequency_caps.window_start < $5 THEN 1 
					ELSE ad_frequency_caps.impression_count + 1 
				END,
				window_start = CASE 
					WHEN ad_frequency_caps.window_start < $5 THEN $5 
					ELSE ad_frequency_caps.window_start 
				END,
				updated_at = NOW()
		`
		args = []interface{}{uuid.New(), adID, *sessionID, windowType, windowStart}
	} else {
		return fmt.Errorf("either userID or sessionID must be provided")
	}

	_, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to upsert frequency cap: %w", err)
	}

	return nil
}

// GetFrequencyLimits gets all frequency limits for an ad
func (r *AdRepository) GetFrequencyLimits(ctx context.Context, adID uuid.UUID) ([]models.AdFrequencyLimit, error) {
	query := `
		SELECT id, ad_id, window_type, max_impressions, created_at
		FROM ad_frequency_limits
		WHERE ad_id = $1
	`

	rows, err := r.pool.Query(ctx, query, adID)
	if err != nil {
		return nil, fmt.Errorf("failed to get frequency limits: %w", err)
	}
	defer rows.Close()

	var limits []models.AdFrequencyLimit
	for rows.Next() {
		var limit models.AdFrequencyLimit
		err := rows.Scan(&limit.ID, &limit.AdID, &limit.WindowType, &limit.MaxImpressions, &limit.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan frequency limit: %w", err)
		}
		limits = append(limits, limit)
	}

	return limits, nil
}

// GetUserImpressionCount gets the count of impressions for a user/session within a time window
func (r *AdRepository) GetUserImpressionCount(ctx context.Context, adID uuid.UUID, userID *uuid.UUID, sessionID *string, windowType string) (int, error) {
	windowStart := r.calculateWindowStart(windowType)

	var query string
	var args []interface{}

	if userID != nil {
		query = `
			SELECT COALESCE(impression_count, 0)
			FROM ad_frequency_caps
			WHERE ad_id = $1 AND user_id = $2 AND window_type = $3 AND window_start >= $4
		`
		args = []interface{}{adID, *userID, windowType, windowStart}
	} else if sessionID != nil {
		query = `
			SELECT COALESCE(impression_count, 0)
			FROM ad_frequency_caps
			WHERE ad_id = $1 AND session_id = $2 AND window_type = $3 AND window_start >= $4
		`
		args = []interface{}{adID, *sessionID, windowType, windowStart}
	} else {
		return 0, nil // No tracking for completely anonymous
	}

	var count int
	err := r.pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		// No rows is not an error - return 0
		return 0, nil
	}

	return count, nil
}

// calculateWindowStart returns the start time for a given window type
func (r *AdRepository) calculateWindowStart(windowType string) time.Time {
	now := time.Now().UTC()
	switch windowType {
	case models.FrequencyWindowHourly:
		return now.Truncate(time.Hour)
	case models.FrequencyWindowDaily:
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	case models.FrequencyWindowWeekly:
		// Start of the week (Sunday)
		daysSinceSunday := int(now.Weekday())
		return time.Date(now.Year(), now.Month(), now.Day()-daysSinceSunday, 0, 0, 0, 0, time.UTC)
	case models.FrequencyWindowLifetime:
		// Return epoch for lifetime
		return time.Time{}
	default:
		return now.Truncate(time.Hour)
	}
}

// CountRecentImpressions counts impressions from a specific IP in the last minute (fraud prevention)
func (r *AdRepository) CountRecentImpressions(ctx context.Context, adID uuid.UUID, ipAddress string, minutes int) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM ad_impressions
		WHERE ad_id = $1 AND ip_address = $2 AND created_at > NOW() - INTERVAL '1 minute' * $3
	`

	var count int
	err := r.pool.QueryRow(ctx, query, adID, ipAddress, minutes).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count recent impressions: %w", err)
	}

	return count, nil
}

// CountViewableImpressions counts viewable impressions for an ad
func (r *AdRepository) CountViewableImpressions(ctx context.Context, adID uuid.UUID, since time.Time) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM ad_impressions
		WHERE ad_id = $1 AND is_viewable = true AND created_at >= $2
	`

	var count int
	err := r.pool.QueryRow(ctx, query, adID, since).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count viewable impressions: %w", err)
	}

	return count, nil
}
