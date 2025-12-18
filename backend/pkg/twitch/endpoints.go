package twitch

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/subculture-collective/clipper/pkg/utils"
)

// GetClips fetches clips from Twitch API
func (c *Client) GetClips(ctx context.Context, params *ClipParams) (*ClipsResponse, error) {
	urlParams := url.Values{}

	if params.BroadcasterID != "" {
		urlParams.Set("broadcaster_id", params.BroadcasterID)
	}
	if params.GameID != "" {
		urlParams.Set("game_id", params.GameID)
	}
	if len(params.ClipIDs) > 0 {
		for _, id := range params.ClipIDs {
			urlParams.Add("id", id)
		}
	}
	if !params.StartedAt.IsZero() {
		urlParams.Set("started_at", params.StartedAt.Format(time.RFC3339))
	}
	if !params.EndedAt.IsZero() {
		urlParams.Set("ended_at", params.EndedAt.Format(time.RFC3339))
	}
	if params.First > 0 {
		urlParams.Set("first", fmt.Sprintf("%d", params.First))
	}
	if params.After != "" {
		urlParams.Set("after", params.After)
	}
	if params.Before != "" {
		urlParams.Set("before", params.Before)
	}

	resp, err := c.doRequest(ctx, "GET", "/clips", urlParams)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("clips request failed: %s", string(body)),
		}
	}

	var clipsResp ClipsResponse
	if err := json.NewDecoder(resp.Body).Decode(&clipsResp); err != nil {
		return nil, fmt.Errorf("failed to decode clips response: %w", err)
	}

	logger := utils.GetLogger()
	logger.Debug("Fetched clips", map[string]interface{}{
		"count": len(clipsResp.Data),
	})
	return &clipsResp, nil
}

// GetUsers fetches user information from Twitch API
func (c *Client) GetUsers(ctx context.Context, userIDs, logins []string) (*UsersResponse, error) {
	urlParams := url.Values{}

	for _, id := range userIDs {
		urlParams.Add("id", id)
	}
	for _, login := range logins {
		urlParams.Add("login", login)
	}

	resp, err := c.doRequest(ctx, "GET", "/users", urlParams)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("users request failed: %s", string(body)),
		}
	}

	var usersResp UsersResponse
	if err := json.NewDecoder(resp.Body).Decode(&usersResp); err != nil {
		return nil, fmt.Errorf("failed to decode users response: %w", err)
	}

	// Cache user data
	logger := utils.GetLogger()
	for i := range usersResp.Data {
		user := &usersResp.Data[i]
		if err := c.cache.CacheUser(ctx, user, time.Hour); err != nil {
			logger.Warn("Failed to cache user data", map[string]interface{}{
				"user_id": user.ID,
				"error":   err.Error(),
			})
		}
	}

	logger.Debug("Fetched users", map[string]interface{}{
		"count": len(usersResp.Data),
	})
	return &usersResp, nil
}

// GetUser fetches a single user by ID
func (c *Client) GetUser(ctx context.Context, userID string) (*User, error) {
	// Try cache first
	if user, err := c.cache.CachedUser(ctx, userID); err == nil {
		logger := utils.GetLogger()
		logger.Debug("Using cached user data", map[string]interface{}{
			"user_id": userID,
		})
		return user, nil
	}

	// Fetch from API
	resp, err := c.GetUsers(ctx, []string{userID}, nil)
	if err != nil {
		return nil, err
	}

	if len(resp.Data) == 0 {
		return nil, &APIError{
			StatusCode: 404,
			Message:    fmt.Sprintf("user not found: %s", userID),
		}
	}

	return &resp.Data[0], nil
}

// GetGames fetches game information from Twitch API
func (c *Client) GetGames(ctx context.Context, gameIDs, names []string) (*GamesResponse, error) {
	urlParams := url.Values{}

	for _, id := range gameIDs {
		urlParams.Add("id", id)
	}
	for _, name := range names {
		urlParams.Add("name", name)
	}

	resp, err := c.doRequest(ctx, "GET", "/games", urlParams)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("games request failed: %s", string(body)),
		}
	}

	var gamesResp GamesResponse
	if err := json.NewDecoder(resp.Body).Decode(&gamesResp); err != nil {
		return nil, fmt.Errorf("failed to decode games response: %w", err)
	}

	// Cache game data
	logger := utils.GetLogger()
	for i := range gamesResp.Data {
		game := &gamesResp.Data[i]
		if err := c.cache.CacheGame(ctx, game, 4*time.Hour); err != nil {
			logger.Warn("Failed to cache game data", map[string]interface{}{
				"game_id": game.ID,
				"error":   err.Error(),
			})
		}
	}

	logger.Debug("Fetched games", map[string]interface{}{
		"count": len(gamesResp.Data),
	})
	return &gamesResp, nil
}

// GetTopGames fetches the current top games on Twitch
func (c *Client) GetTopGames(ctx context.Context, first int, after string) (*TopGamesResponse, error) {
	params := url.Values{}

	if first <= 0 {
		first = 10
	}
	if first > 100 {
		first = 100
	}
	params.Set("first", fmt.Sprintf("%d", first))

	if after != "" {
		params.Set("after", after)
	}

	resp, err := c.doRequest(ctx, "GET", "/games/top", params)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("top games request failed: %s", string(body)),
		}
	}

	var topGamesResp TopGamesResponse
	if err := json.NewDecoder(resp.Body).Decode(&topGamesResp); err != nil {
		return nil, fmt.Errorf("failed to decode top games response: %w", err)
	}

	logger := utils.GetLogger()
	logger.Debug("Fetched top games", map[string]interface{}{
		"count": len(topGamesResp.Data),
	})

	return &topGamesResp, nil
}

// GetStreams fetches live streams for specified user IDs
func (c *Client) GetStreams(ctx context.Context, userIDs []string) (*StreamsResponse, error) {
	if len(userIDs) == 0 {
		return &StreamsResponse{Data: []Stream{}}, nil
	}

	// Twitch allows max 100 user_id parameters
	if len(userIDs) > 100 {
		userIDs = userIDs[:100]
	}

	params := url.Values{}
	for _, id := range userIDs {
		params.Add("user_id", id)
	}

	// Check cache first - use sorted IDs for consistent cache key
	sortedIDs := make([]string, len(userIDs))
	copy(sortedIDs, userIDs)
	sort.Strings(sortedIDs)
	cacheKey := fmt.Sprintf("%sstreams:%s", cacheKeyPrefix, strings.Join(sortedIDs, ","))

	if cached, ok := c.cache.Get(cacheKey); ok {
		if cachedStr, ok := cached.(string); ok {
			var streamsResp StreamsResponse
			if err := json.Unmarshal([]byte(cachedStr), &streamsResp); err == nil {
				logger := utils.GetLogger()
				logger.Debug("Using cached streams data", map[string]interface{}{
					"user_count": len(userIDs),
				})
				return &streamsResp, nil
			}
		}
	}

	resp, err := c.doRequest(ctx, "GET", "/streams", params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch streams: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("streams request failed: %s", string(body)),
		}
	}

	var streamsResp StreamsResponse
	if err := json.NewDecoder(resp.Body).Decode(&streamsResp); err != nil {
		return nil, fmt.Errorf("failed to decode streams response: %w", err)
	}

	// Cache for 30 seconds
	if data, err := json.Marshal(streamsResp); err == nil {
		c.cache.Set(cacheKey, string(data), 30*time.Second)
	}

	logger := utils.GetLogger()
	logger.Debug("Fetched live streams", map[string]interface{}{
		"live_count":      len(streamsResp.Data),
		"requested_users": len(userIDs),
	})
	return &streamsResp, nil
}

// GetChannels fetches channel information for specified broadcaster IDs
func (c *Client) GetChannels(ctx context.Context, broadcasterIDs []string) (*ChannelsResponse, error) {
	if len(broadcasterIDs) == 0 {
		return &ChannelsResponse{Data: []Channel{}}, nil
	}

	// Twitch allows max 100 broadcaster_id parameters
	if len(broadcasterIDs) > 100 {
		broadcasterIDs = broadcasterIDs[:100]
	}

	params := url.Values{}
	for _, id := range broadcasterIDs {
		params.Add("broadcaster_id", id)
	}

	// Check cache first - sort IDs for consistent cache key
	sortedIDs := make([]string, len(broadcasterIDs))
	copy(sortedIDs, broadcasterIDs)
	sort.Strings(sortedIDs)
	cacheKey := fmt.Sprintf("%schannels:%s", cacheKeyPrefix, strings.Join(sortedIDs, ","))
	if cached, ok := c.cache.Get(cacheKey); ok {
		if cachedStr, ok := cached.(string); ok {
			var channelsResp ChannelsResponse
			if err := json.Unmarshal([]byte(cachedStr), &channelsResp); err == nil {
				logger := utils.GetLogger()
				logger.Debug("Using cached channels data", map[string]interface{}{
					"broadcaster_count": len(broadcasterIDs),
				})
				return &channelsResp, nil
			}
		}
	}

	resp, err := c.doRequest(ctx, "GET", "/channels", params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch channels: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("channels request failed: %s", string(body)),
		}
	}

	var channelsResp ChannelsResponse
	if err := json.NewDecoder(resp.Body).Decode(&channelsResp); err != nil {
		return nil, fmt.Errorf("failed to decode channels response: %w", err)
	}

	// Cache for 1 hour
	if data, err := json.Marshal(channelsResp); err == nil {
		c.cache.Set(cacheKey, string(data), time.Hour)
	}

	logger := utils.GetLogger()
	logger.Debug("Fetched channels", map[string]interface{}{
		"count": len(channelsResp.Data),
	})
	return &channelsResp, nil
}

// GetVideos fetches videos from Twitch API
func (c *Client) GetVideos(ctx context.Context, userID, gameID string, videoIDs []string, first int, after, before string) (*VideosResponse, error) {
	params := url.Values{}

	if userID != "" {
		params.Set("user_id", userID)
	}
	if gameID != "" {
		params.Set("game_id", gameID)
	}
	for _, id := range videoIDs {
		params.Add("id", id)
	}
	if first > 0 {
		params.Set("first", fmt.Sprintf("%d", first))
	}
	if after != "" {
		params.Set("after", after)
	}
	if before != "" {
		params.Set("before", before)
	}

	resp, err := c.doRequest(ctx, "GET", "/videos", params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch videos: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("videos request failed: %s", string(body)),
		}
	}

	var videosResp VideosResponse
	if err := json.NewDecoder(resp.Body).Decode(&videosResp); err != nil {
		return nil, fmt.Errorf("failed to decode videos response: %w", err)
	}

	logger := utils.GetLogger()
	logger.Debug("Fetched videos", map[string]interface{}{
		"count": len(videosResp.Data),
	})
	return &videosResp, nil
}

// GetChannelFollowers fetches the followers for a broadcaster
func (c *Client) GetChannelFollowers(ctx context.Context, broadcasterID string, first int, after string) (*FollowersResponse, error) {
	params := url.Values{}
	params.Set("broadcaster_id", broadcasterID)

	if first > 0 {
		if first > 100 {
			first = 100
		}
		params.Set("first", fmt.Sprintf("%d", first))
	}
	if after != "" {
		params.Set("after", after)
	}

	resp, err := c.doRequest(ctx, "GET", "/channels/followers", params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch followers: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("followers request failed: %s", string(body)),
		}
	}

	var followersResp FollowersResponse
	if err := json.NewDecoder(resp.Body).Decode(&followersResp); err != nil {
		return nil, fmt.Errorf("failed to decode followers response: %w", err)
	}

	logger := utils.GetLogger()
	logger.Debug("Fetched followers", map[string]interface{}{
		"count":          len(followersResp.Data),
		"broadcaster_id": broadcasterID,
	})
	return &followersResp, nil
}

// GetStreamStatusByUsername fetches stream status for a specific username with caching
func (c *Client) GetStreamStatusByUsername(ctx context.Context, username string) (*Stream, *User, error) {
	if username == "" {
		return nil, nil, &APIError{
			StatusCode: 400,
			Message:    "username is required",
		}
	}

	// Check cache first
	cacheKey := fmt.Sprintf("%sstream_status:%s", cacheKeyPrefix, username)
	if cached, ok := c.cache.Get(cacheKey); ok {
		if cachedStr, ok := cached.(string); ok {
			var cachedData struct {
				Stream *Stream `json:"stream"`
				User   *User   `json:"user"`
			}
			if err := json.Unmarshal([]byte(cachedStr), &cachedData); err == nil {
				logger := utils.GetLogger()
				logger.Debug("Using cached stream status", map[string]interface{}{
					"username": username,
				})
				return cachedData.Stream, cachedData.User, nil
			}
		}
	}

	// First, get user info by username
	usersResp, err := c.GetUsers(ctx, nil, []string{username})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get user info: %w", err)
	}

	if len(usersResp.Data) == 0 {
		return nil, nil, &APIError{
			StatusCode: 404,
			Message:    fmt.Sprintf("user not found: %s", username),
		}
	}

	user := &usersResp.Data[0]

	// Get stream status by user ID
	streamsResp, err := c.GetStreams(ctx, []string{user.ID})
	if err != nil {
		return nil, user, fmt.Errorf("failed to get stream status: %w", err)
	}

	var stream *Stream
	if len(streamsResp.Data) > 0 && streamsResp.Data[0].Type == "live" {
		stream = &streamsResp.Data[0]
	}

	// Cache the result for 60 seconds
	cacheData := struct {
		Stream *Stream `json:"stream"`
		User   *User   `json:"user"`
	}{
		Stream: stream,
		User:   user,
	}
	if data, err := json.Marshal(cacheData); err == nil {
		c.cache.Set(cacheKey, string(data), 60*time.Second)
	}

	logger := utils.GetLogger()
	logger.Debug("Fetched stream status", map[string]interface{}{
		"username": username,
		"is_live":  stream != nil,
	})

	return stream, user, nil
}
