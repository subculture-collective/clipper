package websocket

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"golang.org/x/time/rate"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait
	pingPeriod = 54 * time.Second

	// Maximum message size allowed from peer
	maxMessageSize = 4096
)

// NewChatClient creates a new chat client
func NewChatClient(hub *ChannelHub, conn *websocket.Conn, userID uuid.UUID, username string) *ChatClient {
	return &ChatClient{
		Hub:       hub,
		Conn:      conn,
		UserID:    userID,
		Username:  username,
		Send:      make(chan []byte, 256),
		RateLimit: rate.NewLimiter(rate.Limit(10.0/60.0), 1), // 10 messages per minute
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *ChatClient) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		var msg ClientMessage
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: user_id=%s, error=%v", c.UserID, err)
			}
			break
		}

		c.handleMessage(&msg)
	}
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *ChatClient) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming messages from the client
func (c *ChatClient) handleMessage(msg *ClientMessage) {
	switch msg.Type {
	case MessageTypeMessage:
		c.handleChatMessage(msg)
	case MessageTypeTyping:
		c.handleTypingIndicator(msg)
	default:
		// Unknown message type
		c.sendError("Unknown message type")
	}
}

// handleChatMessage processes a chat message
func (c *ChatClient) handleChatMessage(msg *ClientMessage) {
	// Check if DB is available (skip if in test mode)
	if c.Hub.DB == nil {
		c.sendError("Database not available")
		return
	}

	// Check rate limit
	if !c.RateLimit.Allow() {
		c.sendError("Rate limit exceeded. Maximum 10 messages per minute.")
		return
	}

	// Validate message
	if msg.Content == nil || *msg.Content == "" {
		c.sendError("Message content cannot be empty")
		return
	}

	if len(*msg.Content) > maxMessageSize {
		c.sendError("Message content exceeds maximum size")
		return
	}

	// Generate message ID if not provided
	messageID := uuid.New()
	if msg.MessageID != nil {
		// Use client-provided ID for deduplication
		parsedID, err := uuid.Parse(*msg.MessageID)
		if err == nil {
			messageID = parsedID
		}
	}

	channelUUID, err := uuid.Parse(msg.ChannelID)
	if err != nil {
		c.sendError("Invalid channel ID")
		return
	}

	// Save message to database
	now := time.Now()
	query := `
		INSERT INTO chat_messages (id, channel_id, user_id, content, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO NOTHING
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	
	_, err = c.Hub.DB.Exec(ctx,
		query, messageID, channelUUID, c.UserID, *msg.Content, now, now)
	if err != nil {
		log.Printf("Failed to save message to database: %v", err)
		c.sendError("Failed to save message")
		return
	}

	// Broadcast message to all clients
	messageIDStr := messageID.String()
	userIDStr := c.UserID.String()

	// Fetch user details for the broadcast (use fresh context)
	var displayName string
	var avatarURL *string
	userQuery := `SELECT display_name, avatar_url FROM users WHERE id = $1`
	userCtx, userCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer userCancel()
	
	err = c.Hub.DB.QueryRow(userCtx, userQuery, c.UserID).Scan(&displayName, &avatarURL)
	if err != nil {
		displayName = c.Username
	}

	serverMsg := ServerMessage{
		Type:        MessageTypeMessage,
		ChannelID:   msg.ChannelID,
		UserID:      &userIDStr,
		Username:    &c.Username,
		DisplayName: &displayName,
		AvatarURL:   avatarURL,
		Content:     msg.Content,
		MessageID:   &messageIDStr,
		Timestamp:   &now,
	}

	data, err := json.Marshal(serverMsg)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return
	}

	c.Hub.Broadcast <- data
}

// handleTypingIndicator processes a typing indicator
func (c *ChatClient) handleTypingIndicator(msg *ClientMessage) {
	// Typing indicators are not persisted, just broadcasted
	userIDStr := c.UserID.String()
	serverMsg := ServerMessage{
		Type:      MessageTypeTyping,
		ChannelID: msg.ChannelID,
		UserID:    &userIDStr,
		Username:  &c.Username,
		Timestamp: timePtr(time.Now()),
	}

	data, err := json.Marshal(serverMsg)
	if err != nil {
		log.Printf("Failed to marshal typing indicator: %v", err)
		return
	}

	// Broadcast directly to local clients only (no Redis pub/sub for typing)
	c.Hub.broadcastToClients(data)
}

// sendError sends an error message to the client
func (c *ChatClient) sendError(errorMsg string) {
	serverMsg := ServerMessage{
		Type:      MessageTypeError,
		ChannelID: c.Hub.ID,
		Error:     &errorMsg,
		Timestamp: timePtr(time.Now()),
	}

	data, err := json.Marshal(serverMsg)
	if err != nil {
		log.Printf("Failed to marshal error message: %v", err)
		return
	}

	select {
	case c.Send <- data:
	default:
		// Send channel is full, client might be slow
	}
}
