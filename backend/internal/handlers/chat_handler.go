package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

// ChatHandler handles chat-related requests
type ChatHandler struct {
	db *pgxpool.Pool
}

// NewChatHandler creates a new chat handler
func NewChatHandler(db *pgxpool.Pool) *ChatHandler {
	return &ChatHandler{
		db: db,
	}
}

// BanUser bans a user from a channel
func (h *ChatHandler) BanUser(c *gin.Context) {
	channelID := c.Param("id")
	if _, err := uuid.Parse(channelID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	moderatorID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.BanUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate expiration time if duration is provided
	var expiresAt *time.Time
	if req.DurationMinutes != nil {
		expires := time.Now().Add(time.Duration(*req.DurationMinutes) * time.Minute)
		expiresAt = &expires
	}

	// Insert or update ban record
	query := `
		INSERT INTO chat_bans (channel_id, user_id, banned_by, reason, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (channel_id, user_id) 
		DO UPDATE SET 
			reason = EXCLUDED.reason,
			expires_at = EXCLUDED.expires_at,
			banned_by = EXCLUDED.banned_by,
			created_at = NOW()
		RETURNING id`

	var banID uuid.UUID
	err := h.db.QueryRow(c.Request.Context(), query,
		channelID, req.UserID, moderatorID, req.Reason, expiresAt).Scan(&banID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to ban user"})
		return
	}

	// Log the moderation action
	logQuery := `
		INSERT INTO chat_moderation_log (channel_id, moderator_id, target_user_id, action, reason, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)`

	metadata, _ := json.Marshal(map[string]interface{}{
		"duration_minutes": req.DurationMinutes,
		"expires_at":       expiresAt,
	})

	_, err = h.db.Exec(c.Request.Context(), logQuery,
		channelID, moderatorID, req.UserID, models.ChatActionBan, req.Reason, metadata)
	if err != nil {
		// Log error but don't fail the request
		_ = err
	}

	c.JSON(http.StatusOK, gin.H{
		"status":     "banned",
		"ban_id":     banID,
		"expires_at": expiresAt,
	})
}

// UnbanUser removes a ban from a user
func (h *ChatHandler) UnbanUser(c *gin.Context) {
	channelID := c.Param("id")
	userID := c.Param("user_id")

	if _, err := uuid.Parse(channelID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	if _, err := uuid.Parse(userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	moderatorID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Delete the ban
	query := `DELETE FROM chat_bans WHERE channel_id = $1 AND user_id = $2`
	result, err := h.db.Exec(c.Request.Context(), query, channelID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unban user"})
		return
	}

	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ban not found"})
		return
	}

	// Log the moderation action
	logQuery := `
		INSERT INTO chat_moderation_log (channel_id, moderator_id, target_user_id, action, reason)
		VALUES ($1, $2, $3, $4, $5)`

	_, err = h.db.Exec(c.Request.Context(), logQuery,
		channelID, moderatorID, userID, models.ChatActionUnban, "Manual unban")
	if err != nil {
		// Log error but don't fail the request
		_ = err
	}

	c.JSON(http.StatusOK, gin.H{"status": "unbanned"})
}

// MuteUser mutes a user in a channel (implemented similar to ban)
func (h *ChatHandler) MuteUser(c *gin.Context) {
	channelID := c.Param("id")
	if _, err := uuid.Parse(channelID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	moderatorID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.MuteUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate expiration time if duration is provided
	var expiresAt *time.Time
	if req.DurationMinutes != nil {
		expires := time.Now().Add(time.Duration(*req.DurationMinutes) * time.Minute)
		expiresAt = &expires
	}

	// Use same table as bans but with different action type in log
	query := `
		INSERT INTO chat_bans (channel_id, user_id, banned_by, reason, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (channel_id, user_id) 
		DO UPDATE SET 
			reason = EXCLUDED.reason,
			expires_at = EXCLUDED.expires_at,
			banned_by = EXCLUDED.banned_by,
			created_at = NOW()
		RETURNING id`

	var muteID uuid.UUID
	err := h.db.QueryRow(c.Request.Context(), query,
		channelID, req.UserID, moderatorID, req.Reason, expiresAt).Scan(&muteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mute user"})
		return
	}

	// Log the moderation action
	logQuery := `
		INSERT INTO chat_moderation_log (channel_id, moderator_id, target_user_id, action, reason, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)`

	metadata, _ := json.Marshal(map[string]interface{}{
		"duration_minutes": req.DurationMinutes,
		"expires_at":       expiresAt,
	})

	_, err = h.db.Exec(c.Request.Context(), logQuery,
		channelID, moderatorID, req.UserID, models.ChatActionMute, req.Reason, metadata)
	if err != nil {
		// Log error but don't fail the request
		_ = err
	}

	c.JSON(http.StatusOK, gin.H{
		"status":     "muted",
		"mute_id":    muteID,
		"expires_at": expiresAt,
	})
}

// TimeoutUser temporarily bans a user from a channel
func (h *ChatHandler) TimeoutUser(c *gin.Context) {
	channelID := c.Param("id")
	if _, err := uuid.Parse(channelID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	moderatorID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.TimeoutUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate expiration time
	expiresAt := time.Now().Add(time.Duration(req.DurationMinutes) * time.Minute)

	// Insert or update timeout
	query := `
		INSERT INTO chat_bans (channel_id, user_id, banned_by, reason, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (channel_id, user_id) 
		DO UPDATE SET 
			reason = EXCLUDED.reason,
			expires_at = EXCLUDED.expires_at,
			banned_by = EXCLUDED.banned_by,
			created_at = NOW()
		RETURNING id`

	var timeoutID uuid.UUID
	err := h.db.QueryRow(c.Request.Context(), query,
		channelID, req.UserID, moderatorID, req.Reason, expiresAt).Scan(&timeoutID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to timeout user"})
		return
	}

	// Log the moderation action
	logQuery := `
		INSERT INTO chat_moderation_log (channel_id, moderator_id, target_user_id, action, reason, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)`

	metadata, _ := json.Marshal(map[string]interface{}{
		"duration_minutes": req.DurationMinutes,
		"expires_at":       expiresAt,
	})

	_, err = h.db.Exec(c.Request.Context(), logQuery,
		channelID, moderatorID, req.UserID, models.ChatActionTimeout, req.Reason, metadata)
	if err != nil {
		// Log error but don't fail the request
		_ = err
	}

	c.JSON(http.StatusOK, gin.H{
		"status":     "timed_out",
		"timeout_id": timeoutID,
		"expires_at": expiresAt,
	})
}

// DeleteMessage deletes a message from a channel
func (h *ChatHandler) DeleteMessage(c *gin.Context) {
	messageID := c.Param("id")
	if _, err := uuid.Parse(messageID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	moderatorID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.DeleteMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Reason is optional, so ignore binding errors
		req.Reason = ""
	}

	// Get message details before deleting
	var msg models.ChatMessage
	msgQuery := `SELECT id, channel_id, user_id, content FROM chat_messages WHERE id = $1 AND is_deleted = false`
	err := h.db.QueryRow(c.Request.Context(), msgQuery, messageID).Scan(
		&msg.ID, &msg.ChannelID, &msg.UserID, &msg.Content)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found or already deleted"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch message"})
		return
	}

	// Mark message as deleted
	now := time.Now()
	modID := moderatorID.(uuid.UUID)
	deleteQuery := `
		UPDATE chat_messages 
		SET is_deleted = true, deleted_at = $1, deleted_by = $2, updated_at = $1
		WHERE id = $3`

	_, err = h.db.Exec(c.Request.Context(), deleteQuery, now, modID, messageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete message"})
		return
	}

	// Log the moderation action
	logQuery := `
		INSERT INTO chat_moderation_log (channel_id, moderator_id, target_user_id, action, reason, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)`

	metadata, _ := json.Marshal(map[string]interface{}{
		"message_id":      messageID,
		"message_content": msg.Content,
	})

	_, err = h.db.Exec(c.Request.Context(), logQuery,
		msg.ChannelID, moderatorID, msg.UserID, models.ChatActionDelete, req.Reason, metadata)
	if err != nil {
		// Log error but don't fail the request
		_ = err
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// GetModerationLog retrieves the moderation log for a channel
func (h *ChatHandler) GetModerationLog(c *gin.Context) {
	channelID := c.Param("id")
	if _, err := uuid.Parse(channelID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	// Parse pagination parameters
	page := 1
	limit := 50
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	offset := (page - 1) * limit

	query := `
		SELECT 
			l.id, l.channel_id, l.moderator_id, l.target_user_id, 
			l.action, l.reason, l.metadata, l.created_at,
			m.username as moderator_username,
			t.username as target_username
		FROM chat_moderation_log l
		JOIN users m ON l.moderator_id = m.id
		LEFT JOIN users t ON l.target_user_id = t.id
		WHERE l.channel_id = $1
		ORDER BY l.created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := h.db.Query(c.Request.Context(), query, channelID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch moderation log"})
		return
	}
	defer rows.Close()

	var logs []models.ChatModerationLog
	for rows.Next() {
		var log models.ChatModerationLog
		err := rows.Scan(
			&log.ID, &log.ChannelID, &log.ModeratorID, &log.TargetUserID,
			&log.Action, &log.Reason, &log.Metadata, &log.CreatedAt,
			&log.ModeratorUsername, &log.TargetUsername,
		)
		if err != nil {
			continue
		}
		logs = append(logs, log)
	}

	// Get total count for pagination
	var total int
	countQuery := `SELECT COUNT(*) FROM chat_moderation_log WHERE channel_id = $1`
	_ = h.db.QueryRow(c.Request.Context(), countQuery, channelID).Scan(&total)

	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// CheckUserBan checks if a user is banned in a channel
func (h *ChatHandler) CheckUserBan(c *gin.Context) {
	channelID := c.Param("id")
	userID := c.Query("user_id")

	if _, err := uuid.Parse(channelID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	if _, err := uuid.Parse(userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	query := `
		SELECT id, expires_at, reason
		FROM chat_bans 
		WHERE channel_id = $1 AND user_id = $2 
		AND (expires_at IS NULL OR expires_at > NOW())`

	var ban models.ChatBan
	err := h.db.QueryRow(c.Request.Context(), query, channelID, userID).Scan(
		&ban.ID, &ban.ExpiresAt, &ban.Reason)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"is_banned": false})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check ban status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"is_banned":  true,
		"ban_id":     ban.ID,
		"expires_at": ban.ExpiresAt,
		"reason":     ban.Reason,
	})
}
