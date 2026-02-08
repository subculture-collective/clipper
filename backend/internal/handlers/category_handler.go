package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// CategoryHandler handles category-related HTTP requests
type CategoryHandler struct {
	categoryRepo *repository.CategoryRepository
	clipRepo     *repository.ClipRepository
}

// NewCategoryHandler creates a new CategoryHandler
func NewCategoryHandler(
	categoryRepo *repository.CategoryRepository,
	clipRepo *repository.ClipRepository,
) *CategoryHandler {
	return &CategoryHandler{
		categoryRepo: categoryRepo,
		clipRepo:     clipRepo,
	}
}

// ListCategories handles GET /api/v1/categories
func (h *CategoryHandler) ListCategories(c *gin.Context) {
	var categoryType *string
	if typeParam := c.Query("type"); typeParam != "" {
		categoryType = &typeParam
	}

	var featured *bool
	if featuredParam := c.Query("featured"); featuredParam != "" {
		parsed, err := strconv.ParseBool(featuredParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid featured parameter",
			})
			return
		}
		featured = &parsed
	}

	categories, err := h.categoryRepo.List(c.Request.Context(), categoryType, featured)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch categories",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"categories": categories,
	})
}

// GetCategory handles GET /api/v1/categories/:slug
func (h *CategoryHandler) GetCategory(c *gin.Context) {
	slug := c.Param("slug")

	category, err := h.categoryRepo.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Category not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"category": category,
	})
}

// ListCategoryGames handles GET /api/v1/categories/:slug/games
func (h *CategoryHandler) ListCategoryGames(c *gin.Context) {
	slug := c.Param("slug")

	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "50")
	pageStr := c.DefaultQuery("page", "1")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 50
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	offset := (page - 1) * limit

	// Get user ID if authenticated
	var userID *uuid.UUID
	if user, exists := c.Get("user"); exists {
		if u, ok := user.(*models.User); ok {
			userID = &u.ID
		}
	}

	// Get category
	category, err := h.categoryRepo.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Category not found",
		})
		return
	}

	// Get games in category
	games, err := h.categoryRepo.GetGamesInCategory(c.Request.Context(), category.ID, userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch games",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"games":    games,
		"page":     page,
		"limit":    limit,
		"has_more": len(games) == limit,
	})
}

// ListCategoryClips handles GET /api/v1/categories/:slug/clips
func (h *CategoryHandler) ListCategoryClips(c *gin.Context) {
	slug := c.Param("slug")

	// Parse pagination and filter parameters
	limitStr := c.DefaultQuery("limit", "20")
	pageStr := c.DefaultQuery("page", "1")
	sort := c.DefaultQuery("sort", "hot")
	timeframe := c.Query("timeframe")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	offset := (page - 1) * limit

	// Get category
	category, err := h.categoryRepo.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Category not found",
		})
		return
	}

	// Get user ID if authenticated (for is_following field)
	var userID *uuid.UUID
	if user, exists := c.Get("user"); exists {
		if u, ok := user.(*models.User); ok {
			userID = &u.ID
		}
	}

	// Get games in category (to filter clips by game IDs)
	games, err := h.categoryRepo.GetGamesInCategory(c.Request.Context(), category.ID, userID, 100, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch category games",
		})
		return
	}

	// If no games in category, return empty result
	if len(games) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"clips":    []interface{}{},
			"total":    0,
			"page":     page,
			"limit":    limit,
			"has_more": false,
		})
		return
	}

	// Fetch clips from all games in the category
	// We'll fetch more clips than needed and then paginate
	allClips := []models.Clip{}

	for _, game := range games {
		gameID := game.TwitchGameID
		filters := repository.ClipFilters{
			GameID:    &gameID,
			Sort:      sort,
			Timeframe: &timeframe,
		}

		// Fetch a larger batch to account for filtering
		clips, _, err := h.clipRepo.ListWithFilters(c.Request.Context(), filters, 1000, 0)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to fetch clips",
			})
			return
		}

		allClips = append(allClips, clips...)
	}

	// Calculate pagination
	total := len(allClips)
	start := offset
	end := offset + limit

	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	paginatedClips := []models.Clip{}
	if start < total {
		paginatedClips = allClips[start:end]
	}

	c.JSON(http.StatusOK, gin.H{
		"clips":    paginatedClips,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"has_more": end < total,
	})
}
