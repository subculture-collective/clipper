---
title: "Discovery Lists Feature"
summary: "This document describes the Discovery Lists feature that provides Top, New, and Discussed clip feeds"
tags: ['product']
area: "product"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Discovery Lists Feature

This document describes the Discovery Lists feature that provides Top, New, and Discussed clip feeds with optional filtering by top 10k streamers.

## Overview

The Discovery Lists feature enhances clip browsing by:

- Adding a "Discussed" sort option for clips with the most comments
- Providing a filter to show only clips from top 10,000 streamers
- Creating a unified Discovery page with tabbed navigation

## Backend API

### Endpoints

#### GET /api/v1/clips

Query parameters:

- `sort` - Sort order: `hot`, `new`, `top`, `rising`, or `discussed`
- `timeframe` - Time range for `top` and `discussed`: `hour`, `day`, `week`, `month`, `year`, `all`
- `top10k_streamers` - Boolean filter: `true` to show only clips from top 10k streamers
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 25, max: 100)

Example requests:

```bash
# Get most discussed clips from the past week
GET /api/v1/clips?sort=discussed&timeframe=week

# Get top clips from top 10k streamers
GET /api/v1/clips?sort=top&timeframe=day&top10k_streamers=true

# Get new clips from top 10k streamers
GET /api/v1/clips?sort=new&top10k_streamers=true
```

### Database Schema

#### `top_streamers` table

Stores information about the top streamers on the platform:

```sql
CREATE TABLE top_streamers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcaster_id VARCHAR(50) UNIQUE NOT NULL,
    broadcaster_name VARCHAR(100) NOT NULL,
    rank INT NOT NULL,
    follower_count BIGINT DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

Indexes:

- `idx_top_streamers_rank` - For ranking queries
- `idx_top_streamers_broadcaster_id` - For existence checks
- `idx_clips_comment_count` - For discussed sorting
- `idx_clips_broadcaster_discussed` - For filtering by top streamers with discussed sort

### Repository Methods

#### Top Streamer Management

```go
// Insert or update a top streamer record
func (r *ClipRepository) UpsertTopStreamer(ctx context.Context, broadcasterID, broadcasterName string, rank int, followerCount, viewCount int64) error

// Clear all top streamer records
func (r *ClipRepository) ClearTopStreamers(ctx context.Context) error

// Get count of top streamers
func (r *ClipRepository) GetTopStreamersCount(ctx context.Context) (int, error)

// Check if broadcaster is a top streamer
func (r *ClipRepository) IsTopStreamer(ctx context.Context, broadcasterID string) (bool, error)
```

#### Clip Filtering

The `ListWithFilters` method now supports:

- `Sort: "discussed"` - Orders by `comment_count DESC`
- `Top10kStreamers: true` - Filters to only top streamers

## Frontend Implementation

### Discovery Page

Located at `/discover`, the Discovery page provides:

- Tabbed navigation for Top, New, and Discussed clips
- Toggle switch for "Top 10k Streamers" filter
- URL parameter persistence for sharing filtered views

Example URLs:

```
/discover?tab=top&top10k_streamers=true
/discover?tab=discussed&top10k_streamers=true
/discover?tab=new
```

### Components Updated

- `FeedFilters.tsx` - Added "Discussed" sort option
- `ClipFeed.tsx` - Supports new filter parameters
- Type definitions updated in `types/clip.ts`

### API Client

The `fetchClips` function in `lib/clip-api.ts` now passes the `top10k_streamers` parameter:

```typescript
if (filters.top10k_streamers !== undefined) {
  params.top10k_streamers = filters.top10k_streamers;
}
```

## Testing

### Backend Tests

Location: `backend/internal/repository/clip_repository_test.go`

Tests cover:

1. `TestClipRepository_ListWithFilters_Discussed` - Verifies discussed sorting
2. `TestClipRepository_TopStreamers` - Tests top streamer CRUD operations
3. `TestClipRepository_ListWithFilters_Top10kStreamers` - Tests filtering by top streamers

Run tests:

```bash
cd backend
go test ./internal/repository/...
```

### Manual Testing

1. Start the development environment:

```bash
make docker-up
make migrate-up
```

2. Seed the database with sample data:

```bash
# From backend directory
psql $DATABASE_URL -f migrations/seed.sql
```

3. Test the endpoints:

```bash
# Test discussed sort
curl "http://localhost:8080/api/v1/clips?sort=discussed"

# Test top 10k filter
curl "http://localhost:8080/api/v1/clips?sort=new&top10k_streamers=true"
```

4. Test the frontend:

- Navigate to `http://localhost:5173/discover`
- Try different tabs (Top/New/Discussed)
- Toggle "Top 10k Streamers" filter
- Verify URL parameters update correctly

## Performance Considerations

### Indexes

The migration adds several indexes to optimize queries:

1. `idx_clips_comment_count` - Speeds up discussed sorting
2. `idx_clips_broadcaster_discussed` - Composite index for top streamer + discussed queries
3. `idx_top_streamers_broadcaster_id` - Fast lookup for top streamer status

### Query Optimization

The `discussed` sort uses:

```sql
ORDER BY c.comment_count DESC, c.created_at DESC
```

The top 10k filter uses an EXISTS subquery:

```sql
EXISTS (
  SELECT 1 FROM top_streamers ts
  WHERE ts.broadcaster_id = c.broadcaster_id
)
```

## Future Enhancements

1. **Admin Endpoint** - Add endpoint to update top streamers list from Twitch API
2. **Scheduled Updates** - Implement periodic sync of top streamers data
3. **Caching** - Add Redis caching for top streamers list
4. **Analytics** - Track usage of Discovery page tabs
5. **Personalization** - Allow users to customize discovery filters
6. **Additional Filters** - Add filters for specific games or tags on Discovery page

## Migration

The feature is deployed via migration `000010_add_discovery_lists_support`:

```bash
# Apply migration
make migrate-up

# Rollback migration
make migrate-down
```

## Configuration

No additional configuration is required. The feature is enabled by default once the migration is applied.

To populate top streamers data, use one of these methods:

1. Manual insertion via seed file (for development)
2. Admin API endpoint (to be implemented)
3. Direct database insertion
4. Scheduled sync job (to be implemented)

## Maintenance

### Updating Top Streamers List

Currently, the top streamers list must be updated manually. Future implementations will include:

1. Admin endpoint for manual updates
2. Scheduled job to sync with Twitch API
3. Webhook integration for real-time updates

Example manual update:

```sql
INSERT INTO top_streamers (broadcaster_id, broadcaster_name, rank, follower_count, view_count)
VALUES ('123456', 'StreamerName', 1, 5000000, 300000000)
ON CONFLICT (broadcaster_id) 
DO UPDATE SET 
    broadcaster_name = EXCLUDED.broadcaster_name,
    rank = EXCLUDED.rank,
    follower_count = EXCLUDED.follower_count,
    view_count = EXCLUDED.view_count,
    last_updated = NOW();
```

## Troubleshooting

### No clips shown with top10k filter

- Ensure top_streamers table has data
- Check that clip broadcaster_ids match top_streamers records
- Verify migration has been applied

### Discussed sort showing wrong order

- Check that comment_count is being updated correctly
- Verify idx_clips_comment_count index exists
- Review query performance with EXPLAIN ANALYZE

### Frontend toggle not working

- Check browser console for errors
- Verify API response includes expected data
- Check URL parameters are being set correctly
