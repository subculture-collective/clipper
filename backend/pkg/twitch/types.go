package twitch

import "time"

// ClipParams contains parameters for fetching clips
type ClipParams struct {
	BroadcasterID string
	GameID        string
	ClipIDs       []string
	StartedAt     time.Time
	EndedAt       time.Time
	First         int    // Max 100
	After         string // Pagination cursor
	Before        string // Pagination cursor
}

// Clip represents a Twitch clip from the API
type Clip struct {
	ID              string    `json:"id"`
	URL             string    `json:"url"`
	EmbedURL        string    `json:"embed_url"`
	BroadcasterID   string    `json:"broadcaster_id"`
	BroadcasterName string    `json:"broadcaster_name"`
	CreatorID       string    `json:"creator_id"`
	CreatorName     string    `json:"creator_name"`
	VideoID         string    `json:"video_id"`
	GameID          string    `json:"game_id"`
	Language        string    `json:"language"`
	Title           string    `json:"title"`
	ViewCount       int       `json:"view_count"`
	CreatedAt       time.Time `json:"created_at"`
	ThumbnailURL    string    `json:"thumbnail_url"`
	Duration        float64   `json:"duration"`
	VodOffset       *int      `json:"vod_offset"`
}

// ClipsResponse represents the response from the clips endpoint
type ClipsResponse struct {
	Data       []Clip     `json:"data"`
	Pagination Pagination `json:"pagination"`
}

// User represents a Twitch user from the API
type User struct {
	ID              string    `json:"id"`
	Login           string    `json:"login"`
	DisplayName     string    `json:"display_name"`
	Type            string    `json:"type"`
	BroadcasterType string    `json:"broadcaster_type"`
	Description     string    `json:"description"`
	ProfileImageURL string    `json:"profile_image_url"`
	OfflineImageURL string    `json:"offline_image_url"`
	ViewCount       int       `json:"view_count"`
	Email           string    `json:"email,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

// UsersResponse represents the response from the users endpoint
type UsersResponse struct {
	Data []User `json:"data"`
}

// Game represents a Twitch game/category from the API
type Game struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	BoxArtURL string `json:"box_art_url"`
	IGDBID    string `json:"igdb_id"`
}

// GamesResponse represents the response from the games endpoint
type GamesResponse struct {
	Data []Game `json:"data"`
}

// Pagination contains cursor information for paginated responses
type Pagination struct {
	Cursor string `json:"cursor"`
}

// Stream represents a Twitch stream from the API
type Stream struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	UserLogin    string    `json:"user_login"`
	UserName     string    `json:"user_name"`
	GameID       string    `json:"game_id"`
	GameName     string    `json:"game_name"`
	Type         string    `json:"type"` // "live" or ""
	Title        string    `json:"title"`
	ViewerCount  int       `json:"viewer_count"`
	StartedAt    time.Time `json:"started_at"`
	Language     string    `json:"language"`
	ThumbnailURL string    `json:"thumbnail_url"`
	TagIDs       []string  `json:"tag_ids"`
	IsMature     bool      `json:"is_mature"`
}

// StreamsResponse represents the response from the streams endpoint
type StreamsResponse struct {
	Data       []Stream   `json:"data"`
	Pagination Pagination `json:"pagination"`
}
