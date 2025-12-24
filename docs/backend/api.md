<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [API Reference](#api-reference)
  - [Base URL](#base-url)
  - [Authentication](#authentication)
  - [Common Patterns](#common-patterns)
    - [Success Response](#success-response)
    - [Error Response](#error-response)
    - [HTTP Status Codes](#http-status-codes)
    - [Pagination](#pagination)
  - [Endpoints](#endpoints)
    - [Health Check](#health-check)
    - [Authentication](#authentication-1)
    - [Clips](#clips)
    - [Comments](#comments)
    - [Search](#search)
    - [Users](#users)
    - [Streams](#streams)
    - [Premium](#premium)
  - [Rate Limiting](#rate-limiting)
  - [Versioning](#versioning)
  - [WebSockets (Future)](#websockets-future)
  - [Related Documentation](#related-documentation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "API Reference"
summary: "Complete REST API documentation including endpoints, authentication, pagination, and error handling."
tags: ["backend", "api", "rest", "endpoints"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["api docs", "rest api", "endpoints"]
links:
  - "[[authentication|Authentication Guide]]"
  - "[[rbac|RBAC Documentation]]"
---

# API Reference

Complete API documentation for the Clipper backend.

## Base URL

```
Development: http://localhost:8080/api/v1
Production: https://api.clpr.tv/v1
```

## Authentication

Most endpoints require authentication via JWT token:

```
Authorization: Bearer <jwt_token>
```

Get a token via [[authentication|Twitch OAuth flow]].

## Common Patterns

### Success Response

```json
{
  "data": {
    // Response payload
  },
  "meta": {
    // Pagination, counts, etc.
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `204 No Content`: Success, no body
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Auth required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate resource
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Pagination

List endpoints support pagination:

```
GET /api/v1/clips?page=2&limit=20
```

Response includes metadata:

```json
{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

## Endpoints

### Health Check

#### GET /health

System health status.

**Auth**: None

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "database": "up",
    "redis": "up",
    "opensearch": "up"
  }
}
```

---

### Authentication

See [[authentication|Authentication Guide]] for flow details.

#### POST /auth/twitch

Initiate Twitch OAuth.

**Auth**: None

**Response**:
```json
{
  "url": "https://id.twitch.tv/oauth2/authorize?..."
}
```

#### GET /auth/twitch/callback

OAuth callback endpoint.

**Auth**: None

**Query**:
- `code` (string): Authorization code
- `state` (string): CSRF token

**Response**:
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "123",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

#### POST /auth/logout

Log out current user.

**Auth**: Required

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

---

### Clips

#### GET /clips

List clips with filters.

**Auth**: Optional

**Query**:
- `page` (int, default 1): Page number
- `limit` (int, default 20, max 100): Items per page
- `streamer` (string): Filter by streamer username
- `game` (string): Filter by game
- `tag` (string): Filter by tag
- `sort` (string, default "created_at"): Sort field
- `order` (string, default "desc"): Sort order (asc/desc)

**Response**:
```json
{
  "data": [
    {
      "id": "AwkwardHelplessSalamander",
      "url": "https://clips.twitch.tv/...",
      "title": "Amazing play!",
      "streamer": "johndoe",
      "game": "Valorant",
      "views": 1234,
      "duration": 30,
      "created_at": "2025-10-20T12:00:00Z",
      "thumbnail_url": "https://...",
      "vote_score": 42,
      "comment_count": 5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### GET /clips/:id

Get clip details.

**Auth**: Optional

**Response**:
```json
{
  "data": {
    "id": "AwkwardHelplessSalamander",
    "url": "https://clips.twitch.tv/...",
    "title": "Amazing play!",
    "description": "Insane clutch",
    "streamer": "johndoe",
    "game": "Valorant",
    "views": 1234,
    "duration": 30,
    "created_at": "2025-10-20T12:00:00Z",
    "thumbnail_url": "https://...",
    "tags": ["clutch", "ace"],
    "vote_score": 42,
    "comment_count": 5,
    "user_vote": 1
  }
}
```

#### POST /clips

Submit a clip.

**Auth**: Required

**Body**:
```json
{
  "twitch_clip_id": "AwkwardHelplessSalamander",
  "tags": ["clutch", "ace"]
}
```

**Response**: Returns created clip (201 Created)

#### DELETE /clips/:id

Delete a clip (owner or admin only).

**Auth**: Required

**Response**: 204 No Content

#### POST /clips/:id/vote

Vote on a clip.

**Auth**: Required

**Body**:
```json
{
  "value": 1  // 1 = upvote, -1 = downvote, 0 = remove vote
}
```

**Response**:
```json
{
  "data": {
    "vote_score": 43,
    "user_vote": 1
  }
}
```

---

### Comments

> **📖 Complete Documentation**: See [[comment-api|Comment API Reference]] for full API documentation.
> See [[comments|Comment System Feature]] for comprehensive feature overview, E2E testing procedures, and examples.

**Features:**
- Reddit-style nested threading (up to 10 levels deep)
- Markdown support with XSS protection
- Voting and karma system
- Soft-delete preserves thread structure
- Optimized for 1000+ comments per clip
- Cross-platform parity (web + mobile)

**Available Endpoints:**
- `GET /api/v1/clips/:clipId/comments` - List comments with sorting/pagination
- `POST /api/v1/clips/:clipId/comments` - Create comment or reply (auth required)
- `GET /api/v1/comments/:id/replies` - Get nested replies
- `PUT /api/v1/comments/:id` - Edit comment (auth required)
- `DELETE /api/v1/comments/:id` - Delete comment (auth required)
- `POST /api/v1/comments/:id/vote` - Vote on comment (auth required)

#### GET /clips/:clip_id/comments

List comments for a clip with sorting and pagination.

**Auth**: Optional (required for user vote data)

**Query**:
- `limit` (number): Comments per page (default: 50, max: 100)
- `cursor` (number): Pagination offset (default: 0)
- `sort` (string): Sorting method - "best" (default), "new", "old", "controversial"

**Response**:
```json
{
  "comments": [
    {
      "id": "550e8400-...",
      "clip_id": "clip-uuid",
      "user_id": "user-uuid",
      "parent_comment_id": null,
      "content": "Great clip!",
      "rendered_content": "<p>Great clip!</p>",
      "vote_score": 5,
      "reply_count": 3,
      "is_edited": false,
      "is_removed": false,
      "created_at": "2024-12-15T12:30:00Z",
      "updated_at": "2024-12-15T12:30:00Z",
      "author_username": "jane",
      "author_display_name": "Jane Doe",
      "author_avatar_url": "https://...",
      "author_karma": 1234,
      "author_role": "user",
      "user_vote": 0,
      "replies": []
    }
  ],
  "next_cursor": 50,
  "has_more": true
}
```

#### POST /clips/:clip_id/comments

Create a new comment or reply to an existing comment.

**Auth**: Required

**Rate Limit**: 10 requests per minute

**Body**:
```json
{
  "content": "This is a **great** clip! [More info](https://example.com)",
  "parent_comment_id": "parent-uuid-or-null"
}
```

**Validation**:
- Content: 1-10,000 characters
- Parent comment must belong to same clip (if provided)
- Maximum nesting depth: 10 levels

**Response (201 Created)**:
```json
{
  "id": "new-comment-uuid",
  "clip_id": "clip-uuid",
  "user_id": "your-user-uuid",
  "parent_comment_id": "parent-uuid-or-null",
  "content": "This is a **great** clip! [More info](https://example.com)",
  "vote_score": 0,
  "is_edited": false,
  "is_removed": false,
  "created_at": "2024-12-15T10:30:00Z",
  "updated_at": "2024-12-15T10:30:00Z"
}
```

#### GET /comments/:id/replies

Get nested replies to a specific comment.

**Auth**: Optional

**Query**:
- `limit` (number): Replies per page (default: 50, max: 100)
- `cursor` (number): Pagination offset (default: 0)

**Response**: Same structure as list comments

#### PUT /comments/:id

Edit an existing comment.

**Auth**: Required (must be comment author or admin)

**Restrictions**:
- Authors: 15-minute edit window
- Admins: Can edit anytime
- Sets `is_edited` flag to true

**Body**:
```json
{
  "content": "Updated content"
}
```

**Response (200 OK)**:
```json
{
  "message": "Comment updated successfully"
}
```

#### DELETE /comments/:id

Soft-delete a comment (preserves thread structure).

**Auth**: Required (must be comment author, moderator, or admin)

**Body (optional)**:
```json
{
  "reason": "Removal reason (for moderators/admins)"
}
```

**Behavior**:
- Author deletion: Content replaced with "[deleted]"
- Moderator/admin removal: Content replaced with "[removed]"
- Nested replies remain visible
- Author loses -1 karma for self-deletion

**Response (200 OK)**:
```json
{
  "message": "Comment deleted successfully"
}
```

#### POST /comments/:id/vote

Vote on a comment (upvote, downvote, or remove vote).

**Auth**: Required

**Rate Limit**: 20 requests per minute

**Body**:
```json
{
  "vote": 1
}
```

**Vote Types**:
- `1`: Upvote (+1 karma to author)
- `-1`: Downvote (-1 karma to author)
- `0`: Remove vote (reverses karma change)

**Response (200 OK)**:
```json
{
  "message": "Vote recorded successfully"
}
```

**Auth**: Required

**Body**:
```json
{
  "content": "Great clip!",
  "parent_id": null  // Optional: reply to comment
}
```

**Response**: Returns created comment (201 Created)

#### PUT /comments/:id

Edit a comment (owner only).

**Auth**: Required

**Body**:
```json
{
  "content": "Updated comment"
}
```

#### DELETE /comments/:id

Delete a comment (owner or admin only).

**Auth**: Required

**Response**: 204 No Content

#### POST /comments/:id/vote

Vote on a comment.

**Auth**: Required

**Body**:
```json
{
  "value": 1  // 1 = upvote, -1 = downvote, 0 = remove
}
```

---

### Search

See [[search|Search Platform]] for complete documentation.

#### GET /search

Search clips, users, games, tags.

**Auth**: Optional

**Query**:
- `q` (string, required): Query using [[../decisions/adr-003-advanced-query-language|query language]]
- `type` (string): "clips" | "users" | "games" | "tags" | "all"
- Legacy params (deprecated): `game_id`, `creator_id`, `tags`, etc.

**Examples**:
```
?q=valorant
?q=game:valorant tag:clutch votes:>50
?q="epic comeback" after:last-week
```

**Response**:
```json
{
  "data": {
    "clips": [...],
    "users": [...],
    "games": [...],
    "tags": [...]
  },
  "meta": {
    "query": "valorant",
    "total_results": 156,
    "execution_time_ms": 42
  }
}
```

#### GET /search/suggestions

Autocomplete suggestions.

**Auth**: Optional

**Query**:
- `q` (string): Partial query
- `type` (string): Filter suggestion type

**Response**:
```json
{
  "data": [
    {
      "text": "valorant",
      "type": "game",
      "count": 1234
    },
    {
      "text": "valorant clutch",
      "type": "query",
      "count": 156
    }
  ]
}
```

---

### Users

#### GET /users/:id

Get user profile.

**Auth**: Optional

**Response**:
```json
{
  "data": {
    "id": "123",
    "username": "johndoe",
    "display_name": "John Doe",
    "avatar_url": "https://...",
    "bio": "Clip curator",
    "joined_at": "2025-01-01T00:00:00Z",
    "karma": 42,
    "clips_count": 15,
    "favorites_count": 50
  }
}
```

#### PUT /users/:id

Update own profile.

**Auth**: Required (own profile)

**Body**:
```json
{
  "display_name": "John Doe",
  "bio": "Updated bio"
}
```

#### GET /users/:id/clips

Get user's submitted clips.

**Auth**: Optional

**Query**: Standard pagination

#### GET /users/:id/favorites

Get user's favorited clips.

**Auth**: Required (own favorites) or public profiles

#### POST /clips/:id/favorite

Add clip to favorites.

**Auth**: Required

#### DELETE /clips/:id/favorite

Remove from favorites.

**Auth**: Required

---

### Streams

See [[../features/live-streams|Live Streams Guide]] for feature details.

#### GET /streams/:streamer

Get current stream status for a streamer.

**Auth**: Optional

**Path Parameters**:
- `streamer` (string): Twitch username (4-25 characters, alphanumeric + underscore)

**Response (200 OK)**:
```json
{
  "streamer_username": "shroud",
  "is_live": true,
  "title": "Valorant Ranked | !pc !sponsor",
  "game_name": "VALORANT",
  "viewer_count": 15234,
  "thumbnail_url": "https://static-cdn.jtvnw.net/previews-ttv/live_user_shroud-{width}x{height}.jpg",
  "started_at": "2024-12-23T18:30:00Z",
  "last_went_offline": null
}
```

**Response (404 Not Found)** - Streamer doesn't exist:
```json
{
  "error": "streamer not found"
}
```

**Cache**: Responses cached for 60 seconds in Redis

#### POST /streams/:streamer/clips

Create a clip from a live stream.

**Auth**: Required

**Rate Limit**: 10 requests per hour per user

**Path Parameters**:
- `streamer` (string): Twitch username

**Request Body**:
```json
{
  "streamer_username": "shroud",
  "start_time": 150.5,
  "end_time": 180.5,
  "quality": "1080p",
  "title": "Amazing ace clutch!"
}
```

**Validation**:
- `title`: 3-255 characters (required)
- `start_time`: Non-negative number (required)
- `end_time`: Must be greater than start_time (required)
- Duration (`end_time - start_time`): 5-60 seconds
- `quality`: One of "source", "1080p", "720p" (required)
- Stream must be currently live

**Response (201 Created)**:
```json
{
  "clip_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing"
}
```

**Error Responses**:

400 Bad Request - Invalid input:
```json
{
  "error": "clip duration must be between 5 and 60 seconds"
}
```

400 Bad Request - Stream offline:
```json
{
  "error": "stream must be live to create a clip"
}
```

404 Not Found - Stream doesn't exist:
```json
{
  "error": "stream not found or VOD not available"
}
```

#### POST /streams/:streamer/follow

Follow a streamer for live notifications.

**Auth**: Required

**Rate Limit**: 20 requests per minute per user

**Path Parameters**:
- `streamer` (string): Twitch username (4-25 characters)

**Request Body** (optional):
```json
{
  "notifications_enabled": true
}
```

**Response (200 OK)**:
```json
{
  "following": true,
  "notifications_enabled": true,
  "message": "Successfully following shroud"
}
```

**Validation**:
- Username must be valid Twitch format
- User cannot follow themselves (if streamer)

#### DELETE /streams/:streamer/follow

Unfollow a streamer.

**Auth**: Required

**Path Parameters**:
- `streamer` (string): Twitch username

**Response (200 OK)**:
```json
{
  "following": false,
  "message": "Successfully unfollowed shroud"
}
```

#### GET /streams/:streamer/follow-status

Get follow status for a specific streamer.

**Auth**: Required

**Path Parameters**:
- `streamer` (string): Twitch username

**Response (200 OK)**:
```json
{
  "following": true,
  "notifications_enabled": true
}
```

**Response (200 OK)** - Not following:
```json
{
  "following": false,
  "notifications_enabled": false
}
```

#### GET /streams/following

Get list of followed streamers for the authenticated user.

**Auth**: Required

**Query Parameters**:
- `limit` (int, default 50): Items per page
- `offset` (int, default 0): Pagination offset

**Response (200 OK)**:
```json
{
  "follows": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user-uuid",
      "streamer_username": "shroud",
      "notifications_enabled": true,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "user_id": "user-uuid",
      "streamer_username": "pokimane",
      "notifications_enabled": false,
      "created_at": "2024-01-16T15:30:00Z",
      "updated_at": "2024-01-20T12:00:00Z"
    }
  ],
  "count": 2
}
```

---

### Premium

See [[../premium/overview|Premium Overview]] for feature details.

#### GET /premium/tiers

Get available subscription tiers.

**Auth**: Optional

**Response**:
```json
{
  "data": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "features": [...]
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 4.99,
      "interval": "month",
      "features": [...]
    }
  ]
}
```

#### POST /premium/checkout

Create Stripe checkout session.

**Auth**: Required

**Body**:
```json
{
  "tier_id": "pro",
  "interval": "month"
}
```

**Response**:
```json
{
  "checkout_url": "https://checkout.stripe.com/..."
}
```

#### POST /premium/cancel

Cancel subscription.

**Auth**: Required

---

## Rate Limiting

Rate limits per user (authenticated) or IP (anonymous):

- Anonymous: 60 requests/minute
- Authenticated: 300 requests/minute

Headers:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1634567890
```

## Versioning

API versioned in URL: `/api/v1/`

Breaking changes will increment version: `/api/v2/`

## WebSockets (Future)

Real-time features will use WebSocket connections (planned).

---

## Related Documentation

- [[architecture|Backend Architecture]]
- [[authentication|Authentication]]
- [[rbac|RBAC]]
- [[search|Search Platform]]
- [[../premium/overview|Premium Overview]]

---

[[../index|← Back to Index]]
