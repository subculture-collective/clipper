package twitch

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/url"
	"sort"
	"strings"
	"time"
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
		body, _ := io.ReadAll(resp.Body)
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("clips request failed: %s", string(body)),
		}
	}

	var clipsResp ClipsResponse
	if err := json.NewDecoder(resp.Body).Decode(&clipsResp); err != nil {
		return nil, fmt.Errorf("failed to decode clips response: %w", err)
	}

	log.Printf("[Twitch API] Fetched %d clips", len(clipsResp.Data))
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
		body, _ := io.ReadAll(resp.Body)
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
	for i := range usersResp.Data {
		user := &usersResp.Data[i]
		if err := c.cache.CacheUser(ctx, user, time.Hour); err != nil {
			log.Printf("Failed to cache user data for user ID %s: %v", user.ID, err)
		}
	}

	log.Printf("[Twitch API] Fetched %d users", len(usersResp.Data))
	return &usersResp, nil
}

// GetUser fetches a single user by ID
func (c *Client) GetUser(ctx context.Context, userID string) (*User, error) {
	// Try cache first
	if user, err := c.cache.CachedUser(ctx, userID); err == nil {
		log.Printf("[Twitch API] Using cached user data for user ID %s", userID)
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
		body, _ := io.ReadAll(resp.Body)
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
	for i := range gamesResp.Data {
		game := &gamesResp.Data[i]
		if err := c.cache.CacheGame(ctx, game, 4*time.Hour); err != nil {
			log.Printf("Failed to cache game data for game ID %s: %v", game.ID, err)
		}
	}

	log.Printf("[Twitch API] Fetched %d games", len(gamesResp.Data))
	return &gamesResp, nil
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
				log.Printf("[Twitch API] Using cached streams data for %d users", len(userIDs))
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
		body, _ := io.ReadAll(resp.Body)
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

	log.Printf("[Twitch API] Fetched %d live streams out of %d requested users", len(streamsResp.Data), len(userIDs))
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

	// Check cache first
	cacheKey := fmt.Sprintf("%schannels:%s", cacheKeyPrefix, strings.Join(broadcasterIDs, ","))
	if cached, ok := c.cache.Get(cacheKey); ok {
		if cachedStr, ok := cached.(string); ok {
			var channelsResp ChannelsResponse
			if err := json.Unmarshal([]byte(cachedStr), &channelsResp); err == nil {
				log.Printf("[Twitch API] Using cached channels data for %d broadcasters", len(broadcasterIDs))
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
		body, _ := io.ReadAll(resp.Body)
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

	log.Printf("[Twitch API] Fetched %d channels", len(channelsResp.Data))
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
		body, _ := io.ReadAll(resp.Body)
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("videos request failed: %s", string(body)),
		}
	}

	var videosResp VideosResponse
	if err := json.NewDecoder(resp.Body).Decode(&videosResp); err != nil {
		return nil, fmt.Errorf("failed to decode videos response: %w", err)
	}

	log.Printf("[Twitch API] Fetched %d videos", len(videosResp.Data))
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
		body, _ := io.ReadAll(resp.Body)
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("followers request failed: %s", string(body)),
		}
	}

	var followersResp FollowersResponse
	if err := json.NewDecoder(resp.Body).Decode(&followersResp); err != nil {
		return nil, fmt.Errorf("failed to decode followers response: %w", err)
	}

	log.Printf("[Twitch API] Fetched %d followers for broadcaster %s", len(followersResp.Data), broadcasterID)
	return &followersResp, nil
}
