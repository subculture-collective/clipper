package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/services"
)

// PlaylistHandler handles playlist-related requests
type PlaylistHandler struct {
	playlistService *services.PlaylistService
}

// NewPlaylistHandler creates a new PlaylistHandler
func NewPlaylistHandler(playlistService *services.PlaylistService) *PlaylistHandler {
	return &PlaylistHandler{
		playlistService: playlistService,
	}
}

// CreatePlaylist handles POST /api/playlists
func (h *PlaylistHandler) CreatePlaylist(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse request body
	var req models.CreatePlaylistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: err.Error(),
			},
		})
		return
	}

	// Create playlist
	playlist, err := h.playlistService.CreatePlaylist(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to create playlist",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, StandardResponse{
		Success: true,
		Data:    playlist,
	})
}

// GetPlaylist handles GET /api/playlists/:id
func (h *PlaylistHandler) GetPlaylist(c *gin.Context) {
	// Parse playlist ID
	playlistIDStr := c.Param("id")
	playlistID, err := uuid.Parse(playlistIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid playlist ID",
			},
		})
		return
	}

	// Get optional user ID from context
	var userID *uuid.UUID
	if userIDVal, exists := c.Get("user_id"); exists {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			userID = &uid
		}
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// Validate and constrain parameters
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Get playlist with clips
	playlist, err := h.playlistService.GetPlaylist(c.Request.Context(), playlistID, userID, page, limit)
	if err != nil {
		if err.Error() == "playlist not found" {
			c.JSON(http.StatusNotFound, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "NOT_FOUND",
					Message: "Playlist not found",
				},
			})
			return
		}
		if err.Error() == "unauthorized: playlist is private" {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "This playlist is private",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to get playlist",
			},
		})
		return
	}

	// Build pagination metadata
	totalPages := (playlist.ClipCount + limit - 1) / limit
	meta := PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      playlist.ClipCount,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    playlist,
		Meta:    meta,
	})
}

// UpdatePlaylist handles PATCH /api/playlists/:id
func (h *PlaylistHandler) UpdatePlaylist(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse playlist ID
	playlistIDStr := c.Param("id")
	playlistID, err := uuid.Parse(playlistIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid playlist ID",
			},
		})
		return
	}

	// Parse request body
	var req models.UpdatePlaylistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: err.Error(),
			},
		})
		return
	}

	// Update playlist
	playlist, err := h.playlistService.UpdatePlaylist(c.Request.Context(), playlistID, userID, &req)
	if err != nil {
		if err.Error() == "playlist not found" {
			c.JSON(http.StatusNotFound, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "NOT_FOUND",
					Message: "Playlist not found",
				},
			})
			return
		}
		if err.Error() == "unauthorized: user does not own this playlist" {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "You don't have permission to edit this playlist",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to update playlist",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    playlist,
	})
}

// DeletePlaylist handles DELETE /api/playlists/:id
func (h *PlaylistHandler) DeletePlaylist(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse playlist ID
	playlistIDStr := c.Param("id")
	playlistID, err := uuid.Parse(playlistIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid playlist ID",
			},
		})
		return
	}

	// Delete playlist
	err = h.playlistService.DeletePlaylist(c.Request.Context(), playlistID, userID)
	if err != nil {
		if err.Error() == "playlist not found" {
			c.JSON(http.StatusNotFound, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "NOT_FOUND",
					Message: "Playlist not found",
				},
			})
			return
		}
		if err.Error() == "unauthorized: user does not own this playlist" {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "You don't have permission to delete this playlist",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to delete playlist",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: map[string]string{
			"message": "Playlist deleted successfully",
		},
	})
}

// ListUserPlaylists handles GET /api/playlists
func (h *PlaylistHandler) ListUserPlaylists(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// Validate and constrain parameters
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Get user's playlists
	playlists, total, err := h.playlistService.ListUserPlaylists(c.Request.Context(), userID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to list playlists",
			},
		})
		return
	}

	// Build pagination metadata
	totalPages := (total + limit - 1) / limit
	meta := PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    playlists,
		Meta:    meta,
	})
}

// ListPublicPlaylists handles GET /api/playlists/public
func (h *PlaylistHandler) ListPublicPlaylists(c *gin.Context) {
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// Validate and constrain parameters
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Get public playlists
	playlists, total, err := h.playlistService.ListPublicPlaylists(c.Request.Context(), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to list public playlists",
			},
		})
		return
	}

	// Build pagination metadata
	totalPages := (total + limit - 1) / limit
	meta := PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    playlists,
		Meta:    meta,
	})
}

// AddClipsToPlaylist handles POST /api/playlists/:id/clips
func (h *PlaylistHandler) AddClipsToPlaylist(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse playlist ID
	playlistIDStr := c.Param("id")
	playlistID, err := uuid.Parse(playlistIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid playlist ID",
			},
		})
		return
	}

	// Parse request body
	var req models.AddClipsToPlaylistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: err.Error(),
			},
		})
		return
	}

	// Add clips to playlist
	err = h.playlistService.AddClipsToPlaylist(c.Request.Context(), playlistID, userID, req.ClipIDs)
	if err != nil {
		if err.Error() == "playlist not found" {
			c.JSON(http.StatusNotFound, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "NOT_FOUND",
					Message: "Playlist not found",
				},
			})
			return
		}
		if err.Error() == "unauthorized: user does not own this playlist" {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "You don't have permission to edit this playlist",
				},
			})
			return
		}
		if err.Error() == "playlist cannot exceed 1000 clips" {
			c.JSON(http.StatusBadRequest, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "LIMIT_EXCEEDED",
					Message: "Playlist cannot exceed 1000 clips",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to add clips to playlist",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: map[string]string{
			"message": "Clips added to playlist successfully",
		},
	})
}

// RemoveClipFromPlaylist handles DELETE /api/playlists/:id/clips/:clip_id
func (h *PlaylistHandler) RemoveClipFromPlaylist(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse playlist ID
	playlistIDStr := c.Param("id")
	playlistID, err := uuid.Parse(playlistIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid playlist ID",
			},
		})
		return
	}

	// Parse clip ID
	clipIDStr := c.Param("clip_id")
	clipID, err := uuid.Parse(clipIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid clip ID",
			},
		})
		return
	}

	// Remove clip from playlist
	err = h.playlistService.RemoveClipFromPlaylist(c.Request.Context(), playlistID, clipID, userID)
	if err != nil {
		if err.Error() == "playlist not found" {
			c.JSON(http.StatusNotFound, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "NOT_FOUND",
					Message: "Playlist not found",
				},
			})
			return
		}
		if err.Error() == "unauthorized: user does not own this playlist" {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "You don't have permission to edit this playlist",
				},
			})
			return
		}
		if err.Error() == "clip not found in playlist" {
			c.JSON(http.StatusNotFound, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "NOT_FOUND",
					Message: "Clip not found in playlist",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to remove clip from playlist",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: map[string]string{
			"message": "Clip removed from playlist successfully",
		},
	})
}

// ReorderPlaylistClips handles PUT /api/playlists/:id/clips/order
func (h *PlaylistHandler) ReorderPlaylistClips(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse playlist ID
	playlistIDStr := c.Param("id")
	playlistID, err := uuid.Parse(playlistIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid playlist ID",
			},
		})
		return
	}

	// Parse request body
	var req models.ReorderPlaylistClipsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: err.Error(),
			},
		})
		return
	}

	// Reorder clips
	err = h.playlistService.ReorderPlaylistClips(c.Request.Context(), playlistID, userID, req.ClipIDs)
	if err != nil {
		if err.Error() == "playlist not found" {
			c.JSON(http.StatusNotFound, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "NOT_FOUND",
					Message: "Playlist not found",
				},
			})
			return
		}
		if err.Error() == "unauthorized: user does not own this playlist" {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "You don't have permission to edit this playlist",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to reorder clips",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: map[string]string{
			"message": "Clips reordered successfully",
		},
	})
}

// LikePlaylist handles POST /api/playlists/:id/like
func (h *PlaylistHandler) LikePlaylist(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse playlist ID
	playlistIDStr := c.Param("id")
	playlistID, err := uuid.Parse(playlistIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid playlist ID",
			},
		})
		return
	}

	// Like playlist
	err = h.playlistService.LikePlaylist(c.Request.Context(), playlistID, userID)
	if err != nil {
		if err.Error() == "playlist not found" {
			c.JSON(http.StatusNotFound, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "NOT_FOUND",
					Message: "Playlist not found",
				},
			})
			return
		}
		if err.Error() == "cannot like private playlists" {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "Cannot like private playlists",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to like playlist",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: map[string]string{
			"message": "Playlist liked successfully",
		},
	})
}

// UnlikePlaylist handles DELETE /api/playlists/:id/like
func (h *PlaylistHandler) UnlikePlaylist(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Invalid user ID format",
			},
		})
		return
	}

	// Parse playlist ID
	playlistIDStr := c.Param("id")
	playlistID, err := uuid.Parse(playlistIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid playlist ID",
			},
		})
		return
	}

	// Unlike playlist
	err = h.playlistService.UnlikePlaylist(c.Request.Context(), playlistID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to unlike playlist",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: map[string]string{
			"message": "Playlist unliked successfully",
		},
	})
}
