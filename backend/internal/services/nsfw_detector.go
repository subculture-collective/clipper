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
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// NSFWDetector handles NSFW detection for images/thumbnails
type NSFWDetector struct {
	httpClient     *http.Client
	apiKey         string
	apiURL         string
	enabled        bool
	threshold      float64
	scanThumbnails bool
	autoFlag       bool
	maxLatencyMs   int
	db             *pgxpool.Pool
	
	// Metrics (may be nil in tests)
	detectionCounter   *prometheus.CounterVec
	latencyHistogram   prometheus.Histogram
	flaggedCounter     *prometheus.CounterVec
	errorCounter       *prometheus.CounterVec
}

// NSFWScore represents the result of NSFW detection
type NSFWScore struct {
	NSFW            bool               `json:"nsfw"`
	ConfidenceScore float64            `json:"confidence_score"`
	Categories      map[string]float64 `json:"categories"`
	ReasonCodes     []string           `json:"reason_codes"`
	LatencyMs       int64              `json:"latency_ms"`
}

// NewNSFWDetector creates a new NSFWDetector
func NewNSFWDetector(
	apiKey, apiURL string,
	enabled bool,
	threshold float64,
	scanThumbnails, autoFlag bool,
	maxLatencyMs, timeoutSeconds int,
	db *pgxpool.Pool,
) *NSFWDetector {
	detector := &NSFWDetector{
		httpClient: &http.Client{
			Timeout: time.Duration(timeoutSeconds) * time.Second,
		},
		apiKey:         apiKey,
		apiURL:         apiURL,
		enabled:        enabled,
		threshold:      threshold,
		scanThumbnails: scanThumbnails,
		autoFlag:       autoFlag,
		maxLatencyMs:   maxLatencyMs,
		db:             db,
	}
	
	// Initialize Prometheus metrics only in production
	// (skip in tests to avoid duplicate registration)
	detector.initMetrics()
	
	return detector
}

// initMetrics initializes Prometheus metrics
func (nd *NSFWDetector) initMetrics() {
	// Safely initialize metrics, catching panics from duplicate registration
	defer func() {
		if r := recover(); r != nil {
			// Metrics already registered, skip
			nd.detectionCounter = nil
			nd.latencyHistogram = nil
			nd.flaggedCounter = nil
			nd.errorCounter = nil
		}
	}()
	
	nd.detectionCounter = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "nsfw_detection_total",
			Help: "Total number of NSFW detections performed",
		},
		[]string{"result"},
	)
	
	nd.latencyHistogram = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "nsfw_detection_latency_ms",
			Help:    "Latency of NSFW detection in milliseconds",
			Buckets: []float64{10, 25, 50, 100, 150, 200, 300, 500, 1000},
		},
	)
	
	nd.flaggedCounter = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "nsfw_content_flagged_total",
			Help: "Total number of NSFW content flagged",
		},
		[]string{"content_type"},
	)
	
	nd.errorCounter = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "nsfw_detection_errors_total",
			Help: "Total number of NSFW detection errors",
		},
		[]string{"error_type"},
	)
}

// DetectImage analyzes an image for NSFW content
func (nd *NSFWDetector) DetectImage(ctx context.Context, imageURL string) (*NSFWScore, error) {
	startTime := time.Now()
	
	// If detector is disabled, return safe default
	if !nd.enabled {
		return &NSFWScore{
			NSFW:            false,
			ConfidenceScore: 0.0,
			Categories:      make(map[string]float64),
			ReasonCodes:     []string{},
			LatencyMs:       0,
		}, nil
	}
	
	var score *NSFWScore
	var err error
	
	// Use external API if configured
	if nd.apiKey != "" && nd.apiURL != "" {
		score, err = nd.detectWithAPI(ctx, imageURL)
	} else {
		// Fallback to rule-based detection (very basic)
		score, err = nd.detectWithRules(imageURL)
	}
	
	// Record latency
	latencyMs := time.Since(startTime).Milliseconds()
	if nd.latencyHistogram != nil {
		nd.latencyHistogram.Observe(float64(latencyMs))
	}
	
	if score != nil {
		score.LatencyMs = latencyMs
	}
	
	// Record detection result
	if err != nil {
		if nd.errorCounter != nil {
			nd.errorCounter.WithLabelValues("detection_error").Inc()
		}
		if nd.detectionCounter != nil {
			nd.detectionCounter.WithLabelValues("error").Inc()
		}
		return nil, err
	}
	
	if nd.detectionCounter != nil {
		if score.NSFW {
			nd.detectionCounter.WithLabelValues("nsfw").Inc()
		} else {
			nd.detectionCounter.WithLabelValues("safe").Inc()
		}
	}
	
	return score, nil
}

// detectWithAPI uses an external API for NSFW detection
func (nd *NSFWDetector) detectWithAPI(ctx context.Context, imageURL string) (*NSFWScore, error) {
	// Generic API request structure - adapt based on actual provider
	// This example uses a generic format that can be adapted for:
	// - Sightengine API
	// - AWS Rekognition
	// - Google Cloud Vision AI
	// - Azure Content Moderator
	
	requestBody := map[string]interface{}{
		"url": imageURL,
		"models": []string{"nudity", "offensive"},
	}
	
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}
	
	req, err := http.NewRequestWithContext(ctx, "POST", nd.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+nd.apiKey)
	
	resp, err := nd.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}
	
	// Parse response - adapt based on actual provider
	var apiResponse struct {
		Nudity struct {
			Raw   float64 `json:"raw"`
			Safe  float64 `json:"safe"`
			Partial float64 `json:"partial"`
			Sexual  float64 `json:"sexual"`
		} `json:"nudity"`
		Offensive struct {
			Prob float64 `json:"prob"`
		} `json:"offensive"`
	}
	
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	if err := json.Unmarshal(bodyBytes, &apiResponse); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	
	// Calculate overall score
	maxScore := max(
		apiResponse.Nudity.Raw,
		apiResponse.Nudity.Sexual,
		apiResponse.Offensive.Prob,
	)
	
	score := &NSFWScore{
		NSFW:            maxScore >= nd.threshold,
		ConfidenceScore: maxScore,
		Categories: map[string]float64{
			"nudity_raw":     apiResponse.Nudity.Raw,
			"nudity_safe":    apiResponse.Nudity.Safe,
			"nudity_partial": apiResponse.Nudity.Partial,
			"nudity_sexual":  apiResponse.Nudity.Sexual,
			"offensive":      apiResponse.Offensive.Prob,
		},
		ReasonCodes: []string{},
	}
	
	// Build reason codes
	if apiResponse.Nudity.Raw >= nd.threshold {
		score.ReasonCodes = append(score.ReasonCodes, "nudity_explicit")
	}
	if apiResponse.Nudity.Sexual >= nd.threshold {
		score.ReasonCodes = append(score.ReasonCodes, "sexual_content")
	}
	if apiResponse.Offensive.Prob >= nd.threshold {
		score.ReasonCodes = append(score.ReasonCodes, "offensive_content")
	}
	
	return score, nil
}

// detectWithRules provides basic rule-based fallback detection
func (nd *NSFWDetector) detectWithRules(imageURL string) (*NSFWScore, error) {
	// Very basic fallback - just returns safe
	// In production, you might want to implement basic heuristics
	return &NSFWScore{
		NSFW:            false,
		ConfidenceScore: 0.0,
		Categories:      make(map[string]float64),
		ReasonCodes:     []string{},
	}, nil
}

// FlagToModerationQueue flags NSFW content to the moderation queue
func (nd *NSFWDetector) FlagToModerationQueue(ctx context.Context, contentType string, contentID uuid.UUID, score *NSFWScore) error {
	if !nd.autoFlag {
		return nil
	}
	
	// Build reason string
	reason := "nsfw_detected"
	if len(score.ReasonCodes) > 0 {
		reason = "nsfw_" + score.ReasonCodes[0]
	}
	
	// Calculate priority based on confidence score (higher confidence = higher priority)
	priority := int(score.ConfidenceScore * 100)
	
	// Insert into moderation queue
	query := `
		INSERT INTO moderation_queue (
			content_type, content_id, reason, priority, 
			auto_flagged, confidence_score, status
		)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending')
		ON CONFLICT (content_type, content_id) WHERE status = 'pending'
		DO UPDATE SET 
			confidence_score = GREATEST(moderation_queue.confidence_score, EXCLUDED.confidence_score),
			priority = GREATEST(moderation_queue.priority, EXCLUDED.priority)
	`
	
	_, err := nd.db.Exec(ctx, query, contentType, contentID, reason, priority, true, score.ConfidenceScore)
	if err != nil {
		if nd.errorCounter != nil {
			nd.errorCounter.WithLabelValues("queue_insert_error").Inc()
		}
		return fmt.Errorf("failed to flag to moderation queue: %w", err)
	}
	
	if nd.flaggedCounter != nil {
		nd.flaggedCounter.WithLabelValues(contentType).Inc()
	}
	
	return nil
}

// GetMetrics retrieves NSFW detection metrics
func (nd *NSFWDetector) GetMetrics(ctx context.Context, startDate, endDate time.Time) (map[string]interface{}, error) {
	metrics := make(map[string]interface{})
	
	// Get detection counts by result
	rows, err := nd.db.Query(ctx, `
		SELECT 
			reason,
			COUNT(*) as count,
			AVG(confidence_score) as avg_confidence
		FROM moderation_queue
		WHERE reason LIKE 'nsfw_%'
			AND created_at >= $1 
			AND created_at < $2
		GROUP BY reason
		ORDER BY count DESC
	`, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get metrics: %w", err)
	}
	defer rows.Close()
	
	detectionsByReason := make(map[string]map[string]interface{})
	totalDetections := 0
	
	for rows.Next() {
		var reason string
		var count int
		var avgConfidence float64
		
		if err := rows.Scan(&reason, &count, &avgConfidence); err != nil {
			continue
		}
		
		detectionsByReason[reason] = map[string]interface{}{
			"count":          count,
			"avg_confidence": avgConfidence,
		}
		totalDetections += count
	}
	
	metrics["total_detections"] = totalDetections
	metrics["detections_by_reason"] = detectionsByReason
	metrics["start_date"] = startDate.Format("2006-01-02")
	metrics["end_date"] = endDate.Format("2006-01-02")
	
	// Get average review time
	var avgReviewMinutes *float64
	err = nd.db.QueryRow(ctx, `
		SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 60)
		FROM moderation_queue
		WHERE reason LIKE 'nsfw_%'
			AND reviewed_at IS NOT NULL
			AND created_at >= $1 
			AND created_at < $2
	`, startDate, endDate).Scan(&avgReviewMinutes)
	if err == nil && avgReviewMinutes != nil {
		metrics["avg_review_time_minutes"] = *avgReviewMinutes
	}
	
	return metrics, nil
}

// max returns the maximum of multiple float64 values
func max(values ...float64) float64 {
	if len(values) == 0 {
		return 0
	}
	maxVal := values[0]
	for _, v := range values[1:] {
		if v > maxVal {
			maxVal = v
		}
	}
	return maxVal
}
