package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// ChannelHub maintains the set of active clients and broadcasts messages to them
type ChannelHub struct {
	ID         string
	Clients    map[*ChatClient]bool
	Broadcast  chan []byte
	Register   chan *ChatClient
	Unregister chan *ChatClient
	Mutex      sync.RWMutex
	DB         *pgxpool.Pool
	Redis      *redis.Client
	Stop       chan struct{}
}

// NewChannelHub creates a new channel hub
func NewChannelHub(channelID string, db *pgxpool.Pool, redisClient *redis.Client) *ChannelHub {
	return &ChannelHub{
		ID:         channelID,
		Clients:    make(map[*ChatClient]bool),
		Broadcast:  make(chan []byte, 256),
		Register:   make(chan *ChatClient),
		Unregister: make(chan *ChatClient),
		DB:         db,
		Redis:      redisClient,
		Stop:       make(chan struct{}),
	}
}

// Run starts the hub's main loop
func (h *ChannelHub) Run() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Subscribe to Redis pub/sub for this channel
	ctx := context.Background()
	pubsub := h.Redis.Subscribe(ctx, fmt.Sprintf("chat:%s", h.ID))
	defer pubsub.Close()

	// Start Redis subscriber in a separate goroutine
	redisChan := pubsub.Channel()

	for {
		select {
		case client := <-h.Register:
			h.handleRegister(client)

		case client := <-h.Unregister:
			h.handleUnregister(client)

		case message := <-h.Broadcast:
			h.handleBroadcast(message)

		case redisMsg := <-redisChan:
			// Received message from Redis pub/sub (from another instance)
			h.broadcastToClients([]byte(redisMsg.Payload))

		case <-ticker.C:
			// Periodic health check (can be used for monitoring)

		case <-h.Stop:
			// Graceful shutdown
			h.shutdown()
			return
		}
	}
}

// handleRegister registers a new client
func (h *ChannelHub) handleRegister(client *ChatClient) {
	h.Mutex.Lock()
	h.Clients[client] = true
	h.Mutex.Unlock()

	log.Printf("Client registered: user_id=%s, channel=%s, total_clients=%d",
		client.UserID, h.ID, len(h.Clients))

	// Broadcast user joined presence
	userIDStr := client.UserID.String()
	presenceType := PresenceTypeJoined
	presence := ServerMessage{
		Type:         MessageTypePresence,
		ChannelID:    h.ID,
		UserID:       &userIDStr,
		Username:     &client.Username,
		PresenceType: &presenceType,
		Timestamp:    timePtr(time.Now()),
	}

	data, err := json.Marshal(presence)
	if err == nil {
		h.Broadcast <- data
	}

	// Send message history to new client
	go h.sendMessageHistory(client)
}

// handleUnregister unregisters a client
func (h *ChannelHub) handleUnregister(client *ChatClient) {
	h.Mutex.Lock()
	if _, ok := h.Clients[client]; ok {
		delete(h.Clients, client)
		close(client.Send)
	}
	h.Mutex.Unlock()

	log.Printf("Client unregistered: user_id=%s, channel=%s, total_clients=%d",
		client.UserID, h.ID, len(h.Clients))

	// Broadcast user left presence
	userIDStr := client.UserID.String()
	presenceType := PresenceTypeLeft
	presence := ServerMessage{
		Type:         MessageTypePresence,
		ChannelID:    h.ID,
		UserID:       &userIDStr,
		Username:     &client.Username,
		PresenceType: &presenceType,
		Timestamp:    timePtr(time.Now()),
	}

	data, err := json.Marshal(presence)
	if err == nil {
		h.Broadcast <- data
	}
}

// handleBroadcast broadcasts a message to all clients and publishes to Redis
func (h *ChannelHub) handleBroadcast(message []byte) {
	// Broadcast to local clients
	h.broadcastToClients(message)

	// Publish to Redis for other instances
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := h.Redis.Publish(ctx, fmt.Sprintf("chat:%s", h.ID), string(message)).Err()
	if err != nil {
		log.Printf("Failed to publish message to Redis: %v", err)
	}
}

// broadcastToClients sends message to all connected clients
func (h *ChannelHub) broadcastToClients(message []byte) {
	h.Mutex.RLock()
	defer h.Mutex.RUnlock()

	for client := range h.Clients {
		select {
		case client.Send <- message:
		default:
			// Client's send channel is full, skip
			log.Printf("Client send buffer full, skipping message for user_id=%s", client.UserID)
		}
	}
}

// sendMessageHistory sends the last 50 messages to a newly connected client
func (h *ChannelHub) sendMessageHistory(client *ChatClient) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT cm.id, cm.channel_id, cm.user_id, cm.content, cm.created_at,
		       u.username, u.display_name, u.avatar_url
		FROM chat_messages cm
		JOIN users u ON cm.user_id = u.id
		WHERE cm.channel_id = $1 AND cm.is_deleted = false
		ORDER BY cm.created_at DESC
		LIMIT 50
	`

	channelUUID, err := uuid.Parse(h.ID)
	if err != nil {
		log.Printf("Invalid channel UUID: %v", err)
		return
	}

	rows, err := h.DB.Query(ctx, query, channelUUID)
	if err != nil {
		log.Printf("Failed to fetch message history: %v", err)
		return
	}
	defer rows.Close()

	var messages []ServerMessage
	for rows.Next() {
		var (
			id          uuid.UUID
			channelID   uuid.UUID
			userID      uuid.UUID
			content     string
			createdAt   time.Time
			username    string
			displayName string
			avatarURL   *string
		)

		err := rows.Scan(&id, &channelID, &userID, &content, &createdAt,
			&username, &displayName, &avatarURL)
		if err != nil {
			log.Printf("Failed to scan message: %v", err)
			continue
		}

		idStr := id.String()
		userIDStr := userID.String()
		msg := ServerMessage{
			Type:        MessageTypeMessage,
			ChannelID:   channelID.String(),
			UserID:      &userIDStr,
			Username:    &username,
			DisplayName: &displayName,
			AvatarURL:   avatarURL,
			Content:     &content,
			MessageID:   &idStr,
			Timestamp:   &createdAt,
		}
		messages = append(messages, msg)
	}

	// Reverse messages to send oldest first
	for i := len(messages) - 1; i >= 0; i-- {
		data, err := json.Marshal(messages[i])
		if err != nil {
			continue
		}
		select {
		case client.Send <- data:
		default:
			// Client disconnected or buffer full
			return
		}
	}
}

// shutdown gracefully shuts down the hub
func (h *ChannelHub) shutdown() {
	h.Mutex.Lock()
	defer h.Mutex.Unlock()

	log.Printf("Shutting down hub for channel: %s", h.ID)

	// Close all client connections
	for client := range h.Clients {
		close(client.Send)
		if client.Conn != nil {
			client.Conn.Close()
		}
	}

	// Clear clients map
	h.Clients = make(map[*ChatClient]bool)
}

// GetClientCount returns the number of connected clients
func (h *ChannelHub) GetClientCount() int {
	h.Mutex.RLock()
	defer h.Mutex.RUnlock()
	return len(h.Clients)
}

// Helper function to create a time pointer
func timePtr(t time.Time) *time.Time {
	return &t
}
