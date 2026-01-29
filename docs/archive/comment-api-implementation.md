---
title: Comment API Endpoints - Implementation Summary
summary: This document summarizes the implementation of nested comment tree structure support in the backend API.
tags: ['archive', 'implementation', 'summary']
area: docs
status: archived
owner: team-core
version: "1.0"
last_reviewed: 2026-01-29
---

# Comment API Endpoints - Implementation Summary

## Overview

This document summarizes the implementation of nested comment tree structure support in the backend API.

## Changes Implemented

### 1. API Endpoints

#### GET `/api/v1/clips/{clipId}/comments`

Returns comments for a specified clip.

**Query Parameters:**
- `sort` (optional): Sort order - `best` (default), `new`, `old`, `controversial`
- `limit` (optional): Number of comments to return (1-100, default: 50)
- `cursor` (optional): Pagination offset (default: 0)
- `include_replies` (optional): Include nested replies tree (default: false)

**Default Behavior (`include_replies=false`):**
- Returns flat array of top-level comments only
- Each comment includes `reply_count` field
- `replies` array is empty `[]`

**Nested Behavior (`include_replies=true`):**
- Returns nested tree structure
- Recursively loads replies up to 10 levels deep
- Each reply can contain its own `replies` array
- Depth limiting prevents performance issues

**Example Request (Flat):**
```bash
curl http://localhost:8080/api/v1/clips/{clipId}/comments?sort=best&limit=20
```

**Example Request (Nested):**
```bash
curl http://localhost:8080/api/v1/clips/{clipId}/comments?include_replies=true
```

**Response Structure:**
```json
{
  "comments": [
    {
      "id": "uuid",
      "clip_id": "uuid",
      "user_id": "uuid",
      "parent_comment_id": null,
      "content": "Comment text",
      "vote_score": 42,
      "reply_count": 3,
      "is_edited": false,
      "is_removed": false,
      "removed_reason": null,
      "created_at": "2025-12-14T10:30:00Z",
      "updated_at": "2025-12-14T10:30:00Z",
      "author_username": "user123",
      "author_display_name": "User Name",
      "author_avatar_url": "https://example.com/avatar.jpg",
      "author_karma": 150,
      "author_role": "user",
      "user_vote": 1,
      "rendered_content": "<p>Comment text</p>",
      "replies": [
        // Nested replies (when include_replies=true)
      ]
    }
  ],
  "next_cursor": 50,
  "has_more": true
}
```

#### GET `/api/v1/comments/{commentId}/replies`

Returns direct replies (1 level deep) to a specified comment.

**Query Parameters:**
- `limit` (optional): Number of replies to return (1-100, default: 50)
- `cursor` (optional): Pagination offset (default: 0)

**Behavior:**
- Always returns flat array
- Returns only direct children of the specified comment
- Does NOT recursively load nested replies
- `replies` array is always empty `[]`

**Example Request:**
```bash
curl http://localhost:8080/api/v1/comments/{commentId}/replies?limit=20
```

**Response Structure:**
```json
{
  "replies": [
    {
      "id": "uuid",
      "parent_comment_id": "{commentId}",
      // ... same fields as above
      "replies": []  // Always empty for this endpoint
    }
  ],
  "next_cursor": 20,
  "has_more": false
}
```

### 2. Response Fields

All comment objects include:
- **Core Fields:**
  - `id`: Comment UUID
  - `clip_id`: Parent clip UUID
  - `user_id`: Author UUID
  - `parent_comment_id`: Parent comment UUID (null for top-level)
  - `content`: Raw markdown content

- **Engagement Fields:**
  - `vote_score`: Net vote count (upvotes - downvotes)
  - `reply_count`: Number of direct replies
  - `user_vote`: Current user's vote (1, -1, or null)

- **Status Fields:**
  - `is_edited`: Whether comment has been edited
  - `is_removed`: Whether comment has been removed
  - `removed_reason`: Reason for removal (if applicable)

- **Timestamps:**
  - `created_at`: Creation timestamp
  - `updated_at`: Last update timestamp

- **Author Information:**
  - `author_username`: Username
  - `author_display_name`: Display name
  - `author_avatar_url`: Avatar URL (nullable)
  - `author_karma`: Karma points
  - `author_role`: User role (user, moderator, admin)

- **Rendering:**
  - `rendered_content`: HTML-rendered markdown content
  - `replies`: Array of nested replies (structure depends on endpoint)

### 3. Implementation Details

#### Depth Limiting

- Maximum nesting depth: 10 levels
- Enforced in `buildReplyTree` method
- Prevents infinite recursion and performance issues
- Comments beyond depth 10 are not loaded (front-end can show "Load more" link)

#### Performance Optimization

- Nested replies per level limited to 50
- This is reasonable for UX while preventing excessive database queries
- Top-level comments use paginated limit (from query param)
- Database queries are optimized with proper indexing

#### Markdown Processing

- All content is processed through goldmark markdown parser
- HTML is sanitized with bluemonday
- Supports: bold, italic, strikethrough, links, code blocks, lists, tables, blockquotes
- XSS protection enabled

#### Error Handling

- Invalid UUID: Returns 400 Bad Request
- Invalid clip/comment: Repository returns error, handler returns 500
- Missing parent comment: Validation error in service layer

### 4. Testing

#### Unit Tests

- `TestListComments_InvalidClipID`: Validates UUID parsing
- `TestGetReplies_InvalidCommentID`: Validates UUID parsing
- All existing tests continue to pass

#### Manual Testing

To test manually:
1. Start Docker services: `make docker-up`
2. Run migrations: `make migrate-up`
3. Seed database: `make migrate-seed`
4. Start backend: `cd backend && go run cmd/api/main.go`
5. Test endpoints:
   ```bash
   # Get flat comments
   curl http://localhost:8080/api/v1/clips/{clipId}/comments
   
   # Get nested tree
   curl http://localhost:8080/api/v1/clips/{clipId}/comments?include_replies=true
   
   # Get direct replies
   curl http://localhost:8080/api/v1/comments/{commentId}/replies
   ```

## Database Schema

The implementation uses the existing schema with `reply_count` field:
- Migration `000046_add_comment_reply_count.up.sql` added the field
- Automatic trigger maintains count on INSERT/UPDATE/DELETE
- Index on `parent_comment_id` for efficient reply queries

## Frontend Integration

### Recommended Usage Pattern

**Initial Page Load:**
1. Fetch top-level comments without nested replies:
   ```
   GET /api/clips/{clipId}/comments?limit=20
   ```
2. Display comments with collapsed reply indicators (using `reply_count`)

**User Expands Thread:**
1. Fetch nested tree for that comment:
   ```
   GET /api/clips/{clipId}/comments?include_replies=true&limit=1&cursor=X
   ```
   OR load just direct replies:
   ```
   GET /api/comments/{commentId}/replies
   ```

**Progressive Loading:**
- For deeply nested threads beyond level 10, show "Load more replies" link
- Fetch remaining replies via `/comments/{commentId}/replies`

## Performance Considerations

1. **Database Load:**
   - Nested tree loading makes multiple queries (one per level)
   - Limited to 50 replies per level to prevent excessive queries
   - Maximum depth of 10 prevents runaway recursion

2. **Response Size:**
   - With `include_replies=true`, response can be large
   - Consider using without nested replies for initial load
   - Load nested replies on-demand or for specific threads

3. **Caching Opportunities:**
   - Comment trees can be cached with Redis
   - Cache invalidation on new comment/vote/edit
   - TTL-based cache for hot comment sections

## Security

- ✅ No SQL injection vulnerabilities (parameterized queries)
- ✅ XSS protection via markdown sanitization
- ✅ UUID validation prevents malformed requests
- ✅ Depth limiting prevents DoS via deep recursion
- ✅ Reply limit prevents excessive resource consumption
- ✅ All tests pass including CodeQL security scan

## API Documentation

Full OpenAPI specification available at:
`docs/openapi/comments-api.yaml`

Includes:
- Complete endpoint documentation
- Request/response examples
- Field descriptions
- Error responses
- Authentication requirements
