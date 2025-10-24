package services

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// AnalyticsService handles analytics business logic
type AnalyticsService struct {
	analyticsRepo *repository.AnalyticsRepository
	clipRepo      *repository.ClipRepository
}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService(analyticsRepo *repository.AnalyticsRepository, clipRepo *repository.ClipRepository) *AnalyticsService {
	return &AnalyticsService{
		analyticsRepo: analyticsRepo,
		clipRepo:      clipRepo,
	}
}

// TrackEvent records an analytics event
func (s *AnalyticsService) TrackEvent(ctx context.Context, eventType string, userID *uuid.UUID, clipID *uuid.UUID, metadata map[string]interface{}, ipAddress, userAgent, referrer string) error {
	// Anonymize IP address (remove last octet for privacy)
	anonymizedIP := anonymizeIP(ipAddress)
	
	// Convert metadata to JSON string
	var metadataJSON *string
	if metadata != nil {
		data, err := json.Marshal(metadata)
		if err != nil {
			return err
		}
		str := string(data)
		metadataJSON = &str
	}
	
	event := &models.AnalyticsEvent{
		EventType: eventType,
		UserID:    userID,
		ClipID:    clipID,
		Metadata:  metadataJSON,
		IPAddress: &anonymizedIP,
		UserAgent: &userAgent,
		Referrer:  &referrer,
	}
	
	return s.analyticsRepo.TrackEvent(ctx, event)
}

// GetCreatorAnalyticsOverview retrieves summary metrics for a creator
func (s *AnalyticsService) GetCreatorAnalyticsOverview(ctx context.Context, creatorName string) (*models.CreatorAnalyticsOverview, error) {
	analytics, err := s.analyticsRepo.GetCreatorAnalytics(ctx, creatorName)
	if err != nil {
		return nil, err
	}
	
	engagementRate := 0.0
	if analytics.AvgEngagementRate != nil {
		engagementRate = *analytics.AvgEngagementRate
	}
	
	return &models.CreatorAnalyticsOverview{
		TotalClips:        analytics.TotalClips,
		TotalViews:        analytics.TotalViews,
		TotalUpvotes:      analytics.TotalUpvotes,
		TotalComments:     analytics.TotalComments,
		AvgEngagementRate: engagementRate,
		FollowerCount:     analytics.FollowerCount,
	}, nil
}

// GetCreatorTopClips retrieves top-performing clips for a creator
func (s *AnalyticsService) GetCreatorTopClips(ctx context.Context, creatorName string, sortBy string, limit int) ([]models.CreatorTopClip, error) {
	if sortBy == "" {
		sortBy = "votes"
	}
	if limit <= 0 || limit > 100 {
		limit = 10
	}
	
	return s.analyticsRepo.GetCreatorTopClips(ctx, creatorName, sortBy, limit)
}

// GetCreatorTrends retrieves time-series data for creator metrics
func (s *AnalyticsService) GetCreatorTrends(ctx context.Context, creatorName string, metricType string, days int) ([]models.TrendDataPoint, error) {
	if days <= 0 || days > 365 {
		days = 30
	}
	
	return s.analyticsRepo.GetCreatorTrends(ctx, creatorName, metricType, days)
}

// GetClipAnalytics retrieves analytics for a specific clip
func (s *AnalyticsService) GetClipAnalytics(ctx context.Context, clipID uuid.UUID) (*models.ClipAnalytics, error) {
	return s.analyticsRepo.GetClipAnalytics(ctx, clipID)
}

// GetUserAnalytics retrieves personal statistics for a user
func (s *AnalyticsService) GetUserAnalytics(ctx context.Context, userID uuid.UUID) (*models.UserAnalytics, error) {
	return s.analyticsRepo.GetUserAnalytics(ctx, userID)
}

// GetPlatformOverview retrieves current platform KPIs for admin dashboard
func (s *AnalyticsService) GetPlatformOverview(ctx context.Context) (*models.PlatformOverviewMetrics, error) {
	return s.analyticsRepo.GetPlatformOverviewMetrics(ctx)
}

// GetContentMetrics retrieves content-related metrics for admin dashboard
func (s *AnalyticsService) GetContentMetrics(ctx context.Context) (*models.ContentMetrics, error) {
	// Get most popular games
	games, err := s.analyticsRepo.GetMostPopularGames(ctx, 10)
	if err != nil {
		return nil, err
	}
	
	// Get most popular creators
	creators, err := s.analyticsRepo.GetMostPopularCreators(ctx, 10)
	if err != nil {
		return nil, err
	}
	
	// Get trending tags (last 7 days)
	tags, err := s.analyticsRepo.GetTrendingTags(ctx, 7, 10)
	if err != nil {
		return nil, err
	}
	
	// Calculate average clip vote score
	avgVoteScore := 0.0
	// This could be enhanced with a specific query, but for now we'll keep it simple
	
	return &models.ContentMetrics{
		MostPopularGames:    games,
		MostPopularCreators: creators,
		TrendingTags:        tags,
		AvgClipVoteScore:    avgVoteScore,
	}, nil
}

// GetPlatformTrends retrieves time-series data for platform metrics
func (s *AnalyticsService) GetPlatformTrends(ctx context.Context, metricType string, days int) ([]models.TrendDataPoint, error) {
	if days <= 0 || days > 365 {
		days = 30
	}
	
	return s.analyticsRepo.GetPlatformTrends(ctx, metricType, days)
}

// anonymizeIP removes the last octet of an IP address for privacy
func anonymizeIP(ip string) string {
	if ip == "" {
		return ""
	}
	
	// Simple IPv4 anonymization - replace last octet with 0
	// For production, use a proper IP parsing library
	var result string
	lastDot := -1
	for i := len(ip) - 1; i >= 0; i-- {
		if ip[i] == '.' {
			lastDot = i
			break
		}
	}
	
	if lastDot > 0 {
		result = ip[:lastDot] + ".0"
	} else {
		// For IPv6 or invalid IPs, just truncate
		if len(ip) > 10 {
			result = ip[:10] + "..."
		} else {
			result = "anonymized"
		}
	}
	
	return result
}
