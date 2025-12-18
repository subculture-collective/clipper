package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
)

// WatchPartyHandler handles watch party requests
type WatchPartyHandler struct {
	watchPartyService *services.WatchPartyService
	hubManager        *services.WatchPartyHubManager
	watchPartyRepo    *repository.WatchPartyRepository
	upgrader          websocket.Upgrader
	allowedOrigins    map[string]bool
}

// NewWatchPartyHandler creates a new WatchPartyHandler
func NewWatchPartyHandler(
	watchPartyService *services.WatchPartyService,
	hubManager *services.WatchPartyHubManager,
	watchPartyRepo *repository.WatchPartyRepository,
	cfg *config.Config,
) *WatchPartyHandler {
	// Parse allowed origins from config
	allowedOrigins := make(map[string]bool)
	if cfg.CORS.AllowedOrigins != "" {
		origins := strings.Split(cfg.CORS.AllowedOrigins, ",")
		for _, origin := range origins {
			allowedOrigins[strings.TrimSpace(origin)] = true
		}
	}

	handler := &WatchPartyHandler{
		watchPartyService: watchPartyService,
		hubManager:        hubManager,
		watchPartyRepo:    watchPartyRepo,
		allowedOrigins:    allowedOrigins,
	}

	// Initialize upgrader with proper origin checking
	handler.upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			// Allow requests with no origin (e.g., same-origin requests)
			if origin == "" {
				return true
			}
			// Check if origin is in allowed list
			return handler.allowedOrigins[origin]
		},
	}

	return handler
}

// CreateWatchParty handles POST /api/v1/watch-parties
func (h *WatchPartyHandler) CreateWatchParty(c *gin.Context) {
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
	var req models.CreateWatchPartyRequest
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

	// Create watch party
	party, err := h.watchPartyService.CreateWatchParty(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to create watch party",
			},
		})
		return
	}

	// Generate invite URL
	inviteURL := h.watchPartyService.GetInviteURL(party.InviteCode)

	c.JSON(http.StatusCreated, StandardResponse{
		Success: true,
		Data: gin.H{
			"id":          party.ID,
			"invite_code": party.InviteCode,
			"invite_url":  inviteURL,
			"party":       party,
		},
	})
}

// JoinWatchParty handles POST /api/v1/watch-parties/:code/join
func (h *WatchPartyHandler) JoinWatchParty(c *gin.Context) {
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

	// Get invite code from URL
	inviteCode := c.Param("code")
	if inviteCode == "" {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invite code is required",
			},
		})
		return
	}

	// Join watch party
	party, err := h.watchPartyService.JoinWatchParty(c.Request.Context(), inviteCode, userID)
	if err != nil {
		statusCode := http.StatusInternalServerError
		errorCode := "INTERNAL_ERROR"
		errorMessage := "Failed to join watch party"

		if err.Error() == "watch party not found or has ended" {
			statusCode = http.StatusNotFound
			errorCode = "NOT_FOUND"
			errorMessage = err.Error()
		} else if strings.HasPrefix(err.Error(), "party is full") {
			statusCode = http.StatusForbidden
			errorCode = "PARTY_FULL"
			errorMessage = err.Error()
		}

		c.JSON(statusCode, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    errorCode,
				Message: errorMessage,
			},
		})
		return
	}

	inviteURL := h.watchPartyService.GetInviteURL(party.InviteCode)

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"party":      party,
			"invite_url": inviteURL,
		},
	})
}

// GetWatchParty handles GET /api/v1/watch-parties/:id
func (h *WatchPartyHandler) GetWatchParty(c *gin.Context) {
	// Parse party ID
	partyIDStr := c.Param("id")
	partyID, err := uuid.Parse(partyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid party ID",
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

	// Get watch party
	party, err := h.watchPartyService.GetWatchParty(c.Request.Context(), partyID, userID)
	if err != nil {
		statusCode := http.StatusInternalServerError
		errorCode := "INTERNAL_ERROR"
		errorMessage := "Failed to get watch party"

		if err.Error() == "watch party not found" {
			statusCode = http.StatusNotFound
			errorCode = "NOT_FOUND"
			errorMessage = err.Error()
		} else if strings.HasPrefix(err.Error(), "unauthorized:") {
			statusCode = http.StatusForbidden
			errorCode = "FORBIDDEN"
			errorMessage = err.Error()
		}

		c.JSON(statusCode, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    errorCode,
				Message: errorMessage,
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    party,
	})
}

// GetParticipants handles GET /api/v1/watch-parties/:id/participants
func (h *WatchPartyHandler) GetParticipants(c *gin.Context) {
	// Parse party ID
	partyIDStr := c.Param("id")
	partyID, err := uuid.Parse(partyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid party ID",
			},
		})
		return
	}

	// Get optional user ID from context for visibility check
	var userID *uuid.UUID
	if userIDVal, exists := c.Get("user_id"); exists {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			userID = &uid
		}
	}

	// Get party to check visibility
	party, err := h.watchPartyRepo.GetByID(c.Request.Context(), partyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to get watch party",
			},
		})
		return
	}

	if party == nil {
		c.JSON(http.StatusNotFound, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "NOT_FOUND",
				Message: "Watch party not found",
			},
		})
		return
	}

	// Check visibility permissions for private parties
	if party.Visibility == "private" {
		if userID == nil {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "Cannot view participants of private party without authentication",
				},
			})
			return
		}
		// Check if user is a participant
		participant, err := h.watchPartyRepo.GetParticipant(c.Request.Context(), partyID, *userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "INTERNAL_ERROR",
					Message: "Failed to verify participant status",
				},
			})
			return
		}
		if participant == nil || participant.LeftAt != nil {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "Not a participant of this private party",
				},
			})
			return
		}
	}

	// Get participants
	participants, err := h.watchPartyRepo.GetActiveParticipants(c.Request.Context(), partyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to get participants",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"participants": participants,
			"count":        len(participants),
		},
	})
}

// LeaveWatchParty handles DELETE /api/v1/watch-parties/:id/leave
func (h *WatchPartyHandler) LeaveWatchParty(c *gin.Context) {
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

	// Parse party ID
	partyIDStr := c.Param("id")
	partyID, err := uuid.Parse(partyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid party ID",
			},
		})
		return
	}

	// Leave watch party
	err = h.watchPartyService.LeaveWatchParty(c.Request.Context(), partyID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to leave watch party",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"message": "Successfully left watch party",
		},
	})
}

// EndWatchParty handles POST /api/v1/watch-parties/:id/end
func (h *WatchPartyHandler) EndWatchParty(c *gin.Context) {
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

	// Parse party ID
	partyIDStr := c.Param("id")
	partyID, err := uuid.Parse(partyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid party ID",
			},
		})
		return
	}

	// End watch party
	err = h.watchPartyService.EndWatchParty(c.Request.Context(), partyID, userID)
	if err != nil {
		statusCode := http.StatusInternalServerError
		errorCode := "INTERNAL_ERROR"

		if strings.HasPrefix(err.Error(), "unauthorized:") {
			statusCode = http.StatusForbidden
			errorCode = "FORBIDDEN"
		}

		c.JSON(statusCode, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    errorCode,
				Message: err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"message": "Watch party ended successfully",
		},
	})
}

// WatchPartyWebSocket handles WebSocket connections for watch party sync
func (h *WatchPartyHandler) WatchPartyWebSocket(c *gin.Context) {
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

	// Parse party ID
	partyIDStr := c.Param("id")
	partyID, err := uuid.Parse(partyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid party ID",
			},
		})
		return
	}

	// Verify user is a participant
	participant, err := h.watchPartyRepo.GetParticipant(c.Request.Context(), partyID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to verify participant",
			},
		})
		return
	}

	if participant == nil || participant.LeftAt != nil {
		c.JSON(http.StatusForbidden, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "FORBIDDEN",
				Message: "Not a participant of this watch party",
			},
		})
		return
	}

	// Upgrade to WebSocket
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	// Get or create hub for this party
	hub := h.hubManager.GetOrCreateHub(partyID)

	// Create a context for the WebSocket lifetime that's independent of the HTTP request
	// This allows the WebSocket to outlive the initial HTTP request
	wsCtx := context.Background()

	// Create client
	client := &services.WatchPartyClient{
		Hub:    hub,
		Conn:   conn,
		UserID: userID,
		Role:   participant.Role,
		Send:   make(chan []byte, 256),
		User:   participant.User,
	}

	// Register client with hub
	hub.Register <- client

	// Start client pumps with WebSocket context
	go client.WritePump()
	go client.ReadPump(wsCtx)
}

// SendMessage handles POST /api/v1/watch-parties/:id/messages
func (h *WatchPartyHandler) SendMessage(c *gin.Context) {
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

	// Parse party ID
	partyIDStr := c.Param("id")
	partyID, err := uuid.Parse(partyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid party ID",
			},
		})
		return
	}

	// Verify user is a participant
	participant, err := h.watchPartyRepo.GetParticipant(c.Request.Context(), partyID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to verify participant",
			},
		})
		return
	}

	if participant == nil || participant.LeftAt != nil {
		c.JSON(http.StatusForbidden, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "FORBIDDEN",
				Message: "Not a participant of this watch party",
			},
		})
		return
	}

	// Parse request body
	var req models.SendMessageRequest
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

	// Create message
	message := &models.WatchPartyMessage{
		ID:           uuid.New(),
		WatchPartyID: partyID,
		UserID:       userID,
		Message:      req.Message,
	}

	err = h.watchPartyRepo.CreateMessage(c.Request.Context(), message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to create message",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, StandardResponse{
		Success: true,
		Data:    message,
	})
}

// GetMessages handles GET /api/v1/watch-parties/:id/messages
func (h *WatchPartyHandler) GetMessages(c *gin.Context) {
	// Parse party ID
	partyIDStr := c.Param("id")
	partyID, err := uuid.Parse(partyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid party ID",
			},
		})
		return
	}

	// Get optional user ID from context for visibility check
	var userID *uuid.UUID
	if userIDVal, exists := c.Get("user_id"); exists {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			userID = &uid
		}
	}

	// Get party to check visibility
	party, err := h.watchPartyRepo.GetByID(c.Request.Context(), partyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to get watch party",
			},
		})
		return
	}

	if party == nil {
		c.JSON(http.StatusNotFound, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "NOT_FOUND",
				Message: "Watch party not found",
			},
		})
		return
	}

	// Check visibility permissions for private parties
	if party.Visibility == "private" {
		if userID == nil {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "Cannot view messages of private party without authentication",
				},
			})
			return
		}
		// Check if user is a participant
		participant, err := h.watchPartyRepo.GetParticipant(c.Request.Context(), partyID, *userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "INTERNAL_ERROR",
					Message: "Failed to verify participant status",
				},
			})
			return
		}
		if participant == nil || participant.LeftAt != nil {
			c.JSON(http.StatusForbidden, StandardResponse{
				Success: false,
				Error: &ErrorInfo{
					Code:    "FORBIDDEN",
					Message: "Not a participant of this private party",
				},
			})
			return
		}
	}

	// Get messages (last 100)
	messages, err := h.watchPartyRepo.GetMessages(c.Request.Context(), partyID, 100)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to get messages",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"messages": messages,
			"count":    len(messages),
		},
	})
}

// SendReaction handles POST /api/v1/watch-parties/:id/react
func (h *WatchPartyHandler) SendReaction(c *gin.Context) {
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

	// Parse party ID
	partyIDStr := c.Param("id")
	partyID, err := uuid.Parse(partyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid party ID",
			},
		})
		return
	}

	// Verify user is a participant
	participant, err := h.watchPartyRepo.GetParticipant(c.Request.Context(), partyID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to verify participant",
			},
		})
		return
	}

	if participant == nil || participant.LeftAt != nil {
		c.JSON(http.StatusForbidden, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "FORBIDDEN",
				Message: "Not a participant of this watch party",
			},
		})
		return
	}

	// Parse request body
	var req models.SendReactionRequest
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

	// Create reaction
	reaction := &models.WatchPartyReaction{
		ID:             uuid.New(),
		WatchPartyID:   partyID,
		UserID:         userID,
		Emoji:          req.Emoji,
		VideoTimestamp: req.VideoTimestamp,
	}

	err = h.watchPartyRepo.CreateReaction(c.Request.Context(), reaction)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to create reaction",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, StandardResponse{
		Success: true,
		Data:    reaction,
	})
}
