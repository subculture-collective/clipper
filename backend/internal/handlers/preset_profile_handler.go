package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// PresetProfileRepoIface defines the interface for preset profile repository operations
type PresetProfileRepoIface interface {
	List(ctx context.Context) ([]PresetProfileRepo, error)
	Get(ctx context.Context, id uuid.UUID) (*PresetProfileRepo, error)
	Create(ctx context.Context, name string, description *string, voteWeight, commentWeight, favoriteWeight, viewWeight float64, createdBy uuid.UUID) (*PresetProfileRepo, error)
	Update(ctx context.Context, id uuid.UUID, name string, description *string, voteWeight, commentWeight, favoriteWeight, viewWeight float64, updatedBy uuid.UUID) (*PresetProfileRepo, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// PresetProfileRepo represents the repository return type
type PresetProfileRepo struct {
	ID              uuid.UUID
	Name            string
	Description     *string
	VoteWeight      float64
	CommentWeight   float64
	FavoriteWeight  float64
	ViewWeight      float64
	IsSystem        bool
	CreatedBy       *uuid.UUID
	CreatedAt       time.Time
	UpdatedBy       *uuid.UUID
	UpdatedAt       time.Time
}

// PresetProfile is the JSON response format
type PresetProfile struct {
	ID              uuid.UUID  `json:"id"`
	Name            string     `json:"name"`
	Description     *string    `json:"description,omitempty"`
	VoteWeight      float64    `json:"vote_weight"`
	CommentWeight   float64    `json:"comment_weight"`
	FavoriteWeight  float64    `json:"favorite_weight"`
	ViewWeight      float64    `json:"view_weight"`
	IsSystem        bool       `json:"is_system"`
	CreatedBy       *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt       string     `json:"created_at"`
	UpdatedBy       *uuid.UUID `json:"updated_by,omitempty"`
	UpdatedAt       string     `json:"updated_at"`
}

type PresetProfileHandler struct {
	repo PresetProfileRepoIface
}

func NewPresetProfileHandler(repo PresetProfileRepoIface) *PresetProfileHandler {
	return &PresetProfileHandler{repo: repo}
}

type CreatePresetRequest struct {
	Name           string   `json:"name" binding:"required,min=1,max=100"`
	Description    *string  `json:"description"`
	VoteWeight     float64  `json:"vote_weight" binding:"required,gte=0"`
	CommentWeight  float64  `json:"comment_weight" binding:"required,gte=0"`
	FavoriteWeight float64  `json:"favorite_weight" binding:"required,gte=0"`
	ViewWeight     float64  `json:"view_weight" binding:"required,gte=0"`
}

type UpdatePresetRequest struct {
	Name           string   `json:"name" binding:"required,min=1,max=100"`
	Description    *string  `json:"description"`
	VoteWeight     float64  `json:"vote_weight" binding:"required,gte=0"`
	CommentWeight  float64  `json:"comment_weight" binding:"required,gte=0"`
	FavoriteWeight float64  `json:"favorite_weight" binding:"required,gte=0"`
	ViewWeight     float64  `json:"view_weight" binding:"required,gte=0"`
}

func (h *PresetProfileHandler) ListPresets(c *gin.Context) {
	profiles, err := h.repo.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list preset profiles"})
		return
	}

	// Convert to handler response format
	resp := make([]PresetProfile, len(profiles))
	for i, p := range profiles {
		resp[i] = PresetProfile{
			ID:              p.ID,
			Name:            p.Name,
			Description:     p.Description,
			VoteWeight:      p.VoteWeight,
			CommentWeight:   p.CommentWeight,
			FavoriteWeight:  p.FavoriteWeight,
			ViewWeight:      p.ViewWeight,
			IsSystem:        p.IsSystem,
			CreatedBy:       p.CreatedBy,
			CreatedAt:       p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedBy:       p.UpdatedBy,
			UpdatedAt:       p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	c.JSON(http.StatusOK, gin.H{"presets": resp})
}

func (h *PresetProfileHandler) GetPreset(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preset ID"})
		return
	}

	profile, err := h.repo.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Preset profile not found"})
		return
	}

	resp := PresetProfile{
		ID:              profile.ID,
		Name:            profile.Name,
		Description:     profile.Description,
		VoteWeight:      profile.VoteWeight,
		CommentWeight:   profile.CommentWeight,
		FavoriteWeight:  profile.FavoriteWeight,
		ViewWeight:      profile.ViewWeight,
		IsSystem:        profile.IsSystem,
		CreatedBy:       profile.CreatedBy,
		CreatedAt:       profile.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedBy:       profile.UpdatedBy,
		UpdatedAt:       profile.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	c.JSON(http.StatusOK, resp)
}

func (h *PresetProfileHandler) CreatePreset(c *gin.Context) {
	var req CreatePresetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate at least one weight is positive
	if req.VoteWeight == 0 && req.CommentWeight == 0 && req.FavoriteWeight == 0 && req.ViewWeight == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one weight must be positive"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userID := userIDValue.(uuid.UUID)

	profile, err := h.repo.Create(c.Request.Context(), req.Name, req.Description,
		req.VoteWeight, req.CommentWeight, req.FavoriteWeight, req.ViewWeight, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create preset profile"})
		return
	}

	resp := PresetProfile{
		ID:              profile.ID,
		Name:            profile.Name,
		Description:     profile.Description,
		VoteWeight:      profile.VoteWeight,
		CommentWeight:   profile.CommentWeight,
		FavoriteWeight:  profile.FavoriteWeight,
		ViewWeight:      profile.ViewWeight,
		IsSystem:        profile.IsSystem,
		CreatedBy:       profile.CreatedBy,
		CreatedAt:       profile.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedBy:       profile.UpdatedBy,
		UpdatedAt:       profile.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *PresetProfileHandler) UpdatePreset(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preset ID"})
		return
	}

	var req UpdatePresetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate at least one weight is positive
	if req.VoteWeight == 0 && req.CommentWeight == 0 && req.FavoriteWeight == 0 && req.ViewWeight == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one weight must be positive"})
		return
	}

	// Get user ID from context
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userID := userIDValue.(uuid.UUID)

	profile, err := h.repo.Update(c.Request.Context(), id, req.Name, req.Description,
		req.VoteWeight, req.CommentWeight, req.FavoriteWeight, req.ViewWeight, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preset profile"})
		return
	}

	resp := PresetProfile{
		ID:              profile.ID,
		Name:            profile.Name,
		Description:     profile.Description,
		VoteWeight:      profile.VoteWeight,
		CommentWeight:   profile.CommentWeight,
		FavoriteWeight:  profile.FavoriteWeight,
		ViewWeight:      profile.ViewWeight,
		IsSystem:        profile.IsSystem,
		CreatedBy:       profile.CreatedBy,
		CreatedAt:       profile.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedBy:       profile.UpdatedBy,
		UpdatedAt:       profile.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	c.JSON(http.StatusOK, resp)
}

func (h *PresetProfileHandler) DeletePreset(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preset ID"})
		return
	}

	if err := h.repo.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Preset profile deleted successfully"})
}
