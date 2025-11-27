package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
)

// Define minimal interfaces for easier testing/mocking
type ConfigServiceIface interface {
	GetEngagementConfig(ctx context.Context) (*services.EngagementConfig, error)
	UpdateEngagementConfig(ctx context.Context, config *services.EngagementConfig, updatedBy uuid.UUID) error
}

type ClipRepoIface interface {
	RecalculateEngagementScores(ctx context.Context, voteWeight, commentWeight, favoriteWeight, viewWeight float64) error
}

type ConfigHandler struct {
	configService ConfigServiceIface
	clipRepo      ClipRepoIface
}

func NewConfigHandler(configService *services.ConfigService, clipRepo *repository.ClipRepository) *ConfigHandler {
	return &ConfigHandler{
		configService: configService,
		clipRepo:      clipRepo,
	}
}

// GetEngagementConfig returns current engagement scoring configuration
func (h *ConfigHandler) GetEngagementConfig(c *gin.Context) {
	config, err := h.configService.GetEngagementConfig(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load configuration"})
		return
	}

	c.JSON(http.StatusOK, config)
}

// UpdateEngagementConfig updates engagement scoring weights and triggers recalculation
func (h *ConfigHandler) UpdateEngagementConfig(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
		return
	}

	var config services.EngagementConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate weights are positive
	if config.VoteWeight < 0 || config.CommentWeight < 0 || config.FavoriteWeight < 0 || config.ViewWeight < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All weights must be non-negative"})
		return
	}

	// Additional validation: at least one weight should be positive
	if config.VoteWeight == 0 && config.CommentWeight == 0 && config.FavoriteWeight == 0 && config.ViewWeight == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one weight must be positive"})
		return
	}

	// Update configuration
	if err := h.configService.UpdateEngagementConfig(c.Request.Context(), &config, uid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update configuration"})
		return
	}

	// Recalculate engagement scores with new weights
	if err := h.clipRepo.RecalculateEngagementScores(
		c.Request.Context(),
		config.VoteWeight,
		config.CommentWeight,
		config.FavoriteWeight,
		config.ViewWeight,
	); err != nil {
		// Log error but don't fail the request - config was updated successfully
		c.JSON(http.StatusOK, gin.H{
			"message": "Configuration updated successfully, but recalculation failed",
			"config":  config,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Configuration updated and engagement scores recalculated",
		"config":  config,
	})
}
