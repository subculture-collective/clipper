package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/repository"
)

// AbuseAutoFlagger automatically flags suspicious content to the moderation queue
type AbuseAutoFlagger struct {
	db                 *sql.DB
	anomalyScorer      *AnomalyScorer
	moderationEventSvc *ModerationEventService
}

// NewAbuseAutoFlagger creates a new auto-flagger
func NewAbuseAutoFlagger(db *sql.DB, anomalyScorer *AnomalyScorer, moderationEventSvc *ModerationEventService) *AbuseAutoFlagger {
	return &AbuseAutoFlagger{
		db:                 db,
		anomalyScorer:      anomalyScorer,
		moderationEventSvc: moderationEventSvc,
	}
}

// AutoFlagSubmission creates a moderation queue entry for a suspicious submission
func (f *AbuseAutoFlagger) AutoFlagSubmission(ctx context.Context, submissionID uuid.UUID, userID uuid.UUID, score *AnomalyScore) error {
	if !score.ShouldAutoFlag {
		return nil // Don't flag if score doesn't warrant it
	}
	
	// Determine reason string from reason codes
	reason := f.formatReasonCodes(score.ReasonCodes)
	priority := f.calculatePriority(score)
	
	// Create moderation queue entry
	query := `
		INSERT INTO moderation_queue (
			content_type, content_id, reason, priority, status,
			auto_flagged, confidence_score, report_count, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, NOW()
		)
		ON CONFLICT (content_type, content_id) WHERE status = 'pending'
		DO UPDATE SET
			priority = GREATEST(moderation_queue.priority, EXCLUDED.priority),
			confidence_score = EXCLUDED.confidence_score,
			report_count = moderation_queue.report_count + 1
		RETURNING id
	`
	
	var queueID uuid.UUID
	err := f.db.QueryRowContext(ctx, query,
		"submission",
		submissionID,
		reason,
		priority,
		"pending",
		true,
		score.ConfidenceScore,
		1,
	).Scan(&queueID)
	
	if err != nil {
		return fmt.Errorf("failed to create moderation queue entry: %w", err)
	}
	
	// Emit moderation event
	if f.moderationEventSvc != nil {
		metadata := map[string]interface{}{
			"anomaly_score":    score.OverallScore,
			"confidence":       score.ConfidenceScore,
			"severity":         score.Severity,
			"reason_codes":     score.ReasonCodes,
			"component_scores": score.ComponentScores,
			"auto_flagged":     true,
			"queue_id":         queueID,
		}
		
		f.moderationEventSvc.EmitAbuseEvent(ctx,
			ModerationEventSubmissionSuspicious,
			userID,
			"",
			metadata,
		)
	}
	
	log.Printf("[AUTO FLAG] Flagged submission %s (user %s) - score: %.2f, reasons: %s",
		submissionID, userID, score.OverallScore, strings.Join(score.ReasonCodes, ", "))
	
	return nil
}

// AutoFlagVote flags suspicious voting patterns
func (f *AbuseAutoFlagger) AutoFlagVote(ctx context.Context, voteID uuid.UUID, userID uuid.UUID, clipID uuid.UUID, score *AnomalyScore) error {
	if !score.ShouldAutoFlag {
		return nil
	}
	
	reason := f.formatReasonCodes(score.ReasonCodes)
	priority := f.calculatePriority(score)
	
	// For votes, we flag the user activity rather than the clip
	// Create a moderation queue entry for the user
	query := `
		INSERT INTO moderation_queue (
			content_type, content_id, reason, priority, status,
			auto_flagged, confidence_score, report_count, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, NOW()
		)
		ON CONFLICT (content_type, content_id) WHERE status = 'pending'
		DO UPDATE SET
			priority = GREATEST(moderation_queue.priority, EXCLUDED.priority),
			confidence_score = EXCLUDED.confidence_score,
			report_count = moderation_queue.report_count + 1
		RETURNING id
	`
	
	var queueID uuid.UUID
	err := f.db.QueryRowContext(ctx, query,
		"user",
		userID,
		reason,
		priority,
		"pending",
		true,
		score.ConfidenceScore,
		1,
	).Scan(&queueID)
	
	if err != nil {
		return fmt.Errorf("failed to create moderation queue entry: %w", err)
	}
	
	// Emit moderation event
	if f.moderationEventSvc != nil {
		metadata := map[string]interface{}{
			"anomaly_score":    score.OverallScore,
			"confidence":       score.ConfidenceScore,
			"severity":         score.Severity,
			"reason_codes":     score.ReasonCodes,
			"component_scores": score.ComponentScores,
			"auto_flagged":     true,
			"queue_id":         queueID,
			"action_type":      "vote",
			"clip_id":          clipID,
		}
		
		f.moderationEventSvc.EmitAbuseEvent(ctx,
			ModerationEventAbuseDetected,
			userID,
			"",
			metadata,
		)
	}
	
	log.Printf("[AUTO FLAG] Flagged user %s for suspicious voting - score: %.2f, reasons: %s",
		userID, score.OverallScore, strings.Join(score.ReasonCodes, ", "))
	
	return nil
}

// AutoFlagFollow flags suspicious follow patterns
func (f *AbuseAutoFlagger) AutoFlagFollow(ctx context.Context, followerID uuid.UUID, followingID uuid.UUID, score *AnomalyScore) error {
	if !score.ShouldAutoFlag {
		return nil
	}
	
	reason := f.formatReasonCodes(score.ReasonCodes)
	priority := f.calculatePriority(score)
	
	// Flag the follower user
	query := `
		INSERT INTO moderation_queue (
			content_type, content_id, reason, priority, status,
			auto_flagged, confidence_score, report_count, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, NOW()
		)
		ON CONFLICT (content_type, content_id) WHERE status = 'pending'
		DO UPDATE SET
			priority = GREATEST(moderation_queue.priority, EXCLUDED.priority),
			confidence_score = EXCLUDED.confidence_score,
			report_count = moderation_queue.report_count + 1
		RETURNING id
	`
	
	var queueID uuid.UUID
	err := f.db.QueryRowContext(ctx, query,
		"user",
		followerID,
		reason,
		priority,
		"pending",
		true,
		score.ConfidenceScore,
		1,
	).Scan(&queueID)
	
	if err != nil {
		return fmt.Errorf("failed to create moderation queue entry: %w", err)
	}
	
	// Emit moderation event
	if f.moderationEventSvc != nil {
		metadata := map[string]interface{}{
			"anomaly_score":    score.OverallScore,
			"confidence":       score.ConfidenceScore,
			"severity":         score.Severity,
			"reason_codes":     score.ReasonCodes,
			"component_scores": score.ComponentScores,
			"auto_flagged":     true,
			"queue_id":         queueID,
			"action_type":      "follow",
			"following_id":     followingID,
		}
		
		f.moderationEventSvc.EmitAbuseEvent(ctx,
			ModerationEventAbuseDetected,
			followerID,
			"",
			metadata,
		)
	}
	
	log.Printf("[AUTO FLAG] Flagged user %s for suspicious following - score: %.2f, reasons: %s",
		followerID, score.OverallScore, strings.Join(score.ReasonCodes, ", "))
	
	return nil
}

// formatReasonCodes formats reason codes into a human-readable string
func (f *AbuseAutoFlagger) formatReasonCodes(codes []string) string {
	if len(codes) == 0 {
		return "anomaly_detected"
	}
	
	// Map reason codes to human-readable descriptions
	reasonMap := map[string]string{
		"VOTE_VELOCITY_HIGH":              "High voting velocity",
		"FOLLOW_VELOCITY_HIGH":            "High follow velocity",
		"SUBMISSION_VELOCITY_HIGH":        "High submission velocity",
		"IP_SHARED_MULTIPLE_ACCOUNTS":    "Multiple accounts from same IP",
		"IP_HOPPING_DETECTED":            "Frequent IP address changes",
		"COORDINATED_VOTING_DETECTED":    "Coordinated voting pattern",
		"CIRCULAR_FOLLOW_PATTERN":        "Circular follow pattern",
		"BURST_ACTIVITY_DETECTED":        "Burst activity pattern",
		"VOTE_PATTERN_MONOTONOUS":        "Monotonous voting pattern",
		"TIMING_PATTERN_SUSPICIOUS":      "Suspicious timing pattern",
		"LOW_TRUST_SCORE":                "Low trust score",
		"NEW_ACCOUNT":                    "New account activity",
	}
	
	descriptions := make([]string, 0, len(codes))
	for _, code := range codes {
		if desc, ok := reasonMap[code]; ok {
			descriptions = append(descriptions, desc)
		} else {
			descriptions = append(descriptions, code)
		}
	}
	
	// Take up to 3 most relevant reasons
	if len(descriptions) > 3 {
		descriptions = descriptions[:3]
	}
	
	result := strings.Join(descriptions, "; ")
	if len(result) > 50 {
		result = result[:47] + "..."
	}
	
	return result
}

// calculatePriority calculates moderation priority from score
func (f *AbuseAutoFlagger) calculatePriority(score *AnomalyScore) int {
	// Priority ranges from 0-100
	// Base priority on overall score and confidence
	basePriority := int(score.OverallScore * 100)
	
	// Adjust based on confidence
	confidenceAdjustment := int((score.ConfidenceScore - 0.5) * 20)
	
	priority := basePriority + confidenceAdjustment
	
	// Ensure within bounds
	if priority < 50 {
		priority = 50 // minimum for auto-flagged items
	}
	if priority > 100 {
		priority = 100
	}
	
	return priority
}

// GetAutoFlagStats returns statistics about auto-flagging
func (f *AbuseAutoFlagger) GetAutoFlagStats(ctx context.Context, since time.Time) (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	
	// Count auto-flagged items by content type
	query := `
		SELECT content_type, COUNT(*), AVG(confidence_score), AVG(priority)
		FROM moderation_queue
		WHERE auto_flagged = true AND created_at >= $1
		GROUP BY content_type
	`
	
	rows, err := f.db.QueryContext(ctx, query, since)
	if err != nil {
		return nil, fmt.Errorf("failed to get auto-flag stats: %w", err)
	}
	defer rows.Close()
	
	typeStats := make(map[string]map[string]interface{})
	for rows.Next() {
		var contentType string
		var count int
		var avgConfidence, avgPriority float64
		
		if err := rows.Scan(&contentType, &count, &avgConfidence, &avgPriority); err != nil {
			continue
		}
		
		typeStats[contentType] = map[string]interface{}{
			"count":          count,
			"avg_confidence": avgConfidence,
			"avg_priority":   avgPriority,
		}
	}
	
	stats["by_type"] = typeStats
	
	// Count items that were reviewed
	reviewQuery := `
		SELECT status, COUNT(*)
		FROM moderation_queue
		WHERE auto_flagged = true AND created_at >= $1
		GROUP BY status
	`
	
	reviewRows, err := f.db.QueryContext(ctx, reviewQuery, since)
	if err == nil {
		defer reviewRows.Close()
		
		statusCounts := make(map[string]int)
		for reviewRows.Next() {
			var status string
			var count int
			if err := reviewRows.Scan(&status, &count); err == nil {
				statusCounts[status] = count
			}
		}
		stats["by_status"] = statusCounts
	}
	
	return stats, nil
}
