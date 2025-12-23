package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
)

// SearchHandler handles search-related requests
type SearchHandler struct {
	searchRepo          *repository.SearchRepository
	openSearchService   *services.OpenSearchService
	hybridSearchService *services.HybridSearchService
	authService         *services.AuthService
	useOpenSearch       bool
	useHybridSearch     bool
}

// NewSearchHandler creates a new SearchHandler with PostgreSQL FTS
func NewSearchHandler(searchRepo *repository.SearchRepository, authService *services.AuthService) *SearchHandler {
	return &SearchHandler{
		searchRepo:      searchRepo,
		authService:     authService,
		useOpenSearch:   false,
		useHybridSearch: false,
	}
}

// NewSearchHandlerWithOpenSearch creates a new SearchHandler with OpenSearch
func NewSearchHandlerWithOpenSearch(searchRepo *repository.SearchRepository, openSearchService *services.OpenSearchService, authService *services.AuthService) *SearchHandler {
	return &SearchHandler{
		searchRepo:        searchRepo,
		openSearchService: openSearchService,
		authService:       authService,
		useOpenSearch:     true,
		useHybridSearch:   false,
	}
}

// NewSearchHandlerWithHybridSearch creates a new SearchHandler with hybrid BM25 + vector search
func NewSearchHandlerWithHybridSearch(searchRepo *repository.SearchRepository, hybridSearchService *services.HybridSearchService, authService *services.AuthService) *SearchHandler {
	return &SearchHandler{
		searchRepo:          searchRepo,
		hybridSearchService: hybridSearchService,
		authService:         authService,
		useOpenSearch:       false,
		useHybridSearch:     true,
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
	if err := h.validateAndSetDefaults(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Perform search using hybrid search, OpenSearch, or PostgreSQL fallback
	var results *models.SearchResponse
	var err error

	if h.useHybridSearch && h.hybridSearchService != nil {
		// Use hybrid BM25 + vector similarity search
		results, err = h.hybridSearchService.Search(c.Request.Context(), &req)
	} else if h.useOpenSearch && h.openSearchService != nil {
		// Use OpenSearch BM25 only
		results, err = h.openSearchService.Search(c.Request.Context(), &req)
	} else {
		// Fall back to PostgreSQL FTS
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

// validateAndSetDefaults validates search request parameters and sets defaults
func (h *SearchHandler) validateAndSetDefaults(req *models.SearchRequest) error {
	if req.Query == "" {
		return fmt.Errorf("Query parameter 'q' is required")
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

	return nil
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

// SearchWithScores handles search requests that include similarity scores
// GET /api/v1/search/scores
func (h *SearchHandler) SearchWithScores(c *gin.Context) {
	var req models.SearchRequest

	// Bind query parameters
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid query parameters",
		})
		return
	}

	// Validate and set defaults
	if err := h.validateAndSetDefaults(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Only hybrid search supports scores
	if !h.useHybridSearch || h.hybridSearchService == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Hybrid search with similarity scores is not enabled",
		})
		return
	}

	// Perform search with scores
	results, err := h.hybridSearchService.SearchWithScores(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to perform search",
		})
		return
	}

	// Track search analytics
	totalResults := results.Counts.Clips + results.Counts.Creators + results.Counts.Games + results.Counts.Tags

	// Try to get user from context (if authenticated)
	if userVal, exists := c.Get("user"); exists {
		if user, ok := userVal.(*models.User); ok {
			_ = h.searchRepo.TrackSearch(c.Request.Context(), &user.ID, req.Query, totalResults)
		}
	} else {
		_ = h.searchRepo.TrackSearch(c.Request.Context(), nil, req.Query, totalResults)
	}

	c.JSON(http.StatusOK, results)
}

// GetTrendingSearches returns the most popular search queries
// GET /api/v1/search/trending
func (h *SearchHandler) GetTrendingSearches(c *gin.Context) {
days := 7
if d := c.Query("days"); d != "" {
if parsed, err := fmt.Sscanf(d, "%d", &days); err == nil && parsed == 1 {
if days < 1 || days > 365 {
days = 7
}
}
}

limit := 20
if l := c.Query("limit"); l != "" {
if parsed, err := fmt.Sscanf(l, "%d", &limit); err == nil && parsed == 1 {
if limit < 1 || limit > 100 {
limit = 20
}
}
}

searches, err := h.searchRepo.GetTrendingSearches(c.Request.Context(), days, limit)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{
"error": "Failed to get trending searches",
})
return
}

c.JSON(http.StatusOK, gin.H{
"trending_searches": searches,
"days":              days,
"limit":             limit,
})
}

// GetFailedSearches returns searches that returned no results
// GET /api/v1/search/failed
func (h *SearchHandler) GetFailedSearches(c *gin.Context) {
days := 7
if d := c.Query("days"); d != "" {
if parsed, err := fmt.Sscanf(d, "%d", &days); err == nil && parsed == 1 {
if days < 1 || days > 365 {
days = 7
}
}
}

limit := 20
if l := c.Query("limit"); l != "" {
if parsed, err := fmt.Sscanf(l, "%d", &limit); err == nil && parsed == 1 {
if limit < 1 || limit > 100 {
limit = 20
}
}
}

searches, err := h.searchRepo.GetFailedSearches(c.Request.Context(), days, limit)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{
"error": "Failed to get failed searches",
})
return
}

c.JSON(http.StatusOK, gin.H{
"failed_searches": searches,
"days":            days,
"limit":           limit,
})
}

// GetSearchHistory returns a user's recent search queries
// GET /api/v1/search/history
func (h *SearchHandler) GetSearchHistory(c *gin.Context) {
// Get user from context (requires authentication)
userVal, exists := c.Get("user")
if !exists {
c.JSON(http.StatusUnauthorized, gin.H{
"error": "Authentication required",
})
return
}

user, ok := userVal.(*models.User)
if !ok {
c.JSON(http.StatusUnauthorized, gin.H{
"error": "Invalid user context",
})
return
}

limit := 20
if l := c.Query("limit"); l != "" {
if parsed, err := fmt.Sscanf(l, "%d", &limit); err == nil && parsed == 1 {
if limit < 1 || limit > 100 {
limit = 20
}
}
}

history, err := h.searchRepo.GetUserSearchHistory(c.Request.Context(), user.ID, limit)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{
"error": "Failed to get search history",
})
return
}

c.JSON(http.StatusOK, gin.H{
"search_history": history,
"limit":          limit,
})
}

// GetSearchAnalytics returns overall search analytics (admin only)
// GET /api/v1/search/analytics
func (h *SearchHandler) GetSearchAnalytics(c *gin.Context) {
// Check if user is admin (requires authentication and admin role)
userVal, exists := c.Get("user")
if !exists {
c.JSON(http.StatusUnauthorized, gin.H{
"error": "Authentication required",
})
return
}

user, ok := userVal.(*models.User)
if !ok || user.Role != "admin" {
c.JSON(http.StatusForbidden, gin.H{
"error": "Admin access required",
})
return
}

days := 7
if d := c.Query("days"); d != "" {
if parsed, err := fmt.Sscanf(d, "%d", &days); err == nil && parsed == 1 {
if days < 1 || days > 365 {
days = 7
}
}
}

summary, err := h.searchRepo.GetSearchAnalyticsSummary(c.Request.Context(), days)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{
"error": "Failed to get search analytics",
})
return
}

c.JSON(http.StatusOK, gin.H{
"analytics": summary,
"days":      days,
})
}
