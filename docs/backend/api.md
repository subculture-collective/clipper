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
Production: https://api.clipper.app/api/v1
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

#### GET /clips/:clip_id/comments

List comments for a clip.

**Auth**: Optional

**Query**:
- `page`, `limit`: Pagination
- `sort` (string): "best" | "new" | "controversial"

**Response**:
```json
{
  "data": [
    {
      "id": "550e8400-...",
      "user": {
        "id": "123",
        "username": "jane",
        "avatar_url": "https://..."
      },
      "content": "Great clip!",
      "created_at": "2025-10-20T12:30:00Z",
      "vote_score": 5,
      "user_vote": 0
    }
  ],
  "meta": {...}
}
```

#### POST /clips/:clip_id/comments

Add a comment.

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
