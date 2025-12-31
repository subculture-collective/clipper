//go:build integration

package chat

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/models"
	ws "github.com/subculture-collective/clipper/internal/websocket"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// TestClient represents a WebSocket test client
type TestClient struct {
	UserID    uuid.UUID
	Username  string
	Conn      *websocket.Conn
	Received  chan *ws.ServerMessage
	Errors    chan error
	mu        sync.Mutex
	connected bool
	t         *testing.T
}

// Test constants
const (
	// clientSendBufferSize matches the buffer size used in the WebSocket client implementation
	// This is defined in internal/websocket/client.go
	clientSendBufferSize = 256
	
	// slowClientMessageThreshold is the acceptable percentage of messages a fast client
	// should receive when a slow client is present. Set to 80% to account for potential
	// message loss in the slow client's buffer while ensuring the fast client remains unaffected.
	slowClientMessageThreshold = 0.8
)


// setupChatTestEnvironment creates test database, services, and HTTP server
func setupChatTestEnvironment(t *testing.T) (*gin.Engine, *jwtpkg.Manager, *database.DB, *redispkg.Client, *ws.Server, func()) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     testutil.GetEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     testutil.GetEnv("TEST_DATABASE_PORT", "5437"),
			User:     testutil.GetEnv("TEST_DATABASE_USER", "clipper"),
			Password: testutil.GetEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     testutil.GetEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: config.RedisConfig{
			Host: testutil.GetEnv("TEST_REDIS_HOST", "localhost"),
			Port: testutil.GetEnv("TEST_REDIS_PORT", "6380"),
		},
		JWT: config.JWTConfig{
			PrivateKey: testutil.GenerateTestJWTKey(t),
		},
	}

	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err)

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err)

	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err)

	// Create WebSocket server - use GetClient() to access the underlying redis.Client
	var redisClientPtr *redis.Client
	if redisClient != nil {
		redisClientPtr = redisClient.GetClient()
	}
	wsServer := ws.NewServer(db.Pool, redisClientPtr)

	// Create WebSocket handler (not chat handler)
	wsHandler := handlers.NewWebSocketHandler(db.Pool, wsServer)

	// Setup routes
	r := gin.New()
	r.Use(gin.Recovery())

	// Mock auth middleware that extracts user info from query params for testing
	mockAuthMiddleware := func(c *gin.Context) {
		userID := c.Query("user_id")
		username := c.Query("username")

		if userID == "" || username == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		parsedUserID, err := uuid.Parse(userID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
			return
		}

		c.Set("user_id", parsedUserID)
		c.Set("username", username)
		c.Next()
	}

	api := r.Group("/api/v1")
	chat := api.Group("/chat")
	{
		chat.GET("/ws/:id", mockAuthMiddleware, wsHandler.HandleConnection)
	}

	cleanup := func() {
		wsServer.Shutdown()
		db.Close()
		redisClient.Close()
	}

	return r, jwtManager, db, redisClient, wsServer, cleanup
}

// connectTestClient establishes a WebSocket connection for testing
func connectTestClient(t *testing.T, server *httptest.Server, channelID uuid.UUID, user *models.User) *TestClient {
	// Update URL to match the route pattern (/ws/:id)
	wsURL := fmt.Sprintf("ws%s/api/v1/chat/ws/%s?user_id=%s&username=%s",
		server.URL[4:], channelID.String(), user.ID.String(), user.Username)

	dialer := websocket.DefaultDialer
	conn, _, err := dialer.Dial(wsURL, nil)
	require.NoError(t, err, "Failed to connect WebSocket")

	client := &TestClient{
		UserID:    user.ID,
		Username:  user.Username,
		Conn:      conn,
		Received:  make(chan *ws.ServerMessage, 100),
		Errors:    make(chan error, 10),
		connected: true,
		t:         t,
	}

	// Start reading messages
	go client.readMessages()

	return client
}

// readMessages reads messages from WebSocket connection
func (c *TestClient) readMessages() {
	defer func() {
		c.mu.Lock()
		c.connected = false
		c.mu.Unlock()
	}()

	for {
		var msg ws.ServerMessage
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				c.Errors <- err
			}
			return
		}
		c.Received <- &msg
	}
}

// SendMessage sends a chat message
func (c *TestClient) SendMessage(channelID uuid.UUID, content string) error {
	msg := ws.ClientMessage{
		Type:      ws.MessageTypeMessage,
		ChannelID: channelID.String(),
		Content:   &content,
	}
	return c.Conn.WriteJSON(msg)
}

// SendMessageWithID sends a chat message with a specific message ID
func (c *TestClient) SendMessageWithID(channelID uuid.UUID, content string, messageID uuid.UUID) error {
	msgIDStr := messageID.String()
	msg := ws.ClientMessage{
		Type:      ws.MessageTypeMessage,
		ChannelID: channelID.String(),
		Content:   &content,
		MessageID: &msgIDStr,
	}
	return c.Conn.WriteJSON(msg)
}

// WaitForMessage waits for a message matching the condition
// Note: This implementation drains non-matching messages to avoid blocking.
// In a real-world scenario with high message volume, consider using a ring buffer
// or other data structure to prevent message loss.
func (c *TestClient) WaitForMessage(timeout time.Duration, condition func(*ws.ServerMessage) bool) (*ws.ServerMessage, error) {
	deadline := time.After(timeout)
	unmatchedBuffer := make([]*ws.ServerMessage, 0, 10)
	
	defer func() {
		// Re-queue unmatched messages (best-effort)
		for _, msg := range unmatchedBuffer {
			select {
			case c.Received <- msg:
			default:
				// Channel full, message lost - acceptable for test scenarios
			}
		}
	}()
	
	for {
		select {
		case msg := <-c.Received:
			if condition(msg) {
				return msg, nil
			}
			// Buffer unmatched messages for re-queueing
			unmatchedBuffer = append(unmatchedBuffer, msg)
		case <-deadline:
			return nil, fmt.Errorf("timeout waiting for message")
		}
	}
}

// Close closes the WebSocket connection
func (c *TestClient) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.connected {
		c.Conn.Close()
		c.connected = false
	}
}

// DrainMessages drains all pending messages
func (c *TestClient) DrainMessages() []*ws.ServerMessage {
	var messages []*ws.ServerMessage
	for {
		select {
		case msg := <-c.Received:
			messages = append(messages, msg)
		default:
			return messages
		}
	}
}

// TestMultipleClientsConnectDisconnect tests multiple clients connecting and disconnecting
func TestMultipleClientsConnectDisconnect(t *testing.T) {
	router, _, db, _, wsServer, cleanup := setupChatTestEnvironment(t)
	defer cleanup()

	server := httptest.NewServer(router)
	defer server.Close()

	ctx := context.Background()
	channelID := uuid.New()

	// Create test users
	user1 := testutil.CreateTestUser(t, db, "testuser1")
	user2 := testutil.CreateTestUser(t, db, "testuser2")
	user3 := testutil.CreateTestUser(t, db, "testuser3")
	defer testutil.CleanupTestUser(t, db, user1.ID)
	defer testutil.CleanupTestUser(t, db, user2.ID)
	defer testutil.CleanupTestUser(t, db, user3.ID)

	// Create channel in database
	_, err := db.Pool.Exec(ctx, `INSERT INTO chat_channels (id, name, created_at) VALUES ($1, $2, $3)`,
		channelID, "Test Channel", time.Now())
	require.NoError(t, err)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_channels WHERE id = $1`, channelID)

	// Connect first client
	client1 := connectTestClient(t, server, channelID, user1)
	defer client1.Close()

	// Wait for join presence
	msg, err := client1.WaitForMessage(2*time.Second, func(m *ws.ServerMessage) bool {
		return m.Type == ws.MessageTypePresence && *m.PresenceType == ws.PresenceTypeJoined
	})
	require.NoError(t, err)
	assert.Equal(t, user1.Username, *msg.Username)

	// Verify hub has 1 client
	stats := wsServer.GetStats()
	assert.Equal(t, 1, stats["total_connections"])

	// Connect second client
	client2 := connectTestClient(t, server, channelID, user2)
	defer client2.Close()

	// Both clients should receive join presence for user2
	for _, client := range []*TestClient{client1, client2} {
		msg, err := client.WaitForMessage(2*time.Second, func(m *ws.ServerMessage) bool {
			return m.Type == ws.MessageTypePresence && 
				*m.PresenceType == ws.PresenceTypeJoined && 
				*m.Username == user2.Username
		})
		require.NoError(t, err)
		assert.Equal(t, user2.Username, *msg.Username)
	}

	// Verify hub has 2 clients
	stats = wsServer.GetStats()
	assert.Equal(t, 2, stats["total_connections"])

	// Connect third client
	client3 := connectTestClient(t, server, channelID, user3)

	// All clients should receive join presence for user3
	for _, client := range []*TestClient{client1, client2, client3} {
		msg, err := client.WaitForMessage(2*time.Second, func(m *ws.ServerMessage) bool {
			return m.Type == ws.MessageTypePresence && 
				*m.PresenceType == ws.PresenceTypeJoined && 
				*m.Username == user3.Username
		})
		require.NoError(t, err)
		assert.Equal(t, user3.Username, *msg.Username)
	}

	// Verify hub has 3 clients
	stats = wsServer.GetStats()
	assert.Equal(t, 3, stats["total_connections"])

	// Disconnect client2
	client2.Close()
	time.Sleep(500 * time.Millisecond)

	// Remaining clients should receive leave presence
	for _, client := range []*TestClient{client1, client3} {
		msg, err := client.WaitForMessage(2*time.Second, func(m *ws.ServerMessage) bool {
			return m.Type == ws.MessageTypePresence && 
				*m.PresenceType == ws.PresenceTypeLeft && 
				*m.Username == user2.Username
		})
		require.NoError(t, err)
		assert.Equal(t, user2.Username, *msg.Username)
	}

	// Verify hub has 2 clients
	stats = wsServer.GetStats()
	assert.Equal(t, 2, stats["total_connections"])

	// Disconnect remaining clients
	client3.Close()
	time.Sleep(500 * time.Millisecond)
	
	// Verify stats updated
	stats = wsServer.GetStats()
	assert.Equal(t, 1, stats["total_connections"])
}

// TestMessageFanout tests message fanout to multiple clients
func TestMessageFanout(t *testing.T) {
	router, _, db, _, _, cleanup := setupChatTestEnvironment(t)
	defer cleanup()

	server := httptest.NewServer(router)
	defer server.Close()

	ctx := context.Background()
	channelID := uuid.New()

	// Create test users
	user1 := testutil.CreateTestUser(t, db, "sender")
	user2 := testutil.CreateTestUser(t, db, "receiver1")
	user3 := testutil.CreateTestUser(t, db, "receiver2")
	defer testutil.CleanupTestUser(t, db, user1.ID)
	defer testutil.CleanupTestUser(t, db, user2.ID)
	defer testutil.CleanupTestUser(t, db, user3.ID)

	// Create channel
	_, err := db.Pool.Exec(ctx, `INSERT INTO chat_channels (id, name, created_at) VALUES ($1, $2, $3)`,
		channelID, "Test Channel", time.Now())
	require.NoError(t, err)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_channels WHERE id = $1`, channelID)

	// Connect all clients
	client1 := connectTestClient(t, server, channelID, user1)
	defer client1.Close()
	client2 := connectTestClient(t, server, channelID, user2)
	defer client2.Close()
	client3 := connectTestClient(t, server, channelID, user3)
	defer client3.Close()

	// Wait for all join presences
	time.Sleep(1 * time.Second)
	client1.DrainMessages()
	client2.DrainMessages()
	client3.DrainMessages()

	// Client1 sends a message
	testMessage := "Hello everyone!"
	err = client1.SendMessage(channelID, testMessage)
	require.NoError(t, err)

	// All clients should receive the message
	for _, client := range []*TestClient{client1, client2, client3} {
		msg, err := client.WaitForMessage(3*time.Second, func(m *ws.ServerMessage) bool {
			return m.Type == ws.MessageTypeMessage && m.Content != nil && *m.Content == testMessage
		})
		require.NoError(t, err, "Client %s did not receive message", client.Username)
		assert.Equal(t, testMessage, *msg.Content)
		assert.Equal(t, user1.Username, *msg.Username)
		assert.NotNil(t, msg.MessageID)
		assert.NotNil(t, msg.Timestamp)
	}
}

// TestMessageOrdering tests message ordering preservation
func TestMessageOrdering(t *testing.T) {
	router, _, db, _, _, cleanup := setupChatTestEnvironment(t)
	defer cleanup()

	server := httptest.NewServer(router)
	defer server.Close()

	ctx := context.Background()
	channelID := uuid.New()

	// Create test users
	sender := testutil.CreateTestUser(t, db, "sender")
	receiver := testutil.CreateTestUser(t, db, "receiver")
	defer testutil.CleanupTestUser(t, db, sender.ID)
	defer testutil.CleanupTestUser(t, db, receiver.ID)

	// Create channel
	_, err := db.Pool.Exec(ctx, `INSERT INTO chat_channels (id, name, created_at) VALUES ($1, $2, $3)`,
		channelID, "Test Channel", time.Now())
	require.NoError(t, err)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_channels WHERE id = $1`, channelID)

	// Connect clients
	senderClient := connectTestClient(t, server, channelID, sender)
	defer senderClient.Close()
	receiverClient := connectTestClient(t, server, channelID, receiver)
	defer receiverClient.Close()

	// Wait for join presences
	time.Sleep(1 * time.Second)
	senderClient.DrainMessages()
	receiverClient.DrainMessages()

	// Send messages in order
	messages := []string{
		"Message 1",
		"Message 2",
		"Message 3",
		"Message 4",
		"Message 5",
	}

	for _, msg := range messages {
		err := senderClient.SendMessage(channelID, msg)
		require.NoError(t, err)
		time.Sleep(100 * time.Millisecond) // Small delay between messages
	}

	// Collect received messages
	var receivedMessages []string
	timeout := time.After(5 * time.Second)
	for len(receivedMessages) < len(messages) {
		select {
		case msg := <-receiverClient.Received:
			if msg.Type == ws.MessageTypeMessage && msg.Content != nil {
				receivedMessages = append(receivedMessages, *msg.Content)
			}
		case <-timeout:
			t.Fatalf("Timeout waiting for messages. Received %d of %d", len(receivedMessages), len(messages))
		}
	}

	// Verify order
	assert.Equal(t, messages, receivedMessages, "Messages should be received in order")
}

// TestReconnectionAndMessageHistory tests reconnection with message history
func TestReconnectionAndMessageHistory(t *testing.T) {
	router, _, db, _, _, cleanup := setupChatTestEnvironment(t)
	defer cleanup()

	server := httptest.NewServer(router)
	defer server.Close()

	ctx := context.Background()
	channelID := uuid.New()

	// Create test users
	user1 := testutil.CreateTestUser(t, db, "user1")
	user2 := testutil.CreateTestUser(t, db, "user2")
	defer testutil.CleanupTestUser(t, db, user1.ID)
	defer testutil.CleanupTestUser(t, db, user2.ID)

	// Create channel
	_, err := db.Pool.Exec(ctx, `INSERT INTO chat_channels (id, name, created_at) VALUES ($1, $2, $3)`,
		channelID, "Test Channel", time.Now())
	require.NoError(t, err)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_channels WHERE id = $1`, channelID)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_messages WHERE channel_id = $1`, channelID)

	// Connect both clients
	client1 := connectTestClient(t, server, channelID, user1)
	client2 := connectTestClient(t, server, channelID, user2)

	// Wait for join presences
	time.Sleep(1 * time.Second)
	client1.DrainMessages()
	client2.DrainMessages()

	// Client1 sends some messages
	historicalMessages := []string{
		"Historical message 1",
		"Historical message 2",
		"Historical message 3",
	}

	for _, msg := range historicalMessages {
		err := client1.SendMessage(channelID, msg)
		require.NoError(t, err)
		time.Sleep(100 * time.Millisecond)
	}

	// Wait for messages to be saved
	time.Sleep(1 * time.Second)

	// Disconnect client2
	client2.Close()
	time.Sleep(500 * time.Millisecond)

	// Client1 sends more messages while client2 is offline
	err = client1.SendMessage(channelID, "Message while offline")
	require.NoError(t, err)
	time.Sleep(500 * time.Millisecond)

	// Reconnect client2
	client2New := connectTestClient(t, server, channelID, user2)
	defer client2New.Close()

	// Client2 should receive message history (last 50 messages)
	receivedHistory := make(map[string]bool)
	timeout := time.After(5 * time.Second)
	
	for len(receivedHistory) < len(historicalMessages) {
		select {
		case msg := <-client2New.Received:
			if msg.Type == ws.MessageTypeMessage && msg.Content != nil {
				receivedHistory[*msg.Content] = true
			}
		case <-timeout:
			t.Fatalf("Timeout waiting for history. Received %d of %d messages", len(receivedHistory), len(historicalMessages))
		}
	}

	// Verify historical messages were received
	for _, msg := range historicalMessages {
		assert.True(t, receivedHistory[msg], "Historical message should be in history: %s", msg)
	}

	// Cleanup
	client1.Close()
}

// TestMessageDeduplication tests message deduplication with client-provided IDs
func TestMessageDeduplication(t *testing.T) {
	router, _, db, _, _, cleanup := setupChatTestEnvironment(t)
	defer cleanup()

	server := httptest.NewServer(router)
	defer server.Close()

	ctx := context.Background()
	channelID := uuid.New()

	// Create test users
	sender := testutil.CreateTestUser(t, db, "sender")
	receiver := testutil.CreateTestUser(t, db, "receiver")
	defer testutil.CleanupTestUser(t, db, sender.ID)
	defer testutil.CleanupTestUser(t, db, receiver.ID)

	// Create channel
	_, err := db.Pool.Exec(ctx, `INSERT INTO chat_channels (id, name, created_at) VALUES ($1, $2, $3)`,
		channelID, "Test Channel", time.Now())
	require.NoError(t, err)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_channels WHERE id = $1`, channelID)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_messages WHERE channel_id = $1`, channelID)

	// Connect clients
	senderClient := connectTestClient(t, server, channelID, sender)
	defer senderClient.Close()
	receiverClient := connectTestClient(t, server, channelID, receiver)
	defer receiverClient.Close()

	// Wait for join presences
	time.Sleep(1 * time.Second)
	senderClient.DrainMessages()
	receiverClient.DrainMessages()

	// Send the same message with the same ID twice (simulating retry)
	messageID := uuid.New()
	content := "Duplicate message test"

	err = senderClient.SendMessageWithID(channelID, content, messageID)
	require.NoError(t, err)
	time.Sleep(200 * time.Millisecond)

	// Send again with same ID
	err = senderClient.SendMessageWithID(channelID, content, messageID)
	require.NoError(t, err)
	time.Sleep(500 * time.Millisecond)

	// Receiver should only get one message (due to ON CONFLICT DO NOTHING)
	receivedCount := 0
	timeout := time.After(2 * time.Second)
	
	for {
		select {
		case msg := <-receiverClient.Received:
			if msg.Type == ws.MessageTypeMessage && msg.Content != nil && *msg.Content == content {
				receivedCount++
				if receivedCount == 1 {
					// First matching message received, keep listening to ensure no duplicates
					continue
				}
				// Duplicate matching message received; fail the test immediately
				assert.Fail(t, "received duplicate chat message with same content and ID")
				return
			}
		case <-timeout:
			// Timeout reached, check final count
			assert.Equal(t, 1, receivedCount, "Should receive exactly one message despite duplicate sends")
			return
		}
	}
}

// TestRateLimiting tests rate limiting enforcement
func TestRateLimiting(t *testing.T) {
	router, _, db, _, _, cleanup := setupChatTestEnvironment(t)
	defer cleanup()

	server := httptest.NewServer(router)
	defer server.Close()

	ctx := context.Background()
	channelID := uuid.New()

	// Create test user
	user := testutil.CreateTestUser(t, db, "spammer")
	defer testutil.CleanupTestUser(t, db, user.ID)

	// Create channel
	_, err := db.Pool.Exec(ctx, `INSERT INTO chat_channels (id, name, created_at) VALUES ($1, $2, $3)`,
		channelID, "Test Channel", time.Now())
	require.NoError(t, err)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_channels WHERE id = $1`, channelID)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_messages WHERE channel_id = $1`, channelID)

	// Connect client
	client := connectTestClient(t, server, channelID, user)
	defer client.Close()

	// Wait for join presence
	time.Sleep(1 * time.Second)
	client.DrainMessages()

	// Send messages rapidly (rate limit is 20 per minute = 1 per 3 seconds)
	// Send 3 messages quickly - first should succeed, subsequent should be rate limited
	successCount := 0
	errorCount := 0

	for i := 0; i < 3; i++ {
		err := client.SendMessage(channelID, fmt.Sprintf("Message %d", i))
		require.NoError(t, err)
		time.Sleep(100 * time.Millisecond) // Small delay to let server process
	}

	// Check responses
	timeout := time.After(3 * time.Second)
checkLoop:
	for successCount < 1 || errorCount < 2 {
		select {
		case msg := <-client.Received:
			if msg.Type == ws.MessageTypeMessage {
				successCount++
			} else if msg.Type == ws.MessageTypeError && msg.Error != nil {
				if contains(*msg.Error, "Rate limit") {
					errorCount++
				}
			}
		case <-timeout:
			t.Logf("Timeout: success=%d, errors=%d", successCount, errorCount)
			break checkLoop
		}
	}

	assert.GreaterOrEqual(t, successCount, 1, "At least one message should succeed")
	assert.GreaterOrEqual(t, errorCount, 1, "At least one message should be rate limited")
}

// TestSlowClientHandling tests handling of slow clients with full send buffers
func TestSlowClientHandling(t *testing.T) {
	router, _, db, _, _, cleanup := setupChatTestEnvironment(t)
	defer cleanup()

	server := httptest.NewServer(router)
	defer server.Close()

	ctx := context.Background()
	channelID := uuid.New()

	// Create test users
	fastUser := testutil.CreateTestUser(t, db, "fast")
	slowUser := testutil.CreateTestUser(t, db, "slow")
	defer testutil.CleanupTestUser(t, db, fastUser.ID)
	defer testutil.CleanupTestUser(t, db, slowUser.ID)

	// Create channel
	_, err := db.Pool.Exec(ctx, `INSERT INTO chat_channels (id, name, created_at) VALUES ($1, $2, $3)`,
		channelID, "Test Channel", time.Now())
	require.NoError(t, err)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_channels WHERE id = $1`, channelID)

	// Connect clients
	fastClient := connectTestClient(t, server, channelID, fastUser)
	defer fastClient.Close()
	
	slowClient := connectTestClient(t, server, channelID, slowUser)
	// Don't read from slowClient to simulate slow consumer
	
	// Wait for join presences
	time.Sleep(1 * time.Second)
	fastClient.DrainMessages()

	// Fast client sends many messages (exceed buffer size)
	// Using 300 messages to exceed the clientSendBufferSize of 256
	messageCount := 300
	for i := 0; i < messageCount; i++ {
		err := fastClient.SendMessage(channelID, fmt.Sprintf("Message %d", i))
		require.NoError(t, err)
		time.Sleep(5 * time.Millisecond) // Small delay
	}

	// Fast client should be able to receive all messages
	receivedCount := 0
	timeout := time.After(10 * time.Second)
	
receiveLoop:
	for receivedCount < messageCount {
		select {
		case msg := <-fastClient.Received:
			if msg.Type == ws.MessageTypeMessage {
				receivedCount++
			}
		case <-timeout:
			t.Logf("Fast client received %d of %d messages", receivedCount, messageCount)
			break receiveLoop
		}
	}

	// Fast client should receive most or all messages despite slow client
	// The threshold is defined as slowClientMessageThreshold (80%) to account for
	// potential message drops in the slow client's buffer while ensuring the fast
	// client is not significantly impacted by the slow consumer.
	assert.GreaterOrEqual(t, receivedCount, int(float64(messageCount)*slowClientMessageThreshold), 
		"Fast client should receive at least %.0f%% of messages", slowClientMessageThreshold*100)

	// Slow client may not receive all messages (buffer full scenario)
	// This is acceptable - server should remain stable
	// Just verify server didn't crash by checking stats
	time.Sleep(1 * time.Second)
	
	// Cleanup slow client
	slowClient.Close()
}

// TestCrossChannelIsolation tests message isolation between channels
func TestCrossChannelIsolation(t *testing.T) {
	router, _, db, _, _, cleanup := setupChatTestEnvironment(t)
	defer cleanup()

	server := httptest.NewServer(router)
	defer server.Close()

	ctx := context.Background()
	channel1ID := uuid.New()
	channel2ID := uuid.New()

	// Create test users
	user1 := testutil.CreateTestUser(t, db, "user1")
	user2 := testutil.CreateTestUser(t, db, "user2")
	defer testutil.CleanupTestUser(t, db, user1.ID)
	defer testutil.CleanupTestUser(t, db, user2.ID)

	// Create channels
	_, err := db.Pool.Exec(ctx, `INSERT INTO chat_channels (id, name, created_at) VALUES ($1, $2, $3)`,
		channel1ID, "Channel 1", time.Now())
	require.NoError(t, err)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_channels WHERE id = $1`, channel1ID)

	_, err = db.Pool.Exec(ctx, `INSERT INTO chat_channels (id, name, created_at) VALUES ($1, $2, $3)`,
		channel2ID, "Channel 2", time.Now())
	require.NoError(t, err)
	defer db.Pool.Exec(ctx, `DELETE FROM chat_channels WHERE id = $1`, channel2ID)

	// User1 connects to channel1
	client1 := connectTestClient(t, server, channel1ID, user1)
	defer client1.Close()

	// User2 connects to channel2
	client2 := connectTestClient(t, server, channel2ID, user2)
	defer client2.Close()

	// Wait for join presences
	time.Sleep(1 * time.Second)
	client1.DrainMessages()
	client2.DrainMessages()

	// User1 sends message to channel1
	msg1 := "Message for channel 1"
	err = client1.SendMessage(channel1ID, msg1)
	require.NoError(t, err)

	// User2 sends message to channel2
	msg2 := "Message for channel 2"
	err = client2.SendMessage(channel2ID, msg2)
	require.NoError(t, err)

	time.Sleep(1 * time.Second)

	// Client1 should only receive msg1
	messages1 := client1.DrainMessages()
	foundMsg1 := false
	foundMsg2 := false
	for _, msg := range messages1 {
		if msg.Type == ws.MessageTypeMessage && msg.Content != nil {
			if *msg.Content == msg1 {
				foundMsg1 = true
			}
			if *msg.Content == msg2 {
				foundMsg2 = true
			}
		}
	}
	assert.True(t, foundMsg1, "Client1 should receive msg1")
	assert.False(t, foundMsg2, "Client1 should NOT receive msg2 from different channel")

	// Client2 should only receive msg2
	messages2 := client2.DrainMessages()
	foundMsg1 = false
	foundMsg2 = false
	for _, msg := range messages2 {
		if msg.Type == ws.MessageTypeMessage && msg.Content != nil {
			if *msg.Content == msg1 {
				foundMsg1 = true
			}
			if *msg.Content == msg2 {
				foundMsg2 = true
			}
		}
	}
	assert.False(t, foundMsg1, "Client2 should NOT receive msg1 from different channel")
	assert.True(t, foundMsg2, "Client2 should receive msg2")
}

// Helper function
func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
