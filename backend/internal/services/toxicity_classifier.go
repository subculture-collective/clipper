package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lib/pq"
)

// ToxicityClassifier handles toxicity detection for comments
type ToxicityClassifier struct {
	httpClient *http.Client
	apiKey     string
	apiURL     string
	enabled    bool
	threshold  float64
	db         *pgxpool.Pool
}

// ToxicityScore represents the result of toxicity classification
type ToxicityScore struct {
	Toxic            bool             `json:"toxic"`
	ConfidenceScore  float64          `json:"confidence_score"`
	Categories       map[string]float64 `json:"categories"`
	ReasonCodes      []string         `json:"reason_codes"`
}

// PerspectiveAPIRequest represents a request to the Perspective API
type PerspectiveAPIRequest struct {
	Comment          CommentText `json:"comment"`
	RequestedAttributes map[string]interface{} `json:"requestedAttributes"`
	Languages        []string    `json:"languages"`
}

// CommentText represents the comment text for Perspective API
type CommentText struct {
	Text string `json:"text"`
}

// PerspectiveAPIResponse represents a response from the Perspective API
type PerspectiveAPIResponse struct {
	AttributeScores map[string]AttributeScore `json:"attributeScores"`
	Languages       []string                  `json:"languages"`
}

// AttributeScore represents the score for a specific attribute
type AttributeScore struct {
	SummaryScore SummaryScore `json:"summaryScore"`
}

// SummaryScore represents the summary score
type SummaryScore struct {
	Value float64 `json:"value"`
	Type  string  `json:"type"`
}

// NewToxicityClassifier creates a new ToxicityClassifier
func NewToxicityClassifier(apiKey, apiURL string, enabled bool, threshold float64, db *pgxpool.Pool) *ToxicityClassifier {
	return &ToxicityClassifier{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		apiKey:    apiKey,
		apiURL:    apiURL,
		enabled:   enabled,
		threshold: threshold,
		db:        db,
	}
}

// ClassifyComment analyzes a comment for toxicity
func (tc *ToxicityClassifier) ClassifyComment(ctx context.Context, content string) (*ToxicityScore, error) {
	// If classifier is disabled, return safe default
	if !tc.enabled {
		return &ToxicityScore{
			Toxic:           false,
			ConfidenceScore: 0.0,
			Categories:      make(map[string]float64),
			ReasonCodes:     []string{},
		}, nil
	}

	// Use Perspective API if configured
	if tc.apiKey != "" && tc.apiURL != "" {
		return tc.classifyWithPerspectiveAPI(ctx, content)
	}

	// Fallback to rule-based classification
	return tc.classifyWithRules(content)
}

// classifyWithPerspectiveAPI uses Google's Perspective API for toxicity detection
func (tc *ToxicityClassifier) classifyWithPerspectiveAPI(ctx context.Context, content string) (*ToxicityScore, error) {
	// Construct Perspective API request
	reqBody := PerspectiveAPIRequest{
		Comment: CommentText{
			Text: content,
		},
		RequestedAttributes: map[string]interface{}{
			"TOXICITY":           struct{}{},
			"SEVERE_TOXICITY":    struct{}{},
			"IDENTITY_ATTACK":    struct{}{},
			"INSULT":             struct{}{},
			"PROFANITY":          struct{}{},
			"THREAT":             struct{}{},
			"SEXUALLY_EXPLICIT":  struct{}{},
		},
		Languages: []string{"en"},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make API request
	url := fmt.Sprintf("%s?key=%s", tc.apiURL, tc.apiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := tc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make API request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var apiResp PerspectiveAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("failed to decode API response: %w", err)
	}

	// Extract scores and determine toxicity
	categories := make(map[string]float64)
	reasonCodes := []string{}
	maxScore := 0.0

	for attr, score := range apiResp.AttributeScores {
		value := score.SummaryScore.Value
		categories[attr] = value
		
		if value > maxScore {
			maxScore = value
		}
		
		// Add to reason codes if above threshold
		if value >= tc.threshold {
			reasonCodes = append(reasonCodes, attr)
		}
	}

	return &ToxicityScore{
		Toxic:           maxScore >= tc.threshold,
		ConfidenceScore: maxScore,
		Categories:      categories,
		ReasonCodes:     reasonCodes,
	}, nil
}

// classifyWithRules uses simple rule-based classification as fallback
func (tc *ToxicityClassifier) classifyWithRules(content string) (*ToxicityScore, error) {
	// Simple rule-based detection (placeholder - would need more sophisticated rules)
	// This is a basic fallback and should be enhanced with a proper rule set
	score := 0.0
	reasons := []string{}

	// TODO: Implement basic rule-based detection with common toxic patterns
	// For now, this is a safe fallback that doesn't flag content when the ML service is unavailable
	// In production, consider adding:
	// - Pattern matching for known toxic terms (with context awareness)
	// - Regex-based detection for slurs and profanity
	// - Length and formatting heuristics
	// - Rate limiting and spam detection
	_ = content // Acknowledge we're intentionally not using content in this minimal fallback

	return &ToxicityScore{
		Toxic:           score >= tc.threshold,
		ConfidenceScore: score,
		Categories: map[string]float64{
			"RULE_BASED": score,
		},
		ReasonCodes: reasons,
	}, nil
}

// AddToModerationQueue adds a toxic comment to the moderation queue
func (tc *ToxicityClassifier) AddToModerationQueue(ctx context.Context, commentID uuid.UUID, score *ToxicityScore) error {
	if tc.db == nil {
		return fmt.Errorf("database connection not available")
	}

	// Determine reason based on the highest scoring category
	reason := "toxic"
	if len(score.ReasonCodes) > 0 {
		// Map Perspective API categories to our reason codes
		categoryMap := map[string]string{
			"TOXICITY":          "toxic",
			"SEVERE_TOXICITY":   "toxic",
			"IDENTITY_ATTACK":   "harassment",
			"INSULT":            "offensive",
			"PROFANITY":         "offensive",
			"THREAT":            "harassment",
			"SEXUALLY_EXPLICIT": "inappropriate",
		}
		
		if mappedReason, ok := categoryMap[score.ReasonCodes[0]]; ok {
			reason = mappedReason
		}
	}

	// Calculate priority based on confidence score
	// Higher confidence = higher priority (0-100 scale)
	priority := int(score.ConfidenceScore * 100)
	if priority > 100 {
		priority = 100
	} else if priority < 50 {
		priority = 50 // Minimum priority for auto-flagged items
	}

	// Insert into moderation queue
	_, err := tc.db.Exec(ctx, `
		INSERT INTO moderation_queue 
		(content_type, content_id, reason, priority, status, auto_flagged, confidence_score)
		VALUES ($1, $2, $3, $4, 'pending', true, $5)
		ON CONFLICT (content_type, content_id) WHERE status = 'pending'
		DO UPDATE SET 
			confidence_score = EXCLUDED.confidence_score,
			priority = EXCLUDED.priority,
			reason = EXCLUDED.reason
	`, "comment", commentID, reason, priority, score.ConfidenceScore)

	return err
}

// RecordPrediction records a toxicity prediction for metrics tracking
func (tc *ToxicityClassifier) RecordPrediction(ctx context.Context, commentID uuid.UUID, score *ToxicityScore) error {
	if tc.db == nil {
		return fmt.Errorf("database connection not available")
	}

	// Store prediction in a metrics table for tracking precision/recall
	categoriesJSON, err := json.Marshal(score.Categories)
	if err != nil {
		return fmt.Errorf("failed to marshal categories: %w", err)
	}

	_, err = tc.db.Exec(ctx, `
		INSERT INTO toxicity_predictions 
		(comment_id, toxic, confidence_score, categories, reason_codes, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (comment_id) 
		DO UPDATE SET 
			toxic = EXCLUDED.toxic,
			confidence_score = EXCLUDED.confidence_score,
			categories = EXCLUDED.categories,
			reason_codes = EXCLUDED.reason_codes,
			updated_at = NOW()
	`, commentID, score.Toxic, score.ConfidenceScore, categoriesJSON, pq.Array(score.ReasonCodes))

	return err
}

// GetMetrics retrieves toxicity classification metrics
func (tc *ToxicityClassifier) GetMetrics(ctx context.Context, startDate, endDate time.Time) (map[string]interface{}, error) {
	if tc.db == nil {
		return nil, fmt.Errorf("database connection not available")
	}

	metrics := make(map[string]interface{})

	// Total predictions
	var totalPredictions int
	err := tc.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM toxicity_predictions 
		WHERE created_at >= $1 AND created_at <= $2
	`, startDate, endDate).Scan(&totalPredictions)
	if err != nil {
		return nil, fmt.Errorf("failed to get total predictions: %w", err)
	}
	metrics["total_predictions"] = totalPredictions

	// Total flagged as toxic
	var totalToxic int
	err = tc.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM toxicity_predictions 
		WHERE toxic = true AND created_at >= $1 AND created_at <= $2
	`, startDate, endDate).Scan(&totalToxic)
	if err != nil {
		return nil, fmt.Errorf("failed to get total toxic: %w", err)
	}
	metrics["total_toxic"] = totalToxic
	metrics["toxicity_rate"] = 0.0
	if totalPredictions > 0 {
		metrics["toxicity_rate"] = float64(totalToxic) / float64(totalPredictions)
	}

	// Get precision/recall if we have human review data
	// This would require joining with moderation decisions
	var tp, fp, fn int
	err = tc.db.QueryRow(ctx, `
		SELECT 
			COUNT(*) FILTER (WHERE tp.toxic = true AND md.action = 'reject') as true_positives,
			COUNT(*) FILTER (WHERE tp.toxic = true AND md.action = 'approve') as false_positives,
			COUNT(*) FILTER (WHERE tp.toxic = false AND md.action = 'reject') as false_negatives
		FROM toxicity_predictions tp
		JOIN moderation_queue mq ON tp.comment_id = mq.content_id AND mq.content_type = 'comment'
		LEFT JOIN moderation_decisions md ON mq.id = md.queue_item_id
		WHERE tp.created_at >= $1 AND tp.created_at <= $2
			AND md.created_at IS NOT NULL
	`, startDate, endDate).Scan(&tp, &fp, &fn)
	
	if err == nil {
		precision := 0.0
		recall := 0.0
		fpr := 0.0

		if tp+fp > 0 {
			precision = float64(tp) / float64(tp+fp)
		}
		if tp+fn > 0 {
			recall = float64(tp) / float64(tp+fn)
		}
		if fp+tp > 0 {
			fpr = float64(fp) / float64(fp+tp)
		}

		metrics["precision"] = precision
		metrics["recall"] = recall
		metrics["false_positive_rate"] = fpr
		metrics["true_positives"] = tp
		metrics["false_positives"] = fp
		metrics["false_negatives"] = fn
	}

	return metrics, nil
}
