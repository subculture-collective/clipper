package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
)

// SearchHandler handles search-related requests
type SearchHandler struct {
	searchRepo        *repository.SearchRepository
	openSearchService *services.OpenSearchService
	authService       *services.AuthService
	useOpenSearch     bool
}

// NewSearchHandler creates a new SearchHandler with PostgreSQL FTS
func NewSearchHandler(searchRepo *repository.SearchRepository, authService *services.AuthService) *SearchHandler {
	return &SearchHandler{
		searchRepo:    searchRepo,
		authService:   authService,
		useOpenSearch: false,
	}
}

// NewSearchHandlerWithOpenSearch creates a new SearchHandler with OpenSearch
func NewSearchHandlerWithOpenSearch(searchRepo *repository.SearchRepository, openSearchService *services.OpenSearchService, authService *services.AuthService) *SearchHandler {
	return &SearchHandler{
		searchRepo:        searchRepo,
		openSearchService: openSearchService,
		authService:       authService,
		useOpenSearch:     true,
	}
}

// Search handles universal search requests
// GET /api/v1/search
func (h *SearchHandler) Search(c *gin.Context) {
	var req models.SearchRequest

	// Bind query parameters
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid query parameters",
		})
		return
	}

	// Validate and set defaults
	if req.Query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Query parameter 'q' is required",
		})
		return
	}

	if req.Page < 1 {
		req.Page = 1
	}

	if req.Limit < 1 || req.Limit > 100 {
		req.Limit = 20
	}

	// Set default sort if not specified
	if req.Sort == "" {
		req.Sort = "relevance"
	}

	// Perform search using OpenSearch or PostgreSQL fallback
	var results *models.SearchResponse
	var err error

	if h.useOpenSearch && h.openSearchService != nil {
		results, err = h.openSearchService.Search(c.Request.Context(), &req)
	} else {
		results, err = h.searchRepo.Search(c.Request.Context(), &req)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to perform search",
		})
		return
	}

	// Track search analytics (optional, get user ID if authenticated)
	totalResults := results.Counts.Clips + results.Counts.Creators + results.Counts.Games + results.Counts.Tags

	// Try to get user from context (if authenticated)
	if userVal, exists := c.Get("user"); exists {
		if user, ok := userVal.(*models.User); ok {
			// Track search with user ID
			_ = h.searchRepo.TrackSearch(c.Request.Context(), &user.ID, req.Query, totalResults)
		}
	} else {
		// Track anonymous search
		_ = h.searchRepo.TrackSearch(c.Request.Context(), nil, req.Query, totalResults)
	}

	c.JSON(http.StatusOK, results)
}

// GetSuggestions handles autocomplete suggestions
// GET /api/v1/search/suggestions
func (h *SearchHandler) GetSuggestions(c *gin.Context) {
	query := c.Query("q")

	if query == "" || len(query) < 2 {
		c.JSON(http.StatusOK, gin.H{
			"suggestions": []models.SearchSuggestion{},
		})
		return
	}

	limit := 10 // Default limit for suggestions

	var suggestions []models.SearchSuggestion
	var err error

	// Use OpenSearch or PostgreSQL fallback
	if h.useOpenSearch && h.openSearchService != nil {
		suggestions, err = h.openSearchService.GetSuggestions(c.Request.Context(), query, limit)
	} else {
		suggestions, err = h.searchRepo.GetSuggestions(c.Request.Context(), query, limit)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get suggestions",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"query":       query,
		"suggestions": suggestions,
	})
}
