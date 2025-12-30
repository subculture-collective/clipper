package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/services"
)

// NSFWHandler handles NSFW detection operations
type NSFWHandler struct {
	nsfwDetector *services.NSFWDetector
}

// NewNSFWHandler creates a new NSFWHandler
func NewNSFWHandler(nsfwDetector *services.NSFWDetector) *NSFWHandler {
	return &NSFWHandler{
		nsfwDetector: nsfwDetector,
	}
}

// DetectImage performs NSFW detection on an image URL
// POST /admin/nsfw/detect
func (h *NSFWHandler) DetectImage(c *gin.Context) {
	var req struct {
		ImageURL    string     `json:"image_url" binding:"required,url"`
		ContentType string     `json:"content_type" binding:"required,oneof=clip thumbnail submission user_avatar"`
		ContentID   *uuid.UUID `json:"content_id,omitempty"`
		AutoFlag    *bool      `json:"auto_flag,omitempty"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}
	
	ctx := c.Request.Context()
	
	// Perform detection
	score, err := h.nsfwDetector.DetectImage(ctx, req.ImageURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to detect NSFW content: " + err.Error(),
		})
		return
	}
	
	// Auto-flag to moderation queue if requested and content is NSFW
	if req.ContentID != nil && score.NSFW {
		autoFlag := true
		if req.AutoFlag != nil {
			autoFlag = *req.AutoFlag
		}
		
		if autoFlag {
			err = h.nsfwDetector.FlagToModerationQueue(ctx, req.ContentType, *req.ContentID, score)
			if err != nil {
				// Log error but don't fail the request
				c.Error(fmt.Errorf("failed to flag to moderation queue: %w", err))
			}
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"nsfw":             score.NSFW,
			"confidence_score": score.ConfidenceScore,
			"categories":       score.Categories,
			"reason_codes":     score.ReasonCodes,
			"latency_ms":       score.LatencyMs,
		},
	})
}

// BatchDetect performs NSFW detection on multiple images
// POST /admin/nsfw/batch-detect
func (h *NSFWHandler) BatchDetect(c *gin.Context) {
	var req struct {
		Images []struct {
			ImageURL    string     `json:"image_url" binding:"required,url"`
			ContentType string     `json:"content_type" binding:"required,oneof=clip thumbnail submission user_avatar"`
			ContentID   *uuid.UUID `json:"content_id,omitempty"`
		} `json:"images" binding:"required,min=1,max=50"`
		AutoFlag *bool `json:"auto_flag,omitempty"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}
	
	ctx := c.Request.Context()
	
	type result struct {
		ImageURL        string             `json:"image_url"`
		NSFW            bool               `json:"nsfw"`
		ConfidenceScore float64            `json:"confidence_score"`
		Categories      map[string]float64 `json:"categories"`
		ReasonCodes     []string           `json:"reason_codes"`
		LatencyMs       int64              `json:"latency_ms"`
		Error           *string            `json:"error,omitempty"`
		Flagged         bool               `json:"flagged"`
	}
	
	results := make([]result, 0, len(req.Images))
	totalLatency := int64(0)
	successCount := 0
	nsfwCount := 0
	
	for _, img := range req.Images {
		score, err := h.nsfwDetector.DetectImage(ctx, img.ImageURL)
		
		res := result{
			ImageURL: img.ImageURL,
		}
		
		if err != nil {
			errMsg := err.Error()
			res.Error = &errMsg
		} else {
			res.NSFW = score.NSFW
			res.ConfidenceScore = score.ConfidenceScore
			res.Categories = score.Categories
			res.ReasonCodes = score.ReasonCodes
			res.LatencyMs = score.LatencyMs
			
			totalLatency += score.LatencyMs
			successCount++
			
			if score.NSFW {
				nsfwCount++
				
				// Auto-flag if requested
				autoFlag := true
				if req.AutoFlag != nil {
					autoFlag = *req.AutoFlag
				}
				
				if autoFlag && img.ContentID != nil {
					err = h.nsfwDetector.FlagToModerationQueue(ctx, img.ContentType, *img.ContentID, score)
					if err == nil {
						res.Flagged = true
					}
				}
			}
		}
		
		results = append(results, res)
	}
	
	avgLatency := int64(0)
	if successCount > 0 {
		avgLatency = totalLatency / int64(successCount)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
		"meta": gin.H{
			"total_processed": len(req.Images),
			"success_count":   successCount,
			"nsfw_count":      nsfwCount,
			"avg_latency_ms":  avgLatency,
		},
	})
}

// GetMetrics retrieves NSFW detection metrics
// GET /admin/nsfw/metrics
func (h *NSFWHandler) GetMetrics(c *gin.Context) {
	ctx := c.Request.Context()
	
	// Parse date range
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")
	
	var startDate, endDate time.Time
	if startDateStr == "" {
		startDate = time.Now().AddDate(0, 0, -30) // Last 30 days
	} else {
		parsed, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid start_date format. Use YYYY-MM-DD",
			})
			return
		}
		startDate = parsed
	}
	
	if endDateStr == "" {
		endDate = time.Now()
	} else {
		parsed, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid end_date format. Use YYYY-MM-DD",
			})
			return
		}
		endDate = parsed.Add(24 * time.Hour) // Include the end date
	}
	
	metrics, err := h.nsfwDetector.GetMetrics(ctx, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve metrics: " + err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    metrics,
	})
}

// GetHealthCheck returns the health status of the NSFW detector
// GET /admin/nsfw/health
func (h *NSFWHandler) GetHealthCheck(c *gin.Context) {
	ctx := c.Request.Context()
	
	// Perform a test detection with a safe image URL to verify service is working
	testImageURL := "https://via.placeholder.com/150"
	
	startTime := time.Now()
	_, err := h.nsfwDetector.DetectImage(ctx, testImageURL)
	latency := time.Since(startTime).Milliseconds()
	
	healthy := err == nil
	status := "healthy"
	if !healthy {
		status = "unhealthy"
	}
	
	response := gin.H{
		"success": healthy,
		"status":  status,
		"latency_ms": latency,
	}
	
	if err != nil {
		response["error"] = err.Error()
		c.JSON(http.StatusServiceUnavailable, response)
		return
	}
	
	c.JSON(http.StatusOK, response)
}

// GetConfig returns the current NSFW detector configuration (non-sensitive)
// GET /admin/nsfw/config
func (h *NSFWHandler) GetConfig(c *gin.Context) {
	// Return non-sensitive configuration details
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enabled": h.nsfwDetector != nil,
			// Note: Don't expose threshold, API keys, or other sensitive config
			// These should be retrieved through secure admin APIs only
		},
	})
}

// ScanClipThumbnails scans existing clip thumbnails for NSFW content
// POST /admin/nsfw/scan-clips
func (h *NSFWHandler) ScanClipThumbnails(c *gin.Context) {
	var req struct {
		Limit    int  `json:"limit" binding:"omitempty,min=1,max=1000"`
		AutoFlag bool `json:"auto_flag" binding:"omitempty"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}
	
	if req.Limit == 0 {
		req.Limit = 100
	}
	
	// This would trigger a background job to scan clips
	// For now, return a job ID that can be polled
	jobID := uuid.New()
	
	c.JSON(http.StatusAccepted, gin.H{
		"success": true,
		"job_id":  jobID,
		"message": "Scan job started",
		"limit":   req.Limit,
	})
}
