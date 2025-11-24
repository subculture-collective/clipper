package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/services"
)

// RevenueHandler handles revenue analytics HTTP endpoints
type RevenueHandler struct {
	revenueService *services.RevenueService
}

// NewRevenueHandler creates a new revenue handler
func NewRevenueHandler(revenueService *services.RevenueService) *RevenueHandler {
	return &RevenueHandler{
		revenueService: revenueService,
	}
}

// GetRevenueOverview returns current revenue metrics overview
// @Summary Get revenue overview
// @Description Returns current MRR, ARR, ARPU, subscriber counts, and growth metrics
// @Tags Admin Revenue
// @Produce json
// @Success 200 {object} models.RevenueOverview
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin only"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/revenue/overview [get]
func (h *RevenueHandler) GetRevenueOverview(c *gin.Context) {
	overview, err := h.revenueService.GetRevenueOverview(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch revenue overview",
			},
		})
		return
	}

	c.JSON(http.StatusOK, overview)
}

// GetPlanDistribution returns subscriber distribution across plans
// @Summary Get plan distribution
// @Description Returns the distribution of subscribers across monthly, yearly, and free plans
// @Tags Admin Revenue
// @Produce json
// @Success 200 {object} models.PlanDistribution
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin only"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/revenue/distribution [get]
func (h *RevenueHandler) GetPlanDistribution(c *gin.Context) {
	distribution, err := h.revenueService.GetPlanDistribution(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch plan distribution",
			},
		})
		return
	}

	c.JSON(http.StatusOK, distribution)
}

// GetMRRTrend returns MRR trend data
// @Summary Get MRR trend
// @Description Returns MRR trend data for the specified number of days
// @Tags Admin Revenue
// @Produce json
// @Param days query int false "Number of days (default 30)"
// @Success 200 {object} map[string]interface{} "MRR trend data"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin only"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/revenue/trends/mrr [get]
func (h *RevenueHandler) GetMRRTrend(c *gin.Context) {
	days := 30
	if daysParam := c.Query("days"); daysParam != "" {
		if d, err := strconv.Atoi(daysParam); err == nil && d > 0 && d <= 365 {
			days = d
		}
	}

	trend, err := h.revenueService.GetMRRTrend(c.Request.Context(), days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch MRR trend",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"metric": "mrr",
		"days":   days,
		"data":   trend,
	})
}

// GetSubscriberTrend returns subscriber count trend data
// @Summary Get subscriber trend
// @Description Returns subscriber count trend data for the specified number of days
// @Tags Admin Revenue
// @Produce json
// @Param days query int false "Number of days (default 30)"
// @Success 200 {object} map[string]interface{} "Subscriber trend data"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin only"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/revenue/trends/subscribers [get]
func (h *RevenueHandler) GetSubscriberTrend(c *gin.Context) {
	days := 30
	if daysParam := c.Query("days"); daysParam != "" {
		if d, err := strconv.Atoi(daysParam); err == nil && d > 0 && d <= 365 {
			days = d
		}
	}

	trend, err := h.revenueService.GetSubscriberTrend(c.Request.Context(), days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch subscriber trend",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"metric": "subscribers",
		"days":   days,
		"data":   trend,
	})
}

// GetChurnTrend returns churn trend data
// @Summary Get churn trend
// @Description Returns churn trend data for the specified number of days
// @Tags Admin Revenue
// @Produce json
// @Param days query int false "Number of days (default 30)"
// @Success 200 {object} map[string]interface{} "Churn trend data"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin only"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/revenue/trends/churn [get]
func (h *RevenueHandler) GetChurnTrend(c *gin.Context) {
	days := 30
	if daysParam := c.Query("days"); daysParam != "" {
		if d, err := strconv.Atoi(daysParam); err == nil && d > 0 && d <= 365 {
			days = d
		}
	}

	trend, err := h.revenueService.GetChurnTrend(c.Request.Context(), days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch churn trend",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"metric": "churn",
		"days":   days,
		"data":   trend,
	})
}

// GetCohortRetention returns cohort retention matrix
// @Summary Get cohort retention
// @Description Returns cohort retention matrix for tracking subscriber retention by signup month
// @Tags Admin Revenue
// @Produce json
// @Param months query int false "Number of months (default 12)"
// @Success 200 {array} models.CohortRetentionRow "Cohort retention data"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin only"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/revenue/cohorts [get]
func (h *RevenueHandler) GetCohortRetention(c *gin.Context) {
	months := 12
	if monthsParam := c.Query("months"); monthsParam != "" {
		if m, err := strconv.Atoi(monthsParam); err == nil && m > 0 && m <= 24 {
			months = m
		}
	}

	cohorts, err := h.revenueService.GetCohortRetention(c.Request.Context(), months)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch cohort retention",
			},
		})
		return
	}

	c.JSON(http.StatusOK, cohorts)
}

// TriggerBackfill triggers the metrics backfill job
// @Summary Trigger metrics backfill
// @Description Triggers the backfill job to sync Stripe metrics
// @Tags Admin Revenue
// @Produce json
// @Param days query int false "Number of days to backfill (default 30)"
// @Success 200 {object} map[string]interface{} "Backfill started"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - admin only"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/revenue/backfill [post]
func (h *RevenueHandler) TriggerBackfill(c *gin.Context) {
	days := 30
	if daysParam := c.Query("days"); daysParam != "" {
		if d, err := strconv.Atoi(daysParam); err == nil && d > 0 && d <= 365 {
			days = d
		}
	}

	// Run backfill asynchronously with a background context
	// since the request context will be cancelled when the response is sent
	if h.revenueService != nil {
		go func() {
			ctx := context.Background()
			if err := h.revenueService.BackfillMetrics(ctx, days); err != nil {
				log.Printf("[REVENUE] Backfill job failed: %v", err)
			}
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Backfill job started",
		"days":    days,
	})
}
