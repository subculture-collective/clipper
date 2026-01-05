package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// ApplicationLogHandler handles application log operations
type ApplicationLogHandler struct {
	logRepo *repository.ApplicationLogRepository
}

// NewApplicationLogHandler creates a new ApplicationLogHandler
func NewApplicationLogHandler(logRepo *repository.ApplicationLogRepository) *ApplicationLogHandler {
	return &ApplicationLogHandler{
		logRepo: logRepo,
	}
}

// CreateLog handles POST /api/v1/logs
// Accepts log entries from frontend and mobile clients
func (h *ApplicationLogHandler) CreateLog(c *gin.Context) {
	var req models.CreateApplicationLogRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// Validate message size (max 100KB total payload)
	if len(req.Message) > 100000 {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"error": "Log message exceeds maximum size of 100KB",
		})
		return
	}

	// Set timestamp if not provided
	timestamp := time.Now()
	if req.Timestamp != nil {
		timestamp = *req.Timestamp
	}

	// Determine service from platform or use provided service
	service := "clipper-frontend"
	if req.Service != "" {
		service = req.Service
	} else if req.Platform == "ios" || req.Platform == "android" {
		service = "clipper-mobile"
	}

	// Get user ID from context if authenticated (optional)
	var userID *uuid.UUID
	if uid, exists := c.Get("user_id"); exists {
		if parsedUID, ok := uid.(uuid.UUID); ok {
			userID = &parsedUID
		}
	}

	// Get IP address from request
	ipAddress := c.ClientIP()

	// Filter sensitive data from message and error
	req.Message = h.filterSensitiveData(req.Message)
	if req.Error != nil {
		filtered := h.filterSensitiveData(*req.Error)
		req.Error = &filtered
	}

	// Filter sensitive data from context
	if req.Context != nil {
		req.Context = h.filterSensitiveContext(req.Context)
	}

	// Convert context to JSON
	var contextJSON json.RawMessage
	if req.Context != nil {
		contextBytes, err := json.Marshal(req.Context)
		if err != nil {
			utils.GetLogger().Error("Failed to marshal log context", err, map[string]interface{}{
				"error": err.Error(),
			})
		} else {
			contextJSON = contextBytes
		}
	}

	// Create application log entry
	log := &models.ApplicationLog{
		Level:      req.Level,
		Message:    req.Message,
		Timestamp:  timestamp,
		Service:    service,
		Platform:   &req.Platform,
		UserID:     userID,
		SessionID:  req.SessionID,
		TraceID:    req.TraceID,
		URL:        req.URL,
		UserAgent:  req.UserAgent,
		DeviceID:   req.DeviceID,
		AppVersion: req.AppVersion,
		Error:      req.Error,
		Stack:      req.Stack,
		Context:    contextJSON,
		IPAddress:  &ipAddress,
	}

	// Store in database
	if err := h.logRepo.Create(c.Request.Context(), log); err != nil {
		utils.GetLogger().Error("Failed to store application log", err, map[string]interface{}{
			"level":   req.Level,
			"service": service,
		})
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to store log",
		})
		return
	}

	// Return 204 No Content on success
	c.Status(http.StatusNoContent)
}

// filterSensitiveData removes sensitive information from log strings
func (h *ApplicationLogHandler) filterSensitiveData(text string) string {
	// These patterns are already filtered on the client side, but we add
	// server-side filtering as a defense-in-depth measure

	// Remove passwords and tokens (case-insensitive)
	sensitivePatterns := []string{
		"password", "passwd", "pwd", "secret", "token",
		"apikey", "api_key", "access_token", "auth_token",
		"authorization", "bearer",
	}

	lowerText := strings.ToLower(text)
	for _, pattern := range sensitivePatterns {
		if strings.Contains(lowerText, pattern) {
			// Don't log the actual sensitive data
			return "[REDACTED - contains sensitive data]"
		}
	}

	return text
}

// filterSensitiveContext removes sensitive keys from context map
func (h *ApplicationLogHandler) filterSensitiveContext(context map[string]interface{}) map[string]interface{} {
	filtered := make(map[string]interface{})
	
	for key, value := range context {
		lowerKey := strings.ToLower(key)
		
		// Skip sensitive keys
		if strings.Contains(lowerKey, "password") ||
			strings.Contains(lowerKey, "secret") ||
			strings.Contains(lowerKey, "token") ||
			strings.Contains(lowerKey, "api_key") ||
			strings.Contains(lowerKey, "apikey") ||
			strings.Contains(lowerKey, "authorization") ||
			lowerKey == "auth" {
			filtered[key] = "[REDACTED]"
			continue
		}

		// Filter nested maps recursively
		if nestedMap, ok := value.(map[string]interface{}); ok {
			filtered[key] = h.filterSensitiveContext(nestedMap)
		} else {
			filtered[key] = value
		}
	}

	return filtered
}

// GetLogStats handles GET /api/v1/logs/stats (admin only)
// Returns statistics about stored logs
func (h *ApplicationLogHandler) GetLogStats(c *gin.Context) {
	stats, err := h.logRepo.GetLogStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve log statistics",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats":   stats,
	})
}
