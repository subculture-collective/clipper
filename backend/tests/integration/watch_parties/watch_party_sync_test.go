//go:build integration

package watch_parties

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/middleware"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// TestClient represents a WebSocket test client
type TestClient struct {
	UserID      uuid.UUID
	Role        string
	Conn        *websocket.Conn
	Received    chan *models.WatchPartySyncEvent
	Errors      chan error
	mu          sync.Mutex
	connected   bool
	t           *testing.T
	unmatched   []*models.WatchPartySyncEvent // Buffer for unmatched events
}

// setupWatchPartyTestEnvironment creates test database, services, and HTTP server
func setupWatchPartyTestEnvironment(t *testing.T) (*gin.Engine, *jwtpkg.Manager, *database.DB, *redispkg.Client, *repository.WatchPartyRepository, *services.WatchPartyHubManager) {
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

	// Create repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	watchPartyRepo := repository.NewWatchPartyRepository(db.Pool)
	playlistRepo := repository.NewPlaylistRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)

	// Create services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)
	analyticsRepo := repository.NewAnalyticsRepository(db.Pool)
	
	// Create rate limiters for testing (high limits to not interfere with tests)
	chatLimiter := services.NewInMemoryRateLimiterAdapter(1000, time.Minute)
	reactLimiter := services.NewInMemoryRateLimiterAdapter(1000, time.Minute)
	
	hubManager := services.NewWatchPartyHubManager(watchPartyRepo, chatLimiter, reactLimiter)
	watchPartyService := services.NewWatchPartyService(watchPartyRepo, playlistRepo, clipRepo, "http://localhost:8080")

	// Create handlers
	watchPartyHandler := handlers.NewWatchPartyHandler(watchPartyService, hubManager, watchPartyRepo, analyticsRepo, cfg)

	// Setup routes - using a simpler structure for testing
	r := gin.New()
	r.Use(gin.Recovery())

	api := r.Group("/api/v1")
	watchParties := api.Group("/watch-parties")
	{
		watchParties.POST("", middleware.AuthMiddleware(authService), watchPartyHandler.CreateWatchParty)
		watchParties.POST("/:id/join", middleware.AuthMiddleware(authService), watchPartyHandler.JoinWatchParty)
		watchParties.GET("/:id", middleware.AuthMiddleware(authService), watchPartyHandler.GetWatchParty)
		watchParties.GET("/:id/participants", middleware.AuthMiddleware(authService), watchPartyHandler.GetParticipants)
		watchParties.DELETE("/:id/leave", middleware.AuthMiddleware(authService), watchPartyHandler.LeaveWatchParty)
		watchParties.POST("/:id/end", middleware.AuthMiddleware(authService), watchPartyHandler.EndWatchParty)
		watchParties.GET("/:id/ws", middleware.AuthMiddleware(authService), watchPartyHandler.WatchPartyWebSocket)
	}

	return r, jwtManager, db, redisClient, watchPartyRepo, hubManager
}

// createTestPartyWithParticipants creates a watch party with host and returns party ID
func createTestPartyWithParticipants(t *testing.T, ctx context.Context, repo *repository.WatchPartyRepository, hostID uuid.UUID, title string) uuid.UUID {
	party := &models.WatchParty{
		ID:              uuid.New(),
		HostUserID:      hostID,
		Title:           title,
		Visibility:      "private",
		InviteCode:      fmt.Sprintf("TEST%d", time.Now().UnixNano()%100000),
		MaxParticipants: 100,
	}

	err := repo.Create(ctx, party)
	require.NoError(t, err)

	// Add host as participant
	participant := &models.WatchPartyParticipant{
		ID:      uuid.New(),
		PartyID: party.ID,
		UserID:  hostID,
		Role:    "host",
	}
	err = repo.AddParticipant(ctx, participant)
	require.NoError(t, err)

	return party.ID
}

// connectTestClient establishes a WebSocket connection for testing
func connectTestClient(t *testing.T, server *httptest.Server, partyID uuid.UUID, userID uuid.UUID, token string, role string) *TestClient {
	wsURL := fmt.Sprintf("ws%s/api/v1/watch-parties/%s/ws", 
		server.URL[4:], partyID.String())

	dialer := websocket.DefaultDialer
	headers := http.Header{}
	headers.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	
	conn, _, err := dialer.Dial(wsURL, headers)
	require.NoError(t, err, "Failed to connect WebSocket client")

	client := &TestClient{
		UserID:    userID,
		Role:      role,
		Conn:      conn,
		Received:  make(chan *models.WatchPartySyncEvent, 100),
		Errors:    make(chan error, 10),
		connected: true,
		t:         t,
	}

	// Start reading messages in background
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
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			select {
			case c.Errors <- err:
			default:
				if c.t != nil {
					c.t.Logf("readMessages: error channel full, dropping read error: %v", err)
				}
			}
			return
		}

		var event models.WatchPartySyncEvent
		if err := json.Unmarshal(message, &event); err != nil {
			wrappedErr := fmt.Errorf("failed to unmarshal event: %w", err)
			select {
			case c.Errors <- wrappedErr:
			default:
				if c.t != nil {
					c.t.Logf("readMessages: error channel full, dropping unmarshal error: %v", wrappedErr)
				}
			}
			continue
		}

		c.Received <- &event
	}
}

// SendCommand sends a command to the server
func (c *TestClient) SendCommand(cmd *models.WatchPartyCommand) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.connected {
		return fmt.Errorf("client not connected")
	}

	data, err := json.Marshal(cmd)
	if err != nil {
		return err
	}

	return c.Conn.WriteMessage(websocket.TextMessage, data)
}

// WaitForEvent waits for an event of specified type with timeout.
// Events that don't match the expected type are buffered and checked in subsequent calls.
// This prevents important events like "participant-joined" from being lost.
func (c *TestClient) WaitForEvent(eventType string, timeout time.Duration) (*models.WatchPartySyncEvent, error) {
	c.mu.Lock()
	// Check buffered unmatched events first
	for i, event := range c.unmatched {
		if event.Type == eventType {
			// Remove from buffer and return
			c.unmatched = append(c.unmatched[:i], c.unmatched[i+1:]...)
			c.mu.Unlock()
			return event, nil
		}
	}
	c.mu.Unlock()

	deadline := time.After(timeout)
	for {
		select {
		case event := <-c.Received:
			if event.Type == eventType {
				return event, nil
			}
			// Buffer unmatched events for future WaitForEvent calls
			c.mu.Lock()
			c.unmatched = append(c.unmatched, event)
			if c.t != nil && len(c.unmatched) > 20 {
				c.t.Logf("WaitForEvent: unmatched event buffer growing large (%d events), expected %s", len(c.unmatched), eventType)
			}
			c.mu.Unlock()
		case err := <-c.Errors:
			return nil, err
		case <-deadline:
			return nil, fmt.Errorf("timeout waiting for event type: %s", eventType)
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

// TestMultiClientSync tests that multiple clients stay synchronized within ±2s tolerance
// References: docs/WATCH_PARTIES_API.md - Sync Tolerance section
func TestMultiClientSync(t *testing.T) {
	router, jwtManager, db, redisClient, watchPartyRepo, hubManager := setupWatchPartyTestEnvironment(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()

	// Create test users
	host := testutil.CreateTestUser(t, db, fmt.Sprintf("synchost%d", time.Now().Unix()))
	viewer1 := testutil.CreateTestUser(t, db, fmt.Sprintf("syncviewer1%d", time.Now().Unix()))
	viewer2 := testutil.CreateTestUser(t, db, fmt.Sprintf("syncviewer2%d", time.Now().Unix()))

	defer func() {
		testutil.CleanupTestUser(t, db, host.ID)
		testutil.CleanupTestUser(t, db, viewer1.ID)
		testutil.CleanupTestUser(t, db, viewer2.ID)
	}()

	// Create watch party
	partyID := createTestPartyWithParticipants(t, ctx, watchPartyRepo, host.ID, "Sync Test Party")
	defer func() {
		hubManager.RemoveHub(partyID)
		// Use direct SQL for test cleanup to ensure all test data is removed regardless of
		// repository-level business logic. This is intentionally limited to tests.
		// Foreign key relationships are handled explicitly here.
		_, _ = db.Pool.Exec(ctx, "DELETE FROM watch_party_participants WHERE party_id = $1", partyID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM watch_parties WHERE id = $1", partyID)
	}()

	// Add viewers as participants
	for _, viewer := range []*models.User{viewer1, viewer2} {
		participant := &models.WatchPartyParticipant{
			ID:      uuid.New(),
			PartyID: partyID,
			UserID:  viewer.ID,
			Role:    "viewer",
		}
		err := watchPartyRepo.AddParticipant(ctx, participant)
		require.NoError(t, err)
	}

	// Start test server
	server := httptest.NewServer(router)
	defer server.Close()

	// Generate tokens
	hostToken, err := jwtManager.GenerateAccessToken(host.ID, host.Role)
	require.NoError(t, err)
	viewer1Token, err := jwtManager.GenerateAccessToken(viewer1.ID, viewer1.Role)
	require.NoError(t, err)
	viewer2Token, err := jwtManager.GenerateAccessToken(viewer2.ID, viewer2.Role)
	require.NoError(t, err)

	// Connect clients
	hostClient := connectTestClient(t, server, partyID, host.ID, hostToken, "host")
	defer hostClient.Close()
	
	viewer1Client := connectTestClient(t, server, partyID, viewer1.ID, viewer1Token, "viewer")
	defer viewer1Client.Close()
	
	viewer2Client := connectTestClient(t, server, partyID, viewer2.ID, viewer2Token, "viewer")
	defer viewer2Client.Close()

	// Wait for WebSocket connections to be fully established and initial events to be processed
	// Using a short sleep here is more practical than waiting for specific events because:
	// 1. Clients may join at slightly different times
	// 2. participant-joined events are broadcast, causing race conditions in event order
	// 3. Tests focus on command synchronization, not connection handshake timing
	time.Sleep(300 * time.Millisecond)

	t.Run("Sync within 2s tolerance on play command", func(t *testing.T) {
		// Host sends play command
		playCmd := &models.WatchPartyCommand{
			Type:      "play",
			PartyID:   partyID.String(),
			Timestamp: time.Now().Unix(),
		}

		err := hostClient.SendCommand(playCmd)
		require.NoError(t, err)

		// All clients should receive play event
		hostEvent, err := hostClient.WaitForEvent("play", 2*time.Second)
		require.NoError(t, err)
		
		viewer1Event, err := viewer1Client.WaitForEvent("play", 2*time.Second)
		require.NoError(t, err)
		
		viewer2Event, err := viewer2Client.WaitForEvent("play", 2*time.Second)
		require.NoError(t, err)

		// Verify all events have same state
		assert.True(t, hostEvent.IsPlaying)
		assert.True(t, viewer1Event.IsPlaying)
		assert.True(t, viewer2Event.IsPlaying)

		// Verify server timestamps are within 2s (broadcast consistency check)
		// Note: This verifies that all clients receive events with consistent server timestamps,
		// not client-side drift. True sync drift would measure client video position vs server position.
		timeDiff := hostEvent.ServerTimestamp - viewer1Event.ServerTimestamp
		assert.LessOrEqual(t, abs(timeDiff), int64(2), "Broadcast timestamp drift exceeds ±2s tolerance")
		
		timeDiff = hostEvent.ServerTimestamp - viewer2Event.ServerTimestamp
		assert.LessOrEqual(t, abs(timeDiff), int64(2), "Broadcast timestamp drift exceeds ±2s tolerance")
	})

	t.Run("Sync on seek command", func(t *testing.T) {
		seekPosition := 120

		seekCmd := &models.WatchPartyCommand{
			Type:      "seek",
			PartyID:   partyID.String(),
			Position:  &seekPosition,
			Timestamp: time.Now().Unix(),
		}

		err := hostClient.SendCommand(seekCmd)
		require.NoError(t, err)

		// All clients should receive seek event
		hostEvent, err := hostClient.WaitForEvent("seek", 2*time.Second)
		require.NoError(t, err)
		
		viewer1Event, err := viewer1Client.WaitForEvent("seek", 2*time.Second)
		require.NoError(t, err)
		
		viewer2Event, err := viewer2Client.WaitForEvent("seek", 2*time.Second)
		require.NoError(t, err)

		// Verify position is synchronized
		assert.Equal(t, seekPosition, hostEvent.Position)
		assert.Equal(t, seekPosition, viewer1Event.Position)
		assert.Equal(t, seekPosition, viewer2Event.Position)

		// Verify timestamps within tolerance
		timeDiff := hostEvent.ServerTimestamp - viewer1Event.ServerTimestamp
		assert.LessOrEqual(t, abs(timeDiff), int64(2))
	})

	t.Run("Sync on pause command", func(t *testing.T) {
		pauseCmd := &models.WatchPartyCommand{
			Type:      "pause",
			PartyID:   partyID.String(),
			Timestamp: time.Now().Unix(),
		}

		err := hostClient.SendCommand(pauseCmd)
		require.NoError(t, err)

		// All clients should receive pause event
		hostEvent, err := hostClient.WaitForEvent("pause", 2*time.Second)
		require.NoError(t, err)
		
		viewer1Event, err := viewer1Client.WaitForEvent("pause", 2*time.Second)
		require.NoError(t, err)
		
		viewer2Event, err := viewer2Client.WaitForEvent("pause", 2*time.Second)
		require.NoError(t, err)

		// Verify all clients are paused
		assert.False(t, hostEvent.IsPlaying)
		assert.False(t, viewer1Event.IsPlaying)
		assert.False(t, viewer2Event.IsPlaying)
	})
}

// TestCommandPropagation tests that all command types propagate correctly to all participants
// References: docs/WATCH_PARTIES_API.md - WebSocket Protocol section
func TestCommandPropagation(t *testing.T) {
	router, jwtManager, db, redisClient, watchPartyRepo, hubManager := setupWatchPartyTestEnvironment(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()

	// Create test users
	host := testutil.CreateTestUser(t, db, fmt.Sprintf("cmdhost%d", time.Now().Unix()))
	viewer := testutil.CreateTestUser(t, db, fmt.Sprintf("cmdviewer%d", time.Now().Unix()))

	defer func() {
		testutil.CleanupTestUser(t, db, host.ID)
		testutil.CleanupTestUser(t, db, viewer.ID)
	}()

	partyID := createTestPartyWithParticipants(t, ctx, watchPartyRepo, host.ID, "Command Test Party")
	defer func() {
		hubManager.RemoveHub(partyID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM watch_party_participants WHERE party_id = $1", partyID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM watch_parties WHERE id = $1", partyID)
	}()

	// Add viewer as participant
	participant := &models.WatchPartyParticipant{
		ID:      uuid.New(),
		PartyID: partyID,
		UserID:  viewer.ID,
		Role:    "viewer",
	}
	err := watchPartyRepo.AddParticipant(ctx, participant)
	require.NoError(t, err)

	server := httptest.NewServer(router)
	defer server.Close()

	hostToken, err := jwtManager.GenerateAccessToken(host.ID, host.Role)
	require.NoError(t, err)
	viewerToken, err := jwtManager.GenerateAccessToken(viewer.ID, viewer.Role)
	require.NoError(t, err)

	hostClient := connectTestClient(t, server, partyID, host.ID, hostToken, "host")
	defer hostClient.Close()
	
	viewerClient := connectTestClient(t, server, partyID, viewer.ID, viewerToken, "viewer")
	defer viewerClient.Close()

	// Wait for WebSocket connections to be fully established
	// Short sleep is acceptable here for connection establishment
	time.Sleep(200 * time.Millisecond)

	tests := []struct {
		name      string
		command   *models.WatchPartyCommand
		eventType string
		verify    func(*testing.T, *models.WatchPartySyncEvent)
	}{
		{
			name: "Play command propagates",
			command: &models.WatchPartyCommand{
				Type:      "play",
				PartyID:   partyID.String(),
				Timestamp: time.Now().Unix(),
			},
			eventType: "play",
			verify: func(t *testing.T, event *models.WatchPartySyncEvent) {
				assert.True(t, event.IsPlaying)
			},
		},
		{
			name: "Pause command propagates",
			command: &models.WatchPartyCommand{
				Type:      "pause",
				PartyID:   partyID.String(),
				Timestamp: time.Now().Unix(),
			},
			eventType: "pause",
			verify: func(t *testing.T, event *models.WatchPartySyncEvent) {
				assert.False(t, event.IsPlaying)
			},
		},
		{
			name: "Seek command propagates",
			command: func() *models.WatchPartyCommand {
				pos := 60
				return &models.WatchPartyCommand{
					Type:      "seek",
					PartyID:   partyID.String(),
					Position:  &pos,
					Timestamp: time.Now().Unix(),
				}
			}(),
			eventType: "seek",
			verify: func(t *testing.T, event *models.WatchPartySyncEvent) {
				assert.Equal(t, 60, event.Position)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Host sends command
			err := hostClient.SendCommand(tt.command)
			require.NoError(t, err)

			// Both clients should receive event
			hostEvent, err := hostClient.WaitForEvent(tt.eventType, 2*time.Second)
			require.NoError(t, err)
			
			viewerEvent, err := viewerClient.WaitForEvent(tt.eventType, 2*time.Second)
			require.NoError(t, err)

			// Verify event properties
			tt.verify(t, hostEvent)
			tt.verify(t, viewerEvent)

			// Verify both received same state
			assert.Equal(t, hostEvent.IsPlaying, viewerEvent.IsPlaying)
			assert.Equal(t, hostEvent.Position, viewerEvent.Position)
		})
	}
}

// TestReconnectionRecovery tests that clients can recover state after reconnection
// References: docs/WATCH_PARTIES_API.md - Reconnection Recovery section
func TestReconnectionRecovery(t *testing.T) {
	router, jwtManager, db, redisClient, watchPartyRepo, hubManager := setupWatchPartyTestEnvironment(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()

	host := testutil.CreateTestUser(t, db, fmt.Sprintf("reconhost%d", time.Now().Unix()))
	viewer := testutil.CreateTestUser(t, db, fmt.Sprintf("reconviewer%d", time.Now().Unix()))

	defer func() {
		testutil.CleanupTestUser(t, db, host.ID)
		testutil.CleanupTestUser(t, db, viewer.ID)
	}()

	partyID := createTestPartyWithParticipants(t, ctx, watchPartyRepo, host.ID, "Reconnection Test Party")
	defer func() {
		hubManager.RemoveHub(partyID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM watch_party_participants WHERE party_id = $1", partyID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM watch_parties WHERE id = $1", partyID)
	}()

	participant := &models.WatchPartyParticipant{
		ID:      uuid.New(),
		PartyID: partyID,
		UserID:  viewer.ID,
		Role:    "viewer",
	}
	err := watchPartyRepo.AddParticipant(ctx, participant)
	require.NoError(t, err)

	server := httptest.NewServer(router)
	defer server.Close()

	hostToken, err := jwtManager.GenerateAccessToken(host.ID, host.Role)
	require.NoError(t, err)
	viewerToken, err := jwtManager.GenerateAccessToken(viewer.ID, viewer.Role)
	require.NoError(t, err)

	hostClient := connectTestClient(t, server, partyID, host.ID, hostToken, "host")
	defer hostClient.Close()
	
	viewerClient := connectTestClient(t, server, partyID, viewer.ID, viewerToken, "viewer")

	// Wait for WebSocket connections to be fully established
	// Short sleep is acceptable here for connection establishment
	time.Sleep(200 * time.Millisecond)

	t.Run("Recover state after reconnection", func(t *testing.T) {
		// Host changes state while viewer is connected
		seekPos := 150
		seekCmd := &models.WatchPartyCommand{
			Type:      "seek",
			PartyID:   partyID.String(),
			Position:  &seekPos,
			Timestamp: time.Now().Unix(),
		}
		err := hostClient.SendCommand(seekCmd)
		require.NoError(t, err)

		// Wait for seek event
		_, err = viewerClient.WaitForEvent("seek", 2*time.Second)
		require.NoError(t, err)

		// Viewer disconnects
		viewerClient.Close()

		// Give the server time to process the disconnection
		// This is necessary because WebSocket close is async
		time.Sleep(200 * time.Millisecond)

		// Host changes state while viewer is disconnected
		playCmd := &models.WatchPartyCommand{
			Type:      "play",
			PartyID:   partyID.String(),
			Timestamp: time.Now().Unix(),
		}
		err = hostClient.SendCommand(playCmd)
		require.NoError(t, err)

		// Wait for play event on host
		_, err = hostClient.WaitForEvent("play", 2*time.Second)
		require.NoError(t, err)

		// Viewer reconnects
		viewerClient = connectTestClient(t, server, partyID, viewer.ID, viewerToken, "viewer")
		defer viewerClient.Close()

		// Wait for viewer to be fully connected
		// We use a short sleep here instead of waiting for participant-joined event because:
		// 1. The hub may have already broadcast the event before client is ready to receive
		// 2. The sync-request will work once the connection is established
		// 3. This is testing reconnection resilience, not event ordering
		time.Sleep(200 * time.Millisecond)

		// Viewer sends sync-request to get current state
		syncReqCmd := &models.WatchPartyCommand{
			Type:      "sync-request",
			PartyID:   partyID.String(),
			Timestamp: time.Now().Unix(),
		}
		err = viewerClient.SendCommand(syncReqCmd)
		require.NoError(t, err)

		// Viewer should receive sync event with current state
		syncEvent, err := viewerClient.WaitForEvent("sync", 2*time.Second)
		require.NoError(t, err)

		// Verify recovered state matches current party state
		assert.True(t, syncEvent.IsPlaying, "State should show playing")
		assert.Equal(t, seekPos, syncEvent.Position, "Position should match last seek")
	})
}

// TestRolePermissionsEnforcement tests that role-based permissions are enforced
// References: docs/WATCH_PARTIES_API.md - Role Permissions section
func TestRolePermissionsEnforcement(t *testing.T) {
	router, jwtManager, db, redisClient, watchPartyRepo, hubManager := setupWatchPartyTestEnvironment(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()

	host := testutil.CreateTestUser(t, db, fmt.Sprintf("permhost%d", time.Now().Unix()))
	cohost := testutil.CreateTestUser(t, db, fmt.Sprintf("permcohost%d", time.Now().Unix()))
	viewer := testutil.CreateTestUser(t, db, fmt.Sprintf("permviewer%d", time.Now().Unix()))

	defer func() {
		testutil.CleanupTestUser(t, db, host.ID)
		testutil.CleanupTestUser(t, db, cohost.ID)
		testutil.CleanupTestUser(t, db, viewer.ID)
	}()

	partyID := createTestPartyWithParticipants(t, ctx, watchPartyRepo, host.ID, "Permission Test Party")
	defer func() {
		hubManager.RemoveHub(partyID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM watch_party_participants WHERE party_id = $1", partyID)
		_, _ = db.Pool.Exec(ctx, "DELETE FROM watch_parties WHERE id = $1", partyID)
	}()

	// Add co-host
	cohostParticipant := &models.WatchPartyParticipant{
		ID:      uuid.New(),
		PartyID: partyID,
		UserID:  cohost.ID,
		Role:    "co-host",
	}
	err := watchPartyRepo.AddParticipant(ctx, cohostParticipant)
	require.NoError(t, err)

	// Add viewer
	viewerParticipant := &models.WatchPartyParticipant{
		ID:      uuid.New(),
		PartyID: partyID,
		UserID:  viewer.ID,
		Role:    "viewer",
	}
	err = watchPartyRepo.AddParticipant(ctx, viewerParticipant)
	require.NoError(t, err)

	server := httptest.NewServer(router)
	defer server.Close()

	hostToken, err := jwtManager.GenerateAccessToken(host.ID, host.Role)
	require.NoError(t, err)
	cohostToken, err := jwtManager.GenerateAccessToken(cohost.ID, cohost.Role)
	require.NoError(t, err)
	viewerToken, err := jwtManager.GenerateAccessToken(viewer.ID, viewer.Role)
	require.NoError(t, err)

	hostClient := connectTestClient(t, server, partyID, host.ID, hostToken, "host")
	defer hostClient.Close()
	
	cohostClient := connectTestClient(t, server, partyID, cohost.ID, cohostToken, "co-host")
	defer cohostClient.Close()
	
	viewerClient := connectTestClient(t, server, partyID, viewer.ID, viewerToken, "viewer")
	defer viewerClient.Close()

	// Wait for WebSocket connections to be fully established
	// Short sleep is acceptable here for connection establishment with multiple clients
	time.Sleep(300 * time.Millisecond)

	t.Run("Host can control playback", func(t *testing.T) {
		playCmd := &models.WatchPartyCommand{
			Type:      "play",
			PartyID:   partyID.String(),
			Timestamp: time.Now().Unix(),
		}

		err := hostClient.SendCommand(playCmd)
		require.NoError(t, err)

		// All clients should receive play event
		_, err = hostClient.WaitForEvent("play", 2*time.Second)
		assert.NoError(t, err, "Host should be able to send play command")
		
		_, err = cohostClient.WaitForEvent("play", 2*time.Second)
		assert.NoError(t, err)
		
		_, err = viewerClient.WaitForEvent("play", 2*time.Second)
		assert.NoError(t, err)
	})

	t.Run("Co-host can control playback", func(t *testing.T) {
		pauseCmd := &models.WatchPartyCommand{
			Type:      "pause",
			PartyID:   partyID.String(),
			Timestamp: time.Now().Unix(),
		}

		err := cohostClient.SendCommand(pauseCmd)
		require.NoError(t, err)

		// All clients should receive pause event
		_, err = hostClient.WaitForEvent("pause", 2*time.Second)
		assert.NoError(t, err)
		
		_, err = cohostClient.WaitForEvent("pause", 2*time.Second)
		assert.NoError(t, err, "Co-host should be able to send pause command")
		
		_, err = viewerClient.WaitForEvent("pause", 2*time.Second)
		assert.NoError(t, err)
	})

	t.Run("Viewer cannot control playback", func(t *testing.T) {
		// Clear any pending events
		drainChannel(viewerClient.Received, 100*time.Millisecond)
		drainChannel(hostClient.Received, 100*time.Millisecond)
		drainChannel(cohostClient.Received, 100*time.Millisecond)

		seekPos := 200
		seekCmd := &models.WatchPartyCommand{
			Type:      "seek",
			PartyID:   partyID.String(),
			Position:  &seekPos,
			Timestamp: time.Now().Unix(),
		}

		err := viewerClient.SendCommand(seekCmd)
		require.NoError(t, err, "Command should be sent")

		// Viewer's command should be rejected - no seek event should be broadcast
		// We should either receive an error event or no event at all
		select {
		case event := <-viewerClient.Received:
			if event.Type == "error" {
				// Expected: error response for unauthorized command
				t.Logf("Received error event as expected for unauthorized viewer command")
			} else if event.Type == "seek" {
				t.Error("Viewer should not be able to send seek command - command was not rejected")
			}
		case <-time.After(1 * time.Second):
			// Also acceptable: no response (command silently rejected)
			t.Log("Viewer's command was silently rejected (no error or seek event)")
		}

		// Other clients should not receive the event either
		select {
		case event := <-hostClient.Received:
			if event.Type == "seek" {
				t.Error("Host should not receive seek event from viewer's unauthorized command")
			}
		case <-time.After(500 * time.Millisecond):
			// Expected: no event
		}
	})

	t.Run("Viewer can request sync", func(t *testing.T) {
		syncReqCmd := &models.WatchPartyCommand{
			Type:      "sync-request",
			PartyID:   partyID.String(),
			Timestamp: time.Now().Unix(),
		}

		err := viewerClient.SendCommand(syncReqCmd)
		require.NoError(t, err)

		// Viewer should receive sync event
		syncEvent, err := viewerClient.WaitForEvent("sync", 2*time.Second)
		assert.NoError(t, err, "Viewer should be able to request sync")
		assert.NotNil(t, syncEvent)
	})
}

// drainChannel drains all messages from a channel with timeout
func drainChannel(ch chan *models.WatchPartySyncEvent, timeout time.Duration) {
	deadline := time.After(timeout)
	for {
		select {
		case <-ch:
			// Drain
		case <-deadline:
			return
		default:
			return
		}
	}
}

// abs returns absolute value of int64
func abs(n int64) int64 {
	if n < 0 {
		return -n
	}
	return n
}
