package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lib/pq"
)

// ForumHandler handles forum thread and reply operations
type ForumHandler struct {
	db *pgxpool.Pool
}

// NewForumHandler creates a new ForumHandler
func NewForumHandler(db *pgxpool.Pool) *ForumHandler {
	return &ForumHandler{
		db: db,
	}
}

// ForumThread represents a forum discussion thread
type ForumThread struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	Username    string     `json:"username"`
	Title       string     `json:"title"`
	Content     string     `json:"content"`
	GameID      *uuid.UUID `json:"game_id,omitempty"`
	GameName    *string    `json:"game_name,omitempty"`
	Tags        []string   `json:"tags"`
	ViewCount   int        `json:"view_count"`
	ReplyCount  int        `json:"reply_count"`
	Locked      bool       `json:"locked"`
	LockedAt    *time.Time `json:"locked_at,omitempty"`
	Pinned      bool       `json:"pinned"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ForumReply represents a reply in a forum thread
type ForumReply struct {
	ID            uuid.UUID    `json:"id"`
	UserID        uuid.UUID    `json:"user_id"`
	Username      string       `json:"username"`
	ThreadID      uuid.UUID    `json:"thread_id"`
	ParentReplyID *uuid.UUID   `json:"parent_reply_id,omitempty"`
	Content       string       `json:"content"`
	Depth         int          `json:"depth"`
	Path          string       `json:"path"`
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
	Replies       []ForumReply `json:"replies,omitempty"`
}

// CreateThreadRequest represents the request to create a thread
type CreateThreadRequest struct {
	Title   string   `json:"title" binding:"required,min=3,max=200"`
	Content string   `json:"content" binding:"required,min=10,max=5000"`
	GameID  *string  `json:"game_id"`
	Tags    []string `json:"tags" binding:"max=5"`
}

// CreateThread creates a new forum thread
// POST /api/v1/forum/threads
func (h *ForumHandler) CreateThread(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	var req CreateThreadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	// Validate tags
	for _, tag := range req.Tags {
		if len(tag) > 50 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Tag cannot exceed 50 characters",
			})
			return
		}
	}

	// Parse game_id if provided
	var gameID *uuid.UUID
	if req.GameID != nil && *req.GameID != "" {
		parsedGameID, err := uuid.Parse(*req.GameID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid game_id format",
			})
			return
		}
		gameID = &parsedGameID
	}

	// Insert thread
	threadID := uuid.New()
	query := `
		INSERT INTO forum_threads (id, user_id, title, content, game_id, tags)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at
	`

	var createdAt time.Time
	err := h.db.QueryRow(c.Request.Context(), query,
		threadID, userID, req.Title, req.Content, gameID, pq.Array(req.Tags),
	).Scan(&createdAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create thread",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"id":         threadID,
			"created_at": createdAt,
		},
	})
}

// ListThreads retrieves a list of forum threads with filters
// GET /api/v1/forum/threads?page=1&sort=recent&game_filter=<game_id>&search=<query>
func (h *ForumHandler) ListThreads(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	sort := c.DefaultQuery("sort", "recent") // recent, popular, replies
	gameFilter := c.Query("game_filter")
	searchQuery := c.Query("search")

	// Build query
	queryBuilder := strings.Builder{}
	queryBuilder.WriteString(`
		SELECT 
			ft.id, ft.user_id, u.username, ft.title, ft.content,
			ft.game_id, g.name as game_name, ft.tags, ft.view_count, ft.reply_count,
			ft.locked, ft.locked_at, ft.pinned, ft.created_at, ft.updated_at
		FROM forum_threads ft
		JOIN users u ON ft.user_id = u.id
		LEFT JOIN games g ON ft.game_id = g.id
		WHERE ft.is_deleted = FALSE
	`)

	args := []interface{}{}
	argCount := 1

	// Filter by game
	if gameFilter != "" {
		gameID, err := uuid.Parse(gameFilter)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid game_filter format",
			})
			return
		}
		queryBuilder.WriteString(fmt.Sprintf(" AND ft.game_id = $%d", argCount))
		args = append(args, gameID)
		argCount++
	}

	// Full-text search
	if searchQuery != "" {
		queryBuilder.WriteString(fmt.Sprintf(" AND ft.search_vector @@ plainto_tsquery('english', $%d)", argCount))
		args = append(args, searchQuery)
		argCount++
	}

	// Sorting
	switch sort {
	case "popular":
		queryBuilder.WriteString(" ORDER BY ft.pinned DESC, ft.view_count DESC, ft.created_at DESC")
	case "replies":
		queryBuilder.WriteString(" ORDER BY ft.pinned DESC, ft.reply_count DESC, ft.created_at DESC")
	default: // recent
		queryBuilder.WriteString(" ORDER BY ft.pinned DESC, ft.updated_at DESC")
	}

	queryBuilder.WriteString(fmt.Sprintf(" LIMIT $%d OFFSET $%d", argCount, argCount+1))
	args = append(args, limit, offset)

	rows, err := h.db.Query(c.Request.Context(), queryBuilder.String(), args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve threads",
		})
		return
	}
	defer rows.Close()

	threads := []ForumThread{}
	for rows.Next() {
		var thread ForumThread
		var tags pq.StringArray

		err := rows.Scan(
			&thread.ID, &thread.UserID, &thread.Username, &thread.Title, &thread.Content,
			&thread.GameID, &thread.GameName, &tags, &thread.ViewCount, &thread.ReplyCount,
			&thread.Locked, &thread.LockedAt, &thread.Pinned, &thread.CreatedAt, &thread.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to scan thread",
			})
			return
		}

		thread.Tags = []string(tags)
		if thread.Tags == nil {
			thread.Tags = []string{}
		}
		threads = append(threads, thread)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    threads,
		"meta": gin.H{
			"page":  page,
			"limit": limit,
			"count": len(threads),
		},
	})
}

// GetThread retrieves a specific thread with its full reply tree
// GET /api/v1/forum/threads/:id
func (h *ForumHandler) GetThread(c *gin.Context) {
	threadID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid thread ID",
		})
		return
	}

	// Get thread details
	var thread ForumThread
	var tags pq.StringArray

	query := `
		SELECT 
			ft.id, ft.user_id, u.username, ft.title, ft.content,
			ft.game_id, g.name as game_name, ft.tags, ft.view_count, ft.reply_count,
			ft.locked, ft.locked_at, ft.pinned, ft.created_at, ft.updated_at
		FROM forum_threads ft
		JOIN users u ON ft.user_id = u.id
		LEFT JOIN games g ON ft.game_id = g.id
		WHERE ft.id = $1 AND ft.is_deleted = FALSE
	`

	err = h.db.QueryRow(c.Request.Context(), query, threadID).Scan(
		&thread.ID, &thread.UserID, &thread.Username, &thread.Title, &thread.Content,
		&thread.GameID, &thread.GameName, &tags, &thread.ViewCount, &thread.ReplyCount,
		&thread.Locked, &thread.LockedAt, &thread.Pinned, &thread.CreatedAt, &thread.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Thread not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve thread",
		})
		return
	}

	thread.Tags = []string(tags)
	if thread.Tags == nil {
		thread.Tags = []string{}
	}

	// Increment view count atomically in the database
	// Using UPDATE directly ensures atomic increment without race conditions
	_, err = h.db.Exec(c.Request.Context(), 
		"UPDATE forum_threads SET view_count = view_count + 1 WHERE id = $1", 
		threadID)
	if err != nil {
		// Log the error but don't fail the request
		// View count increment is non-critical
	}

	// Get all replies for the thread using ltree path for efficient hierarchical queries
	replies, err := h.getThreadRepliesHierarchical(c.Request.Context(), threadID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve replies",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"thread":  thread,
			"replies": replies,
		},
	})
}

// getThreadRepliesHierarchical retrieves all replies for a thread in hierarchical structure using ltree
func (h *ForumHandler) getThreadRepliesHierarchical(ctx context.Context, threadID uuid.UUID) ([]ForumReply, error) {
	// Get all replies ordered by path for hierarchical reconstruction
	query := `
		SELECT 
			fr.id, fr.user_id, u.username, fr.thread_id, fr.parent_reply_id,
			fr.content, fr.depth, fr.path::text, fr.created_at, fr.updated_at
		FROM forum_replies fr
		JOIN users u ON fr.user_id = u.id
		WHERE fr.thread_id = $1 AND fr.deleted_at IS NULL
		ORDER BY fr.path
	`

	rows, err := h.db.Query(ctx, query, threadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Map to store replies by ID for building hierarchy
	replyMap := make(map[uuid.UUID]*ForumReply)
	var rootReplies []*ForumReply

	// First pass: create all reply objects and store in map
	var allReplies []*ForumReply
	for rows.Next() {
		var reply ForumReply
		err := rows.Scan(
			&reply.ID, &reply.UserID, &reply.Username, &reply.ThreadID, &reply.ParentReplyID,
			&reply.Content, &reply.Depth, &reply.Path, &reply.CreatedAt, &reply.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		reply.Replies = []ForumReply{}
		replyMap[reply.ID] = &reply
		allReplies = append(allReplies, &reply)
	}

	// Second pass: build hierarchy by connecting children to parents
	for _, reply := range allReplies {
		if reply.ParentReplyID == nil {
			// Root level reply
			rootReplies = append(rootReplies, reply)
		} else {
			// Child reply - add to parent's replies
			if parent, ok := replyMap[*reply.ParentReplyID]; ok {
				parent.Replies = append(parent.Replies, *reply)
			}
			// If parent not found, this is an orphaned reply - skip it
		}
	}

	// Convert pointer slice to value slice for root replies
	result := make([]ForumReply, len(rootReplies))
	for i, reply := range rootReplies {
		result[i] = *reply
	}

	return result, nil
}

// CreateReplyRequest represents the request to create a reply
type CreateReplyRequest struct {
	Content       string  `json:"content" binding:"required,min=1,max=3000"`
	ParentReplyID *string `json:"parent_reply_id"`
}

// CreateReply creates a new reply to a thread or another reply
// POST /api/v1/forum/threads/:id/replies
func (h *ForumHandler) CreateReply(c *gin.Context) {
	threadID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid thread ID",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	var req CreateReplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	tx, err := h.db.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to start transaction",
		})
		return
	}
	defer tx.Rollback(c.Request.Context())

	// Check if thread exists and is not locked
	var isLocked bool
	var isDeleted bool
	err = tx.QueryRow(c.Request.Context(),
		`SELECT locked, is_deleted FROM forum_threads WHERE id = $1`,
		threadID).Scan(&isLocked, &isDeleted)

	if err != nil {
		if err == pgx.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Thread not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to check thread status",
		})
		return
	}

	if isDeleted {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Thread not found",
		})
		return
	}

	if isLocked {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Thread is locked",
		})
		return
	}

	// Determine depth and path
	var depth int
	var path string
	replyID := uuid.New()
	// Use full UUID string for ltree path to avoid collisions
	// Replace hyphens with underscores as ltree doesn't support hyphens
	replyIDForPath := strings.ReplaceAll(replyID.String(), "-", "_")

	var parentReplyID *uuid.UUID
	if req.ParentReplyID != nil && *req.ParentReplyID != "" {
		parsedParentID, err := uuid.Parse(*req.ParentReplyID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid parent_reply_id format",
			})
			return
		}
		parentReplyID = &parsedParentID

		// Get parent's depth and path
		var parentDepth int
		var parentPath string
		err = tx.QueryRow(c.Request.Context(),
			`SELECT depth, path::text FROM forum_replies 
			 WHERE id = $1 AND thread_id = $2 AND deleted_at IS NULL`,
			parentReplyID, threadID).Scan(&parentDepth, &parentPath)

		if err != nil {
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{
					"error": "Parent reply not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to get parent reply",
			})
			return
		}

		// Check depth limit
		if parentDepth >= 10 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Maximum nesting depth (10 levels) reached",
			})
			return
		}

		depth = parentDepth + 1
		path = fmt.Sprintf("%s.%s", parentPath, replyIDForPath)
	} else {
		// Root level reply
		depth = 0
		path = replyIDForPath
	}

	// Insert reply
	query := `
		INSERT INTO forum_replies (id, user_id, thread_id, parent_reply_id, content, depth, path)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at
	`

	var createdAt time.Time
	err = tx.QueryRow(c.Request.Context(), query,
		replyID, userID, threadID, parentReplyID, req.Content, depth, path,
	).Scan(&createdAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create reply",
		})
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to commit transaction",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"id":         replyID,
			"depth":      depth,
			"path":       path,
			"created_at": createdAt,
		},
	})
}

// UpdateReplyRequest represents the request to update a reply
type UpdateReplyRequest struct {
	Content string `json:"content" binding:"required,min=1,max=3000"`
}

// UpdateReply updates an existing reply
// PATCH /api/v1/forum/replies/:id
func (h *ForumHandler) UpdateReply(c *gin.Context) {
	replyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid reply ID",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	var req UpdateReplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	// Check ownership and update
	result, err := h.db.Exec(c.Request.Context(),
		`UPDATE forum_replies 
		 SET content = $1, updated_at = NOW()
		 WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL`,
		req.Content, replyID, userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update reply",
		})
		return
	}

	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Reply not found or you don't have permission to edit it",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Reply updated successfully",
	})
}

// DeleteReply soft deletes a reply
// DELETE /api/v1/forum/replies/:id
func (h *ForumHandler) DeleteReply(c *gin.Context) {
	replyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid reply ID",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	// Soft delete by setting deleted_at timestamp
	result, err := h.db.Exec(c.Request.Context(),
		`UPDATE forum_replies 
		 SET deleted_at = NOW(), updated_at = NOW()
		 WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
		replyID, userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete reply",
		})
		return
	}

	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Reply not found or you don't have permission to delete it",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Reply deleted successfully",
	})
}

// SearchThreads performs full-text search on threads and replies
// GET /api/v1/forum/search?q=<query>&page=1
func (h *ForumHandler) SearchThreads(c *gin.Context) {
	searchQuery := c.Query("q")
	if searchQuery == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Search query is required",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	// Search in threads
	query := `
		SELECT 
			ft.id, ft.user_id, u.username, ft.title, ft.content,
			ft.game_id, g.name as game_name, ft.tags, ft.view_count, ft.reply_count,
			ft.locked, ft.locked_at, ft.pinned, ft.created_at, ft.updated_at,
			ts_rank(ft.search_vector, plainto_tsquery('english', $1)) as rank
		FROM forum_threads ft
		JOIN users u ON ft.user_id = u.id
		LEFT JOIN games g ON ft.game_id = g.id
		WHERE ft.is_deleted = FALSE
			AND ft.search_vector @@ plainto_tsquery('english', $1)
		ORDER BY rank DESC, ft.created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := h.db.Query(c.Request.Context(), query, searchQuery, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to search threads",
		})
		return
	}
	defer rows.Close()

	threads := []ForumThread{}
	for rows.Next() {
		var thread ForumThread
		var tags pq.StringArray
		var rank float64

		err := rows.Scan(
			&thread.ID, &thread.UserID, &thread.Username, &thread.Title, &thread.Content,
			&thread.GameID, &thread.GameName, &tags, &thread.ViewCount, &thread.ReplyCount,
			&thread.Locked, &thread.LockedAt, &thread.Pinned, &thread.CreatedAt, &thread.UpdatedAt,
			&rank,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to scan thread",
			})
			return
		}

		thread.Tags = []string(tags)
		if thread.Tags == nil {
			thread.Tags = []string{}
		}
		threads = append(threads, thread)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    threads,
		"meta": gin.H{
			"page":  page,
			"limit": limit,
			"query": searchQuery,
			"count": len(threads),
		},
	})
}
