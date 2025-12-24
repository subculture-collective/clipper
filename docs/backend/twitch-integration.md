---
title: "Twitch API Integration"
summary: "This package provides a comprehensive Twitch API integration for fetching and syncing Twitch clips."
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Twitch API Integration

This package provides a comprehensive Twitch API integration for fetching and syncing Twitch clips.

## Features

### Twitch API Client (`pkg/twitch/`)

- **Authentication**: Automatic OAuth2 app access token management with auto-refresh
- **Rate Limiting**: Token bucket algorithm respecting Twitch's 800 requests/minute limit
- **Retry Logic**: Exponential backoff for transient failures (401, 429, 503)
- **Caching**: Redis-backed cache for user and game metadata (1 hour TTL)
- **Error Handling**: Proper handling of all Twitch API error responses

#### Supported Endpoints

- `GET /clips` - Fetch clips by broadcaster, game, or clip ID with pagination
- `GET /users` - Fetch user/broadcaster information with caching
- `GET /games` - Fetch game metadata with caching

### Clip Sync Service (`internal/services/clip_sync_service.go`)

Multiple sync strategies for fetching clips:

- **Game-Based**: Fetch clips from a specific game
- **Broadcaster-Based**: Fetch clips from a specific streamer
- **Trending**: Fetch trending clips from multiple top games

Features:

- Automatic duplicate detection
- View count updates for existing clips
- Detailed sync statistics
- URL parsing for user-submitted clips

### Background Scheduler (`internal/scheduler/clip_sync_scheduler.go`)

- Periodic clip synchronization (default: every 15 minutes)
- Graceful start/stop
- Automatic trending clip discovery
- Configurable interval

### API Endpoints

#### Admin Endpoints (Require Authentication)

**POST `/api/v1/admin/sync/clips`** - Manually trigger clip sync

Request body:

```json
{
  "strategy": "trending",  // "game", "broadcaster", or "trending"
  "game_id": "12345",      // Required for "game" strategy
  "broadcaster_id": "67890", // Required for "broadcaster" strategy
  "hours": 24,             // Fetch clips from last N hours (default: 24)
  "limit": 100             // Max clips to fetch (default: 100)
}
```

Response:

```json
{
  "message": "Sync completed",
  "strategy": "trending",
  "clips_fetched": 100,
  "clips_created": 85,
  "clips_updated": 15,
  "clips_skipped": 0,
  "errors": [],
  "duration_ms": 12500,
  "started_at": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T10:00:12Z"
}
```

**GET `/api/v1/admin/sync/status`** - Get sync status

Response:

```json
{
  "status": "ready",
  "message": "Sync service is operational"
}
```

#### User Endpoints (Require Authentication)

**POST `/api/v1/clips/request`** - Submit a clip by URL (Rate limited: 5/hour)

Request body:

```json
{
  "clip_url": "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage"
}
```

Response:

```json
{
  "message": "Clip added successfully",
  "clip": {
    "id": "uuid",
    "twitch_clip_id": "AwkwardHelplessSalamanderSwiftRage",
    "title": "Amazing Play",
    ...
  }
}
```

## Configuration

Add the following to your `.env` file:

```env
# Twitch API Configuration
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-client-secret
```

### Getting Twitch Credentials

1. Go to <https://dev.twitch.tv/console/apps>
2. Register a new application
3. Copy the Client ID and generate a Client Secret
4. Add them to your `.env` file

## Usage

### Initialize the Twitch Client

```go
import (
    "github.com/subculture-collective/clipper/config"
    "github.com/subculture-collective/clipper/pkg/twitch"
)

cfg, _ := config.Load()
twitchClient, err := twitch.NewClient(&cfg.Twitch, redisClient)
if err != nil {
    log.Fatal(err)
}
```

### Fetch Clips

```go
params := &twitch.ClipParams{
    GameID:    "12345",
    First:     100,
    StartedAt: time.Now().Add(-24 * time.Hour),
    EndedAt:   time.Now(),
}

clipsResp, err := twitchClient.GetClips(ctx, params)
if err != nil {
    log.Fatal(err)
}

for _, clip := range clipsResp.Data {
    fmt.Printf("Clip: %s - %s\n", clip.Title, clip.URL)
}
```

### Sync Service

```go
import (
    "github.com/subculture-collective/clipper/internal/services"
)

syncService := services.NewClipSyncService(twitchClient, clipRepo)

// Sync trending clips
stats, err := syncService.SyncTrendingClips(ctx, 24, 10)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Synced %d clips\n", stats.ClipsCreated)
```

### Background Scheduler

```go
import (
    "github.com/subculture-collective/clipper/internal/scheduler"
)

// Create scheduler that runs every 15 minutes
scheduler := scheduler.NewClipSyncScheduler(syncService, 15)

// Start in background
go scheduler.Start(context.Background())

// Stop when done
defer scheduler.Stop()
```

## Database Schema

The integration uses the existing `clips` table:

```sql
CREATE TABLE clips (
    id UUID PRIMARY KEY,
    twitch_clip_id VARCHAR(100) UNIQUE NOT NULL,
    twitch_clip_url TEXT NOT NULL,
    embed_url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    creator_name VARCHAR(100) NOT NULL,
    creator_id VARCHAR(50),
    broadcaster_name VARCHAR(100) NOT NULL,
    broadcaster_id VARCHAR(50),
    game_id VARCHAR(50),
    game_name VARCHAR(100),
    language VARCHAR(10),
    thumbnail_url TEXT,
    duration FLOAT,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    imported_at TIMESTAMP DEFAULT NOW(),
    vote_score INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    favorite_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_nsfw BOOLEAN DEFAULT false,
    is_removed BOOLEAN DEFAULT false,
    removed_reason TEXT
);
```

## Rate Limiting

- **Twitch API**: 800 requests per minute (enforced by token bucket algorithm)
- **User Submissions**: 5 clip submissions per hour per user
- **Admin Syncs**: No rate limit (use responsibly)

## Caching

The following data is cached in Redis:

- **Access Token**: Cached until expiry (minus 5 minutes safety margin)
- **User Data**: 1 hour TTL
- **Game Data**: 1 hour TTL

## Error Handling

The client handles these error scenarios:

- **401 Unauthorized**: Automatically refreshes access token and retries
- **429 Too Many Requests**: Exponential backoff and retry
- **503 Service Unavailable**: Exponential backoff and retry
- **404 Not Found**: Returns error without retry
- **Other errors**: Returns error without retry

## Testing

Run tests:

```bash
cd backend
go test ./internal/services/... -v
go test ./pkg/twitch/... -v
```

## Architecture

```
┌─────────────────┐
│   API Handler   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Sync Service   │─────▶│   Twitch     │
│                 │      │   API Client │
└────────┬────────┘      └──────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐      ┌──────────────┐
│  Clip Repo      │      │    Redis     │
│  (Database)     │      │   (Cache)    │
└─────────────────┘      └──────────────┘
         ▲
         │
┌────────┴────────┐
│   Scheduler     │
│  (Background)   │
└─────────────────┘
```

## Future Enhancements

- [ ] Add more sync strategies (by creator, by category)
- [ ] Implement clip quality scoring
- [ ] Add auto-tagging based on clip metadata
- [ ] Support for user-followed streamers sync
- [ ] Webhook support for real-time clip notifications
- [ ] Analytics and metrics dashboard
- [ ] Advanced error recovery and retry mechanisms
