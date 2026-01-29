//go:build integration

package mocks

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/subculture-collective/clipper/pkg/twitch"
)

// TwitchClientInterface defines the interface for Twitch API operations
type TwitchClientInterface interface {
	GetClips(ctx context.Context, params *twitch.ClipParams) (*twitch.ClipsResponse, error)
	GetUsers(ctx context.Context, userIDs []string, logins []string) (*twitch.UsersResponse, error)
	GetGames(ctx context.Context, gameIDs []string, gameNames []string) (*twitch.GamesResponse, error)
	GetStreams(ctx context.Context, userIDs []string) (*twitch.StreamsResponse, error)
	ValidateClip(ctx context.Context, clipID string) (*twitch.Clip, error)
	GetCachedUser(ctx context.Context, userID string) (*twitch.User, error)
	GetCachedGame(ctx context.Context, gameID string) (*twitch.Game, error)
}

// MockTwitchClient implements TwitchClientInterface for testing
type MockTwitchClient struct {
	mu sync.RWMutex

	// Mock data stores
	Clips   map[string]*twitch.Clip
	Users   map[string]*twitch.User
	Games   map[string]*twitch.Game
	Streams map[string]*twitch.Stream

	// Call tracking
	GetClipsCalls     int
	GetUsersCalls     int
	GetGamesCalls     int
	GetStreamsCalls   int
	ValidateClipCalls int

	// Error injection for testing error scenarios
	GetClipsError     error
	GetUsersError     error
	GetGamesError     error
	GetStreamsError   error
	ValidateClipError error

	// Latency simulation
	SimulateLatency time.Duration
}

// NewMockTwitchClient creates a new mock Twitch client with default data
func NewMockTwitchClient() *MockTwitchClient {
	return &MockTwitchClient{
		Clips:   make(map[string]*twitch.Clip),
		Users:   make(map[string]*twitch.User),
		Games:   make(map[string]*twitch.Game),
		Streams: make(map[string]*twitch.Stream),
	}
}

// AddClip adds a mock clip to the client
func (m *MockTwitchClient) AddClip(clip *twitch.Clip) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Clips[clip.ID] = clip
}

// AddUser adds a mock user to the client
func (m *MockTwitchClient) AddUser(user *twitch.User) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Users[user.ID] = user
}

// AddGame adds a mock game to the client
func (m *MockTwitchClient) AddGame(game *twitch.Game) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Games[game.ID] = game
}

// AddStream adds a mock stream to the client
func (m *MockTwitchClient) AddStream(stream *twitch.Stream) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Streams[stream.UserID] = stream
}

// GetClips returns mock clips
func (m *MockTwitchClient) GetClips(ctx context.Context, params *twitch.ClipParams) (*twitch.ClipsResponse, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	m.GetClipsCalls++
	m.mu.Unlock()

	if m.GetClipsError != nil {
		return nil, m.GetClipsError
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	// Filter clips by parameters
	var clips []twitch.Clip
	for _, clip := range m.Clips {
		// Filter by clip IDs if provided
		if len(params.ClipIDs) > 0 {
			found := false
			for _, id := range params.ClipIDs {
				if clip.ID == id {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		// Filter by broadcaster ID
		if params.BroadcasterID != "" && clip.BroadcasterID != params.BroadcasterID {
			continue
		}

		// Filter by game ID
		if params.GameID != "" && clip.GameID != params.GameID {
			continue
		}

		clips = append(clips, *clip)
	}

	return &twitch.ClipsResponse{
		Data: clips,
	}, nil
}

// GetUsers returns mock users
func (m *MockTwitchClient) GetUsers(ctx context.Context, userIDs []string, logins []string) (*twitch.UsersResponse, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	m.GetUsersCalls++
	m.mu.Unlock()

	if m.GetUsersError != nil {
		return nil, m.GetUsersError
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	var users []twitch.User
	for _, user := range m.Users {
		// Apply filters - user must match all provided filter types (AND logic)
		// If userIDs provided, user ID must match
		if len(userIDs) > 0 {
			found := false
			for _, id := range userIDs {
				if user.ID == id {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		// If logins provided, login must match
		if len(logins) > 0 {
			found := false
			for _, login := range logins {
				if user.Login == login {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		users = append(users, *user)
	}

	return &twitch.UsersResponse{
		Data: users,
	}, nil
}

// GetGames returns mock games
func (m *MockTwitchClient) GetGames(ctx context.Context, gameIDs []string, gameNames []string) (*twitch.GamesResponse, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	m.GetGamesCalls++
	m.mu.Unlock()

	if m.GetGamesError != nil {
		return nil, m.GetGamesError
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	var games []twitch.Game
	
	idFilterProvided := len(gameIDs) > 0
	nameFilterProvided := len(gameNames) > 0

	for _, game := range m.Games {
		// Determine if this game matches any provided IDs
		idMatch := !idFilterProvided
		if idFilterProvided {
			for _, id := range gameIDs {
				if game.ID == id {
					idMatch = true
					break
				}
			}
		}

		// Determine if this game matches any provided names
		nameMatch := !nameFilterProvided
		if nameFilterProvided {
			for _, name := range gameNames {
				if game.Name == name {
					nameMatch = true
					break
				}
			}
		}

		// If any filters are provided, require at least one to match (OR logic)
		if (idFilterProvided || nameFilterProvided) && !(idMatch || nameMatch) {
			continue
		}

		games = append(games, *game)
	}

	return &twitch.GamesResponse{
		Data: games,
	}, nil
}

// GetStreams returns mock streams
func (m *MockTwitchClient) GetStreams(ctx context.Context, userIDs []string) (*twitch.StreamsResponse, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	m.GetStreamsCalls++
	m.mu.Unlock()

	if m.GetStreamsError != nil {
		return nil, m.GetStreamsError
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	var streams []twitch.Stream
	for _, stream := range m.Streams {
		// Filter by user IDs
		if len(userIDs) > 0 {
			found := false
			for _, id := range userIDs {
				if stream.UserID == id {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		streams = append(streams, *stream)
	}

	return &twitch.StreamsResponse{
		Data: streams,
	}, nil
}

// ValidateClip validates a clip ID and returns clip data
func (m *MockTwitchClient) ValidateClip(ctx context.Context, clipID string) (*twitch.Clip, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	m.ValidateClipCalls++
	m.mu.Unlock()

	if m.ValidateClipError != nil {
		return nil, m.ValidateClipError
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	clip, exists := m.Clips[clipID]
	if !exists {
		return nil, fmt.Errorf("clip not found: %s", clipID)
	}

	return clip, nil
}

// GetCachedUser returns a cached user (same as GetUsers for mock)
func (m *MockTwitchClient) GetCachedUser(ctx context.Context, userID string) (*twitch.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	user, exists := m.Users[userID]
	if !exists {
		return nil, fmt.Errorf("user not found: %s", userID)
	}

	return user, nil
}

// GetCachedGame returns a cached game (same as GetGames for mock)
func (m *MockTwitchClient) GetCachedGame(ctx context.Context, gameID string) (*twitch.Game, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	game, exists := m.Games[gameID]
	if !exists {
		return nil, fmt.Errorf("game not found: %s", gameID)
	}

	return game, nil
}

// Reset clears all mock data and call counts
func (m *MockTwitchClient) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.Clips = make(map[string]*twitch.Clip)
	m.Users = make(map[string]*twitch.User)
	m.Games = make(map[string]*twitch.Game)
	m.Streams = make(map[string]*twitch.Stream)

	m.GetClipsCalls = 0
	m.GetUsersCalls = 0
	m.GetGamesCalls = 0
	m.GetStreamsCalls = 0
	m.ValidateClipCalls = 0

	m.GetClipsError = nil
	m.GetUsersError = nil
	m.GetGamesError = nil
	m.GetStreamsError = nil
	m.ValidateClipError = nil
}
