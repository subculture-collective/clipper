package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/services"
)

// AdHandler handles ad delivery endpoints
type AdHandler struct {
	adService *services.AdService
}

// NewAdHandler creates a new AdHandler
func NewAdHandler(adService *services.AdService) *AdHandler {
	return &AdHandler{
		adService: adService,
	}
}

// parseDaysParameter parses and validates the days query parameter
// Returns the number of days and true if valid, or 0 and false if invalid (error already sent)
func parseDaysParameter(c *gin.Context, defaultDays int) (int, bool) {
	days := defaultDays
	if daysStr := c.Query("days"); daysStr != "" {
		d, err := strconv.Atoi(daysStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "INVALID_PARAMETER",
					Message: "days parameter must be a valid integer",
				},
			})
			return 0, false
		}
		if d <= 0 || d > 365 {
			c.JSON(http.StatusBadRequest, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "INVALID_PARAMETER",
					Message: "days parameter must be between 1 and 365",
				},
			})
			return 0, false
		}
		days = d
	}
	return days, true
}

// SelectAd handles GET /ads/select
// Selects an appropriate ad for display based on request parameters
func (h *AdHandler) SelectAd(c *gin.Context) {
	var req models.AdSelectionRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: err.Error(),
			},
		})
		return
	}

	// Get user ID if authenticated
	var userID *uuid.UUID
	if userIDVal, exists := c.Get("user_id"); exists {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			userID = &uid
		}
	}

	// Get IP address for fraud prevention
	ipAddress := c.ClientIP()

	// Select an ad
	response, err := h.adService.SelectAd(c.Request.Context(), req, userID, ipAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "AD_SELECTION_FAILED",
				Message: "Failed to select ad",
			},
		})
		return
	}

	// If no ad available, return empty response with consistent structure
	if response.Ad == nil {
		c.JSON(http.StatusOK, StandardResponse{
			Success: true,
			Data:    models.AdSelectionResponse{},
		})
		return
	}

	// Return ad with impression tracking info
	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"ad":            response.Ad,
			"impression_id": response.ImpressionID,
			"tracking_url":  response.TrackingURL,
		},
	})
}

// TrackImpression handles POST /ads/track/:id
// Updates impression with viewability and click tracking data
func (h *AdHandler) TrackImpression(c *gin.Context) {
	impressionID := c.Param("id")
	if impressionID == "" {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_IMPRESSION_ID",
				Message: "Impression ID is required",
			},
		})
		return
	}

	// Validate UUID format
	if _, err := uuid.Parse(impressionID); err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_IMPRESSION_ID",
				Message: "Invalid impression ID format",
			},
		})
		return
	}

	var req models.AdTrackingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid tracking data",
			},
		})
		return
	}

	// Set the impression ID from URL
	req.ImpressionID = impressionID

	// Track the impression
	if err := h.adService.TrackImpression(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "TRACKING_FAILED",
				Message: "Failed to track impression",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"message": "Tracking recorded",
		},
	})
}

// GetAd handles GET /ads/:id
// Returns ad details by ID
func (h *AdHandler) GetAd(c *gin.Context) {
	adID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_AD_ID",
				Message: "Invalid ad ID format",
			},
		})
		return
	}

	ad, err := h.adService.GetAdByID(c.Request.Context(), adID)
	if err != nil {
		c.JSON(http.StatusNotFound, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "AD_NOT_FOUND",
				Message: "Ad not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    ad,
	})
}

// GetCTRReportByCampaign handles GET /ads/analytics/campaigns
// Returns CTR report grouped by campaign/ad
func (h *AdHandler) GetCTRReportByCampaign(c *gin.Context) {
	days, ok := parseDaysParameter(c, 30)
	if !ok {
		return
	}

	since := time.Now().AddDate(0, 0, -days)
	reports, err := h.adService.GetCTRReportByCampaign(c.Request.Context(), since)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "ANALYTICS_FAILED",
				Message: "Failed to get campaign CTR report",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"reports": reports,
			"days":    days,
		},
	})
}

// GetCTRReportBySlot handles GET /ads/analytics/slots
// Returns CTR report grouped by ad slot
func (h *AdHandler) GetCTRReportBySlot(c *gin.Context) {
	days, ok := parseDaysParameter(c, 30)
	if !ok {
		return
	}

	since := time.Now().AddDate(0, 0, -days)
	reports, err := h.adService.GetCTRReportBySlot(c.Request.Context(), since)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "ANALYTICS_FAILED",
				Message: "Failed to get slot CTR report",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"reports": reports,
			"days":    days,
		},
	})
}

// GetExperimentReport handles GET /ads/experiments/:id/report
// Returns analytics for a specific experiment
func (h *AdHandler) GetExperimentReport(c *gin.Context) {
	experimentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_EXPERIMENT_ID",
				Message: "Invalid experiment ID format",
			},
		})
		return
	}

	days, ok := parseDaysParameter(c, 30)
	if !ok {
		return
	}

	since := time.Now().AddDate(0, 0, -days)
	report, err := h.adService.GetExperimentReport(c.Request.Context(), experimentID, since)
	if err != nil {
		c.JSON(http.StatusNotFound, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "EXPERIMENT_NOT_FOUND",
				Message: "Experiment not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"report": report,
			"days":   days,
		},
	})
}

// ListExperiments handles GET /ads/experiments
// Returns all running experiments
func (h *AdHandler) ListExperiments(c *gin.Context) {
	experiments, err := h.adService.GetRunningExperiments(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "LIST_EXPERIMENTS_FAILED",
				Message: "Failed to list experiments",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"experiments": experiments,
		},
	})
}
