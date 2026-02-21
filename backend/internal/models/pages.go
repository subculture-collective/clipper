package models

import "time"

// PageData holds common SEO and layout data for all pSEO pages.
type PageData struct {
	Title       string // <title> tag
	Description string // meta description
	CanonicalURL string
	OGImage     string
	SchemaJSON  string // JSON-LD markup
	BaseURL     string
}

// StreamerPageData is the template data for /clips/streamer/:broadcasterName.
type StreamerPageData struct {
	PageData
	BroadcasterName string
	BroadcasterID   string
	TotalClips      int
	TotalViews      int64
	AvgVoteScore    float64
	FollowerCount   int
	TopClips        []Clip
	GamesPlayed     []GameWithClipCount
}

// GamePageData is the template data for /clips/game/:gameSlug.
type GamePageData struct {
	PageData
	Game            GameEntity
	TopClips        []Clip
	TopBroadcasters []BroadcasterWithClipCount
	TotalClips      int
}

// BestOfPageData is the template data for /clips/best/:period and /clips/best/:year/:month.
type BestOfPageData struct {
	PageData
	Period    string // e.g. "this-week", "this-month", "January 2026"
	PeriodKey string // URL-safe key, e.g. "this-week", "2026/01"
	StartDate time.Time
	EndDate   time.Time
	TopClips  []Clip
	Total     int
}

// StreamerGamePageData is the template data for /clips/streamer/:broadcasterName/:gameSlug.
type StreamerGamePageData struct {
	PageData
	BroadcasterName string
	BroadcasterID   string
	Game            GameEntity
	Clips           []Clip
	Total           int
}

// GameWithClipCount pairs a game with its clip count for a given broadcaster.
type GameWithClipCount struct {
	GameID    string  `json:"game_id" db:"game_id"`
	Name      string  `json:"name" db:"name"`
	ClipCount int     `json:"clip_count" db:"clip_count"`
	BoxArtURL *string `json:"box_art_url,omitempty" db:"box_art_url"`
}

// BroadcasterWithClipCount pairs a broadcaster with clip stats.
type BroadcasterWithClipCount struct {
	BroadcasterID   string `json:"broadcaster_id" db:"broadcaster_id"`
	BroadcasterName string `json:"broadcaster_name" db:"broadcaster_name"`
	ClipCount       int    `json:"clip_count" db:"clip_count"`
	TotalViews      int64  `json:"total_views" db:"total_views"`
}
