---

title: "Scraped Clips Feature Documentation"
summary: "The Scraped Clips feature provides a separate UI section for discovering clips that have been automa"
tags: ['product']
area: "product"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11

---

# Scraped Clips Feature Documentation

## Overview

The Scraped Clips feature provides a separate UI section for discovering clips that have been automatically scraped from Twitch but not yet submitted by community members. This creates a discovery mechanism that separates user-submitted content (primary) from automatically discovered content (secondary).

**Note:** For a comprehensive overview of how clips are served across different pages, see [Clip Serving Strategy](./clip-serving-strategy.md).

## Feature Description

### Purpose

-   Provide users with a curated feed of interesting Twitch clips
-   Encourage community engagement by allowing users to submit discovered clips
-   Create a clear distinction between user-submitted and auto-discovered content
-   Serve as a content pool for users to discover and post clips

### Content Filtering Strategy

The application uses a three-tier approach to serving clips:

1. **Main Feeds** (Home, Hot, New, Top, Rising) - Show only user-submitted clips
2. **Discovery Page** (`/discover`) - Shows all clips (user-submitted + scraped)
3. **Scraped Clips Page** (`/discover/scraped`) - Shows only scraped clips

This ensures that main feeds contain high-quality, community-curated content while still providing discovery mechanisms for finding new clips.

### User Experience

Users can:

1. Browse scraped clips through a dedicated page at `/discover/scraped`
2. Filter and sort clips by:
    - Trending (popular clips with recent activity)
    - Latest (most recently scraped)
    - Top Views (most viewed on Twitch)
3. Toggle "Top 10k Streamers Only" filter
4. Click "Post This Clip" button to submit a clip to the community
5. Search and filter within scraped clips

## Technical Implementation

### Frontend Components

#### 1. ScrapedClipsPage (`/frontend/src/pages/ScrapedClipsPage.tsx`)

-   Main page component for scraped clips discovery
-   Located at route: `/discover/scraped`
-   Features:
    -   Page header with description
    -   Info banner explaining the "From Twitch" nature
    -   Tabbed interface (Trending, Latest, Top Views)
    -   Top 10k streamers toggle
    -   Integration with ScrapedClipFeed component

#### 2. ScrapedClipFeed (`/frontend/src/components/clip/ScrapedClipFeed.tsx`)

-   Feed component for displaying scraped clips
-   Reuses existing ClipCard component
-   Features:
    -   Infinite scroll pagination
    -   Pull-to-refresh (mobile)
    -   Filter and sort controls
    -   Loading/error/empty states
    -   Responsive design

#### 3. ClipCard Component

-   Existing component automatically shows "Post This Clip" button for clips without `submitted_by` data
-   Button navigates to submit page with clip URL pre-filled

### Backend API

#### Endpoint: `GET /api/v1/scraped-clips`

**Description:** Returns clips that haven't been claimed by users (where `submitted_by_user_id IS NULL`)

**Query Parameters:**

-   `page` (integer): Page number for pagination (default: 1)
-   `limit` (integer): Items per page (default: 25, max: 100)
-   `sort` (string): Sort order - `trending`, `new`, `views`, `top`, `rising`, `discussed` (default: `new`)
-   `timeframe` (string): Time filter for top/discussed sorts - `hour`, `day`, `week`, `month`, `year`, `all`
-   `game_id` (string): Filter by game ID
-   `broadcaster_id` (string): Filter by broadcaster ID
-   `tag` (string): Filter by tag slug
-   `search` (string): Search in clip titles
-   `language` (string): Filter by language code
-   `top10k_streamers` (boolean): Only show clips from top 10k streamers

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "twitch_clip_id": "string",
      "twitch_clip_url": "string",
      "title": "string",
      "broadcaster_name": "string",
      "game_name": "string",
      "view_count": 12345,
      "vote_score": 0,
      "submitted_by": null,
      ...
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 1500,
    "total_pages": 60,
    "has_next": true,
    "has_prev": false
  }
}
```

#### Database Layer

**Repository Method:** `ListScrapedClipsWithFilters`

-   Location: `/backend/internal/repository/clip_repository.go`
-   Filters clips where `submitted_by_user_id IS NULL`
-   Supports same filtering/sorting as regular clips
-   Excludes removed and optionally hidden clips

**Service Method:** `ListScrapedClips`

-   Location: `/backend/internal/services/clip_service.go`
-   Adds Redis caching for non-authenticated requests
-   Enriches clips with vote counts and user-specific data
-   Returns clips with `ClipWithUserData` structure

### Navigation Integration

The feature is accessible through:

1. **Desktop Navigation:** "🔍 Discover" button in main header
2. **Mobile Navigation:** "🔍 Discover" in mobile menu
3. **Direct URL:** `/discover/scraped`

### Data Model

Scraped clips are identified by:

-   `submitted_by_user_id` field is `NULL`
-   Automatically imported from Twitch via sync jobs
-   Can be "claimed" when a user submits them (field becomes non-null)

## User Flows

### Discovering Scraped Clips

1. User clicks "Discover" in navigation
2. Arrives at `/discover/scraped` page
3. Sees info banner explaining these are from Twitch
4. Can browse, filter, and sort clips
5. Infinite scroll loads more clips as needed

### Submitting a Scraped Clip

1. User finds interesting clip in scraped feed
2. Clicks "Post This Clip" button on clip card
3. Redirects to `/submit` with clip URL pre-filled
4. User can add custom title, tags, and submit
5. Upon submission, clip is "claimed" and moves to main feed

## Analytics Considerations

The following analytics should be tracked (future enhancement):

-   Page views for `/discover/scraped`
-   "Post This Clip" button clicks
-   Conversion rate (views → clip submissions)
-   Most viewed/engaged scraped clips
-   Filter/sort usage patterns

## Future Enhancements

Potential improvements:

1. Add analytics tracking for scraped clips engagement
2. Personalized recommendations based on user preferences
3. Bulk import workflows for content curators
4. Auto-suggestion of tags for scraped clips
5. Notification system for new trending scraped clips

## Testing

### Frontend Testing

-   Component renders without errors
-   Pagination works correctly
-   Filters apply properly
-   "Post This Clip" button navigates correctly
-   Responsive design on mobile/desktop

### Backend Testing

-   API endpoint returns correct data
-   Filters work as expected
-   Pagination metadata accurate
-   Only returns unclaimed clips
-   Proper error handling

### Integration Testing

-   End-to-end clip discovery flow
-   Clip submission from scraped feed
-   Clip claiming mechanism works correctly

## Configuration

No special configuration required. The feature uses existing:

-   Database schema (clips table)
-   Authentication system
-   Caching infrastructure (Redis)
-   API infrastructure

## Security Considerations

-   Public endpoint (no authentication required)
-   Read-only access to scraped clips
-   Submission requires authentication (existing flow)
-   Rate limiting applies to submission endpoint

## Performance

-   Redis caching reduces database load
-   Pagination limits response size
-   Infinite scroll provides smooth UX
-   Materialized views could be added for hot/trending sorts if needed

## Deployment

No special deployment steps required:

1. Backend changes deploy with standard API deployment
2. Frontend changes deploy with standard web deployment
3. No database migrations needed (uses existing schema)
4. No environment variables required
