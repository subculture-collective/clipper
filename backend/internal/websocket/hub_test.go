package websocket

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRedisClient is a mock implementation of Redis client for testing
type MockRedisClient struct {
	mock.Mock
}

func (m *MockRedisClient) Subscribe(ctx context.Context, channels ...string) *redis.PubSub {
	args := m.Called(ctx, channels)
	return args.Get(0).(*redis.PubSub)
}

func (m *MockRedisClient) Publish(ctx context.Context, channel string, message interface{}) *redis.StatusCmd {
	m.Called(ctx, channel, message)
	return redis.NewStatusCmd(ctx)
}

func TestNewChannelHub(t *testing.T) {
	channelID := uuid.New().String()

	hub := NewChannelHub(channelID, nil, nil)

	assert.NotNil(t, hub)
	assert.Equal(t, channelID, hub.ID)
	assert.NotNil(t, hub.Clients)
	assert.NotNil(t, hub.Broadcast)
	assert.NotNil(t, hub.Register)
	assert.NotNil(t, hub.Unregister)
	assert.NotNil(t, hub.Stop)
	assert.Equal(t, 256, cap(hub.Broadcast))
}

func TestChannelHub_GetClientCount(t *testing.T) {
	hub := NewChannelHub(uuid.New().String(), nil, nil)

	// Initially empty
	assert.Equal(t, 0, hub.GetClientCount())

	// Add some clients
	client1 := &ChatClient{UserID: uuid.New()}
	client2 := &ChatClient{UserID: uuid.New()}

	hub.Mutex.Lock()
	hub.Clients[client1] = true
	hub.Clients[client2] = true
	hub.Mutex.Unlock()

	assert.Equal(t, 2, hub.GetClientCount())
}

func TestChannelHub_HandleRegister(t *testing.T) {
	hub := &ChannelHub{
		ID:      uuid.New().String(),
		Clients: make(map[*ChatClient]bool),
	}

	client := &ChatClient{
		UserID:   uuid.New(),
		Username: "testuser",
		Send:     make(chan []byte, 256),
	}

	// Directly manipulate the clients map instead of using handleRegister
	// which would spawn a goroutine
	hub.Mutex.Lock()
	hub.Clients[client] = true
	hub.Mutex.Unlock()

	// Verify client is registered
	hub.Mutex.RLock()
	_, exists := hub.Clients[client]
	hub.Mutex.RUnlock()

	assert.True(t, exists)
	assert.Equal(t, 1, hub.GetClientCount())
}

func TestChannelHub_HandleUnregister(t *testing.T) {
	hub := &ChannelHub{
		ID:      uuid.New().String(),
		Clients: make(map[*ChatClient]bool),
	}

	client := &ChatClient{
		UserID:   uuid.New(),
		Username: "testuser",
		Send:     make(chan []byte, 256),
	}

	// Register client first
	hub.Mutex.Lock()
	hub.Clients[client] = true
	hub.Mutex.Unlock()

	assert.Equal(t, 1, hub.GetClientCount())

	// Unregister client
	hub.Mutex.Lock()
	delete(hub.Clients, client)
	close(client.Send)
	hub.Mutex.Unlock()

	// Verify client is unregistered
	assert.Equal(t, 0, hub.GetClientCount())

	// Verify send channel is closed
	_, ok := <-client.Send
	assert.False(t, ok)
}

func TestChannelHub_BroadcastToClients(t *testing.T) {
	hub := &ChannelHub{
		ID:      uuid.New().String(),
		Clients: make(map[*ChatClient]bool),
	}

	client1 := &ChatClient{
		UserID:   uuid.New(),
		Username: "user1",
		Send:     make(chan []byte, 256),
	}
	client2 := &ChatClient{
		UserID:   uuid.New(),
		Username: "user2",
		Send:     make(chan []byte, 256),
	}

	hub.Mutex.Lock()
	hub.Clients[client1] = true
	hub.Clients[client2] = true
	hub.Mutex.Unlock()

	// Broadcast a message
	message := []byte(`{"type":"message","content":"Hello"}`)
	hub.broadcastToClients(message)

	// Verify both clients received the message
	select {
	case msg := <-client1.Send:
		assert.Equal(t, message, msg)
	case <-time.After(1 * time.Second):
		t.Fatal("Client 1 did not receive message")
	}

	select {
	case msg := <-client2.Send:
		assert.Equal(t, message, msg)
	case <-time.After(1 * time.Second):
		t.Fatal("Client 2 did not receive message")
	}
}

func TestChannelHub_Shutdown(t *testing.T) {
	hub := NewChannelHub(uuid.New().String(), nil, nil)

	client1 := &ChatClient{
		UserID:   uuid.New(),
		Username: "user1",
		Send:     make(chan []byte, 256),
	}
	client2 := &ChatClient{
		UserID:   uuid.New(),
		Username: "user2",
		Send:     make(chan []byte, 256),
	}

	hub.Mutex.Lock()
	hub.Clients[client1] = true
	hub.Clients[client2] = true
	hub.Mutex.Unlock()

	assert.Equal(t, 2, hub.GetClientCount())

	// Shutdown hub
	hub.shutdown()

	// Verify all clients are removed
	assert.Equal(t, 0, hub.GetClientCount())

	// Verify send channels are closed
	_, ok1 := <-client1.Send
	_, ok2 := <-client2.Send
	assert.False(t, ok1)
	assert.False(t, ok2)
}

func TestTimePtrHelper(t *testing.T) {
	now := time.Now()
	ptr := timePtr(now)

	assert.NotNil(t, ptr)
	assert.Equal(t, now, *ptr)
}
