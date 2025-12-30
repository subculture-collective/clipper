package services

import (
	"context"
	"database/sql"
	"log"
	"time"

	"github.com/google/uuid"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

// AbuseIntegrationService integrates anomaly detection into core actions
type AbuseIntegrationService struct {
	db                  *sql.DB
	redisClient         *redispkg.Client
	featureExtractor    *AbuseFeatureExtractor
	anomalyScorer       *AnomalyScorer
	autoFlagger         *AbuseAutoFlagger
	moderationEventSvc  *ModerationEventService
}

// NewAbuseIntegrationService creates a new integration service
func NewAbuseIntegrationService(
	db *sql.DB,
	redisClient *redispkg.Client,
	moderationEventSvc *ModerationEventService,
) *AbuseIntegrationService {
	featureExtractor := NewAbuseFeatureExtractor(redisClient)
	anomalyScorer := NewAnomalyScorer(redisClient, featureExtractor, moderationEventSvc)
	autoFlagger := NewAbuseAutoFlagger(db, anomalyScorer, moderationEventSvc)
	
	return &AbuseIntegrationService{
		db:                 db,
		redisClient:        redisClient,
		featureExtractor:   featureExtractor,
		anomalyScorer:      anomalyScorer,
		autoFlagger:        autoFlagger,
		moderationEventSvc: moderationEventSvc,
	}
}

// CheckVoteAction performs anomaly detection on a vote action
func (s *AbuseIntegrationService) CheckVoteAction(
	ctx context.Context,
	userID uuid.UUID,
	clipID uuid.UUID,
	voteType int16,
	ip string,
	userAgent string,
) error {
	// Get user info for trust score and account age
	var trustScore int
	var accountCreatedAt time.Time
	
	query := `SELECT trust_score, created_at FROM users WHERE id = $1`
	if err := s.db.QueryRowContext(ctx, query, userID).Scan(&trustScore, &accountCreatedAt); err != nil {
		log.Printf("Warning: failed to get user info for anomaly detection: %v", err)
		// Continue with defaults
		trustScore = 50
		accountCreatedAt = time.Now().Add(-30 * 24 * time.Hour)
	}
	
	// Score the action
	score, err := s.anomalyScorer.ScoreVoteAction(ctx, userID, clipID, voteType, ip, userAgent, trustScore, accountCreatedAt)
	if err != nil {
		log.Printf("Error scoring vote action: %v", err)
		return nil // Don't block on scoring errors
	}
	
	// Log if anomaly detected
	if score.IsAnomaly {
		log.Printf("[ANOMALY] Vote by user %s on clip %s - score: %.2f, severity: %s, reasons: %v",
			userID, clipID, score.OverallScore, score.Severity, score.ReasonCodes)
	}
	
	// Auto-flag if needed
	if score.ShouldAutoFlag {
		voteID := uuid.New() // Generate a vote ID for reference
		if err := s.autoFlagger.AutoFlagVote(ctx, voteID, userID, clipID, score); err != nil {
			log.Printf("Error auto-flagging vote: %v", err)
		}
	}
	
	return nil
}

// CheckFollowAction performs anomaly detection on a follow action
func (s *AbuseIntegrationService) CheckFollowAction(
	ctx context.Context,
	followerID uuid.UUID,
	followingID uuid.UUID,
	ip string,
	userAgent string,
) error {
	// Get user info for trust score and account age
	var trustScore int
	var accountCreatedAt time.Time
	
	query := `SELECT trust_score, created_at FROM users WHERE id = $1`
	if err := s.db.QueryRowContext(ctx, query, followerID).Scan(&trustScore, &accountCreatedAt); err != nil {
		log.Printf("Warning: failed to get user info for anomaly detection: %v", err)
		trustScore = 50
		accountCreatedAt = time.Now().Add(-30 * 24 * time.Hour)
	}
	
	// Score the action
	score, err := s.anomalyScorer.ScoreFollowAction(ctx, followerID, followingID, ip, userAgent, trustScore, accountCreatedAt)
	if err != nil {
		log.Printf("Error scoring follow action: %v", err)
		return nil // Don't block on scoring errors
	}
	
	// Log if anomaly detected
	if score.IsAnomaly {
		log.Printf("[ANOMALY] Follow by user %s of user %s - score: %.2f, severity: %s, reasons: %v",
			followerID, followingID, score.OverallScore, score.Severity, score.ReasonCodes)
	}
	
	// Auto-flag if needed
	if score.ShouldAutoFlag {
		if err := s.autoFlagger.AutoFlagFollow(ctx, followerID, followingID, score); err != nil {
			log.Printf("Error auto-flagging follow: %v", err)
		}
	}
	
	return nil
}

// CheckSubmissionAction performs anomaly detection on a submission action
func (s *AbuseIntegrationService) CheckSubmissionAction(
	ctx context.Context,
	userID uuid.UUID,
	submissionID uuid.UUID,
	ip string,
	userAgent string,
) error {
	// Get user info for trust score and account age
	var trustScore int
	var accountCreatedAt time.Time
	
	query := `SELECT trust_score, created_at FROM users WHERE id = $1`
	if err := s.db.QueryRowContext(ctx, query, userID).Scan(&trustScore, &accountCreatedAt); err != nil {
		log.Printf("Warning: failed to get user info for anomaly detection: %v", err)
		trustScore = 50
		accountCreatedAt = time.Now().Add(-30 * 24 * time.Hour)
	}
	
	// Score the action
	score, err := s.anomalyScorer.ScoreSubmissionAction(ctx, userID, ip, userAgent, trustScore, accountCreatedAt)
	if err != nil {
		log.Printf("Error scoring submission action: %v", err)
		return nil // Don't block on scoring errors
	}
	
	// Log if anomaly detected
	if score.IsAnomaly {
		log.Printf("[ANOMALY] Submission by user %s - score: %.2f, severity: %s, reasons: %v",
			userID, score.OverallScore, score.Severity, score.ReasonCodes)
	}
	
	// Auto-flag if needed
	if score.ShouldAutoFlag {
		if err := s.autoFlagger.AutoFlagSubmission(ctx, submissionID, userID, score); err != nil {
			log.Printf("Error auto-flagging submission: %v", err)
		}
	}
	
	return nil
}

// GetAnomalyScorer returns the anomaly scorer for direct access
func (s *AbuseIntegrationService) GetAnomalyScorer() *AnomalyScorer {
	return s.anomalyScorer
}

// GetAutoFlagger returns the auto-flagger for direct access
func (s *AbuseIntegrationService) GetAutoFlagger() *AbuseAutoFlagger {
	return s.autoFlagger
}
