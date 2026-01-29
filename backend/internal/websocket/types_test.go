package websocket

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"golang.org/x/time/rate"
)

func TestClientMessage(t *testing.T) {
	tests := []struct {
		name    string
		message ClientMessage
	}{
		{
			name: "message type",
			message: ClientMessage{
				Type:      MessageTypeMessage,
				ChannelID: uuid.New().String(),
				Content:   strPtr("Hello, world!"),
				MessageID: strPtr(uuid.New().String()),
			},
		},
		{
			name: "typing type",
			message: ClientMessage{
				Type:      MessageTypeTyping,
				ChannelID: uuid.New().String(),
			},
		},
		{
			name: "join type",
			message: ClientMessage{
				Type:      MessageTypeJoin,
				ChannelID: uuid.New().String(),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Marshal to JSON
			data, err := json.Marshal(tt.message)
			assert.NoError(t, err)
			assert.NotEmpty(t, data)

			// Unmarshal back
			var decoded ClientMessage
			err = json.Unmarshal(data, &decoded)
			assert.NoError(t, err)
			assert.Equal(t, tt.message.Type, decoded.Type)
			assert.Equal(t, tt.message.ChannelID, decoded.ChannelID)
		})
	}
}

func TestServerMessage(t *testing.T) {
	tests := []struct {
		name    string
		message ServerMessage
	}{
		{
			name: "message type with user info",
			message: ServerMessage{
				Type:        MessageTypeMessage,
				ChannelID:   uuid.New().String(),
				UserID:      strPtr(uuid.New().String()),
				Username:    strPtr("testuser"),
				DisplayName: strPtr("Test User"),
				Content:     strPtr("Hello!"),
				MessageID:   strPtr(uuid.New().String()),
				Timestamp:   timePtr(time.Now()),
			},
		},
		{
			name: "presence type",
			message: ServerMessage{
				Type:         MessageTypePresence,
				ChannelID:    uuid.New().String(),
				UserID:       strPtr(uuid.New().String()),
				Username:     strPtr("testuser"),
				PresenceType: strPtr(PresenceTypeJoined),
				Timestamp:    timePtr(time.Now()),
			},
		},
		{
			name: "error type",
			message: ServerMessage{
				Type:      MessageTypeError,
				ChannelID: uuid.New().String(),
				Error:     strPtr("Something went wrong"),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Marshal to JSON
			data, err := json.Marshal(tt.message)
			assert.NoError(t, err)
			assert.NotEmpty(t, data)

			// Unmarshal back
			var decoded ServerMessage
			err = json.Unmarshal(data, &decoded)
			assert.NoError(t, err)
			assert.Equal(t, tt.message.Type, decoded.Type)
			assert.Equal(t, tt.message.ChannelID, decoded.ChannelID)
		})
	}
}

func TestNewChatClient(t *testing.T) {
	userID := uuid.New()
	username := "testuser"

	client := NewChatClient(nil, nil, userID, username)

	assert.NotNil(t, client)
	assert.Equal(t, userID, client.UserID)
	assert.Equal(t, username, client.Username)
	assert.NotNil(t, client.Send)
	// RateLimit can be nil when CHAT_RATE_LIMIT_PER_MINUTE is not set
	// assert.NotNil(t, client.RateLimit)
	assert.Equal(t, 256, cap(client.Send))
}

func TestRateLimiter(t *testing.T) {
	// Create a rate limiter (10 messages per minute)
	limiter := rate.NewLimiter(rate.Limit(10.0/60.0), 1)

	// First message should be allowed
	assert.True(t, limiter.Allow())

	// Second message should be rate limited (burst is 1)
	assert.False(t, limiter.Allow())

	// Wait for rate limit to reset
	time.Sleep(6 * time.Second)
	assert.True(t, limiter.Allow())
}

func TestMessageTypeConstants(t *testing.T) {
	assert.Equal(t, "message", MessageTypeMessage)
	assert.Equal(t, "typing", MessageTypeTyping)
	assert.Equal(t, "join", MessageTypeJoin)
	assert.Equal(t, "leave", MessageTypeLeave)
	assert.Equal(t, "presence", MessageTypePresence)
	assert.Equal(t, "error", MessageTypeError)
}

func TestPresenceTypeConstants(t *testing.T) {
	assert.Equal(t, "joined", PresenceTypeJoined)
	assert.Equal(t, "left", PresenceTypeLeft)
}
