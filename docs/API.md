# API Documentation

## Base URL

```
Development: http://localhost:8080/api/v1
Production: https://api.clipper.app/api/v1
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Common Response Format

### Success Response

```json
{
  "data": {
    // Response data
  },
  "meta": {
    // Metadata (pagination, etc.)
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Request succeeded with no response body
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Endpoints

### Health Check

#### GET /health

Check if the API is running.

**Authentication:** None required

**Response:**

```json
{
  "status": "healthy"
}
```

---

### Authentication

#### POST /auth/twitch

Initiate Twitch OAuth flow.

**Authentication:** None required

**Response:**

```json
{
  "url": "https://id.twitch.tv/oauth2/authorize?..."
}
```

#### GET /auth/twitch/callback

Twitch OAuth callback endpoint.

**Authentication:** None required

**Query Parameters:**

- `code` (string, required) - Authorization code from Twitch
- `state` (string, required) - State token for CSRF protection

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123",
    "username": "johndoe",
    "email": "john@example.com",
    "twitch_id": "12345678"
  }
}
```

#### POST /auth/logout

Log out the current user.

**Authentication:** Required

**Response:**

```json
{
  "message": "Logged out successfully"
}
```

---

### Clips

#### GET /clips

Retrieve a list of clips.

**Authentication:** Optional (affects results)

**Query Parameters:**

- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Items per page
- `streamer` (string, optional) - Filter by streamer username
- `game` (string, optional) - Filter by game
- `tag` (string, optional) - Filter by tag
- `sort` (string, default: "created_at") - Sort field
- `order` (string, default: "desc") - Sort order (asc/desc)

**Response:**

```json
{
  "data": [
    {
      "id": "AwkwardHelplessSalamanderSwiftRage",
      "url": "https://clips.twitch.tv/...",
      "title": "Amazing play!",
      "streamer": "johndoe",
      "game": "League of Legends",
      "views": 1234,
      "duration": 30,
      "created_at": "2025-10-20T12:00:00Z",
      "thumbnail_url": "https://..."
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

#### GET /clips/:id

Get details for a specific clip.

**Authentication:** Optional

**Response:**

```json
{
  "data": {
    "id": "AwkwardHelplessSalamanderSwiftRage",
    "url": "https://clips.twitch.tv/...",
    "title": "Amazing play!",
    "streamer": "johndoe",
    "game": "League of Legends",
    "views": 1234,
    "duration": 30,
    "created_at": "2025-10-20T12:00:00Z",
    "thumbnail_url": "https://...",
    "tags": ["epic", "highlight"],
    "comments_count": 5,
    "likes_count": 42
  }
}
```

#### POST /clips

Add a clip to the database.

**Authentication:** Required

**Request Body:**

```json
{
  "twitch_clip_id": "AwkwardHelplessSalamanderSwiftRage",
  "tags": ["epic", "highlight"]
}
```

**Response:**

```json
{
  "data": {
    "id": "AwkwardHelplessSalamanderSwiftRage",
    "url": "https://clips.twitch.tv/...",
    // ... other clip data
  }
}
```

#### DELETE /clips/:id

Remove a clip from the database.

**Authentication:** Required (must be clip owner or admin)

**Response:**

```json
{
  "message": "Clip deleted successfully"
}
```

---

### Submissions

#### GET /submissions/metadata

Fetch clip metadata from Twitch API in real-time during the submission flow.

**Authentication:** Required

**Rate Limit:** 100 requests per hour per user

**Query Parameters:**

- `url` (string, required) - Twitch clip URL or clip ID

**Supported URL Formats:**

- `https://clips.twitch.tv/{clipId}`
- `https://www.twitch.tv/{streamer}/clip/{clipId}`
- `https://m.twitch.tv/{streamer}/clip/{clipId}` (mobile)
- Direct clip ID (e.g., `AwkwardHelplessSalamanderSwiftRage`)
- URLs with query parameters (auto-stripped)

**Response:**

```json
{
  "success": true,
  "data": {
    "clip_id": "AwkwardHelplessSalamanderSwiftRage",
    "title": "Amazing play!",
    "streamer_name": "shroud",
    "game_name": "Valorant",
    "view_count": 12543,
    "created_at": "2024-11-20T15:30:00Z",
    "thumbnail_url": "https://clips-media-assets2.twitch.tv/...",
    "duration": 30,
    "url": "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid URL format, missing parameters, or clip not found on Twitch

```json
{
  "success": false,
  "error": "This clip was not found on Twitch. It may have been deleted or the URL is incorrect.",
  "field": "url"
}
```

- `502 Bad Gateway`: Twitch API errors (rate limits, service unavailable)

```json
{
  "success": false,
  "error": "Unable to fetch clip metadata from Twitch. Please try again later."
}
```

**Caching:**

- Results are cached in Redis for 1 hour
- Cache key: `twitch:clip:metadata:{clipID}`

**Example Usage:**

```bash
# Using clip URL
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/v1/submissions/metadata?url=https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage"

# Using alternative URL format
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/v1/submissions/metadata?url=https://www.twitch.tv/shroud/clip/AwkwardHelplessSalamanderSwiftRage"

# Using direct clip ID
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8080/api/v1/submissions/metadata?url=AwkwardHelplessSalamanderSwiftRage"
```

---

### Collections

#### GET /collections

Get user's collections.

**Authentication:** Required

**Query Parameters:**

- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Best Plays 2025",
      "description": "My favorite clips from 2025",
      "clips_count": 42,
      "is_public": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-10-20T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

#### POST /collections

Create a new collection.

**Authentication:** Required

**Request Body:**

```json
{
  "name": "Best Plays 2025",
  "description": "My favorite clips from 2025",
  "is_public": true
}
```

**Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Best Plays 2025",
    "description": "My favorite clips from 2025",
    "clips_count": 0,
    "is_public": true,
    "created_at": "2025-10-20T12:00:00Z",
    "updated_at": "2025-10-20T12:00:00Z"
  }
}
```

#### GET /collections/:id

Get collection details with clips.

**Authentication:** Optional (must be public or owned by user)

**Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Best Plays 2025",
    "description": "My favorite clips from 2025",
    "is_public": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-10-20T12:00:00Z",
    "clips": [
      {
        "id": "AwkwardHelplessSalamanderSwiftRage",
        // ... clip data
      }
    ]
  }
}
```

#### PUT /collections/:id

Update collection details.

**Authentication:** Required (must be owner)

**Request Body:**

```json
{
  "name": "Best Plays 2025 Updated",
  "description": "Updated description",
  "is_public": false
}
```

#### DELETE /collections/:id

Delete a collection.

**Authentication:** Required (must be owner)

**Response:**

```json
{
  "message": "Collection deleted successfully"
}
```

#### POST /collections/:id/clips

Add a clip to a collection.

**Authentication:** Required (must be owner)

**Request Body:**

```json
{
  "clip_id": "AwkwardHelplessSalamanderSwiftRage"
}
```

#### DELETE /collections/:id/clips/:clip_id

Remove a clip from a collection.

**Authentication:** Required (must be owner)

---

### Users

#### GET /users/:id

Get user profile.

**Authentication:** Optional

**Response:**

```json
{
  "data": {
    "id": "123",
    "username": "johndoe",
    "display_name": "John Doe",
    "avatar_url": "https://...",
    "bio": "Twitch clip curator",
    "joined_at": "2025-01-01T00:00:00Z",
    "collections_count": 5,
    "clips_count": 42
  }
}
```

#### PUT /users/:id

Update user profile.

**Authentication:** Required (must be own profile)

**Request Body:**

```json
{
  "display_name": "John Doe",
  "bio": "Updated bio"
}
```

---

## Rate Limiting

Rate limits are applied per user (authenticated) or per IP (anonymous):

- Anonymous: 60 requests per minute
- Authenticated: 300 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1634567890
```

## Pagination

All list endpoints support pagination:

**Request:**

```
GET /api/v1/clips?page=2&limit=20
```

**Response includes pagination metadata:**

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

## Filtering and Sorting

Many list endpoints support filtering and sorting:

```
GET /api/v1/clips?streamer=johndoe&game=League+of+Legends&sort=views&order=desc
```

## Webhooks (Future)

Webhook support for real-time updates will be added in a future version.

## Versioning

The API is versioned in the URL path (`/api/v1/`). Breaking changes will result in a new version (`/api/v2/`).
