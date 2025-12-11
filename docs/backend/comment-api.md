<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Comment System API Documentation](#comment-system-api-documentation)
  - [Overview](#overview)
  - [Endpoints](#endpoints)
    - [List Comments for a Clip](#list-comments-for-a-clip)
    - [Create Comment](#create-comment)
    - [Get Replies to a Comment](#get-replies-to-a-comment)
    - [Edit Comment](#edit-comment)
    - [Delete Comment](#delete-comment)
    - [Vote on Comment](#vote-on-comment)
  - [Markdown Support](#markdown-support)
    - [Allowed Elements](#allowed-elements)
    - [Blocked Elements](#blocked-elements)
    - [Example](#example)
  - [Security Features](#security-features)
    - [XSS Prevention](#xss-prevention)
    - [Rate Limiting](#rate-limiting)
    - [Authentication & Authorization](#authentication--authorization)
    - [SQL Injection Prevention](#sql-injection-prevention)
  - [Performance Considerations](#performance-considerations)
    - [Pagination](#pagination)
    - [Database Optimization](#database-optimization)
    - [Future Optimizations](#future-optimizations)
  - [Error Responses](#error-responses)
    - [400 Bad Request](#400-bad-request)
    - [401 Unauthorized](#401-unauthorized)
    - [403 Forbidden](#403-forbidden)
    - [429 Too Many Requests](#429-too-many-requests)
    - [500 Internal Server Error](#500-internal-server-error)
  - [Best Practices](#best-practices)
    - [For Clients](#for-clients)
    - [For Moderators](#for-moderators)
    - [For Users](#for-users)
  - [Karma System](#karma-system)
    - [How Karma Works](#how-karma-works)
    - [Karma Display](#karma-display)
  - [Constants](#constants)
  - [Database Schema](#database-schema)
    - [Comments Table](#comments-table)
    - [Comment Votes Table](#comment-votes-table)
    - [Triggers](#triggers)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Comment System API Documentation"
summary: "The comment system provides threaded discussions on clips with markdown support, voting, and moderat"
tags: ['backend', 'api']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Comment System API Documentation

## Overview

The comment system provides threaded discussions on clips with markdown support, voting, and moderation controls.

## Endpoints

### List Comments for a Clip

Get paginated comments for a specific clip with various sorting options.

**Endpoint:** `GET /api/v1/clips/:clipId/comments`

**Query Parameters:**

- `sort` (optional) - Sorting method: `best` (default), `new`, `old`, `controversial`
- `limit` (optional) - Number of comments per page (default: 50, max: 100)
- `cursor` (optional) - Pagination offset (default: 0)

**Authentication:** Optional (affects whether user vote data is included)

**Response:**

```json
{
  "comments": [
    {
      "id": "uuid",
      "clip_id": "uuid",
      "user_id": "uuid",
      "parent_comment_id": "uuid or null",
      "content": "Original markdown content",
      "rendered_content": "Sanitized HTML",
      "vote_score": 42,
      "is_edited": false,
      "is_removed": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "author_username": "username",
      "author_display_name": "Display Name",
      "author_avatar_url": "https://...",
      "author_karma": 1234,
      "author_role": "user",
      "reply_count": 5,
      "user_vote": 1,
      "replies": []
    }
  ],
  "next_cursor": 50,
  "has_more": true
}
```

**Sorting Algorithms:**

- **best** - Wilson confidence score (default, best for quality)
- **new** - Most recent first
- **old** - Oldest first
- **controversial** - High engagement but mixed votes

### Create Comment

Post a new comment or reply to an existing comment.

**Endpoint:** `POST /api/v1/clips/:clipId/comments`

**Authentication:** Required

**Rate Limit:** 10 requests per minute

**Request Body:**

```json
{
  "content": "Your markdown comment here",
  "parent_comment_id": "uuid or null"
}
```

**Validation:**

- Content length: 1-10,000 characters
- Parent comment must belong to same clip (if provided)
- Maximum nesting depth: 10 levels

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "clip_id": "uuid",
  "user_id": "uuid",
  "parent_comment_id": "uuid or null",
  "content": "Your markdown comment here",
  "vote_score": 0,
  "is_edited": false,
  "is_removed": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Karma:** User receives +1 karma for posting a comment

### Get Replies to a Comment

Retrieve nested replies to a specific comment.

**Endpoint:** `GET /api/v1/comments/:id/replies`

**Query Parameters:**

- `limit` (optional) - Number of replies per page (default: 50, max: 100)
- `cursor` (optional) - Pagination offset (default: 0)

**Authentication:** Optional

**Response:** Same structure as list comments

### Edit Comment

Update the content of an existing comment.

**Endpoint:** `PUT /api/v1/comments/:id`

**Authentication:** Required (must be comment author or admin)

**Request Body:**

```json
{
  "content": "Updated markdown content"
}
```

**Restrictions:**

- Authors can edit within 15 minutes of posting
- Admins can edit anytime
- Sets `is_edited` flag to true

**Response:** `200 OK`

```json
{
  "message": "Comment updated successfully"
}
```

### Delete Comment

Soft-delete a comment (keeps structure for replies).

**Endpoint:** `DELETE /api/v1/comments/:id`

**Authentication:** Required (must be comment author, moderator, or admin)

**Request Body (optional):**

```json
{
  "reason": "Removal reason (for moderators/admins)"
}
```

**Behavior:**

- Author deletion: Content replaced with "[deleted]"
- Moderator/admin removal: Content replaced with "[removed]"
- Author loses -1 karma for self-deletion
- Comment structure preserved for existing replies

**Response:** `200 OK`

```json
{
  "message": "Comment deleted successfully"
}
```

### Vote on Comment

Upvote, downvote, or remove vote on a comment.

**Endpoint:** `POST /api/v1/comments/:id/vote`

**Authentication:** Required

**Rate Limit:** 20 requests per minute

**Request Body:**

```json
{
  "vote": 1
}
```

**Vote Types:**

- `1` - Upvote (+1 karma to author)
- `-1` - Downvote (-1 karma to author)
- `0` - Remove vote (reverses karma change)

**Response:** `200 OK`

```json
{
  "message": "Vote recorded successfully"
}
```

## Markdown Support

### Allowed Elements

- **Formatting:** Bold, italic, strikethrough
- **Links:** Auto-linked URLs with nofollow/noreferrer
- **Code:** Inline code and code blocks
- **Quotes:** Blockquotes
- **Lists:** Ordered and unordered lists
- **Headers:** H1-H6
- **Tables:** Full table support

### Blocked Elements

- HTML tags (script, iframe, etc.)
- Images (to prevent hotlinking abuse)
- Embedded content

### Example

**Input:**

```markdown
This is **bold** and *italic* text.

> A quote

- List item 1
- List item 2

[GitHub](https://github.com)
```

**Output:**

```html
<p>This is <strong>bold</strong> and <em>italic</em> text.</p>
<blockquote>
<p>A quote</p>
</blockquote>
<ul>
<li>List item 1</li>
<li>List item 2</li>
</ul>
<p><a href="https://github.com" rel="nofollow noreferrer" target="_blank">GitHub</a></p>
```

## Security Features

### XSS Prevention

- All user content is processed through goldmark markdown parser
- HTML output is sanitized using bluemonday
- Script tags, iframes, and dangerous elements are stripped
- External links have nofollow/noreferrer/target=_blank

### Rate Limiting

- Comment creation: 10 per minute
- Voting: 20 per minute
- Helps prevent spam and abuse

### Authentication & Authorization

- Write operations require authentication
- Users can only edit/delete their own comments (within time limits)
- Moderators and admins have extended permissions
- Role-based access control enforced at handler level

### SQL Injection Prevention

- All database queries use parameterized statements
- No string concatenation in SQL queries
- pgx driver provides built-in protection

## Performance Considerations

### Pagination

- Cursor-based pagination for efficient large dataset handling
- Default limit: 50 comments
- Maximum limit: 100 comments

### Database Optimization

- Indexes on clip_id, user_id, parent_comment_id
- Vote scores updated via database triggers
- Recursive CTEs for efficient tree queries

### Future Optimizations

- Redis caching for comment trees (10 min TTL)
- Lazy loading for deep comment chains
- Database query optimization for Wilson score calculation

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid request body"
}
```

Common causes:

- Invalid UUID format
- Content too long/short
- Maximum nesting depth exceeded
- Parent comment not found

### 401 Unauthorized

```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "error": "You can only edit your own comments"
}
```

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to retrieve comments"
}
```

## Best Practices

### For Clients

1. Cache comment trees locally to reduce API calls
2. Implement optimistic UI updates for votes
3. Show "Load more replies" for deeply nested threads
4. Respect rate limits with client-side throttling
5. Handle markdown rendering on server-side responses

### For Moderators

1. Provide clear removal reasons when removing comments
2. Use soft-delete to preserve context for other users
3. Monitor controversial comments for potential issues

### For Users

1. Use markdown formatting for better readability
2. Edit comments quickly if needed (15-minute window)
3. Vote thoughtfully to help surface quality content
4. Keep discussions civil and on-topic

## Karma System

### How Karma Works

- **Comment Creation:** +1 karma
- **Comment Upvote:** +1 karma to author
- **Comment Downvote:** -1 karma to author
- **Self-Deletion:** -1 karma (reverses creation bonus)
- **Vote Removal:** Reverses karma change

### Karma Display

User karma is shown in comment author information to indicate community standing.

## Constants

```go
MaxCommentLength    = 10000  // characters
MinCommentLength    = 1      // character
MaxNestingDepth     = 10     // levels
EditWindowMinutes   = 15     // minutes
KarmaPerComment     = 1      // points
KarmaPerUpvote      = 1      // points
KarmaPerDownvote    = -1     // points
```

## Database Schema

### Comments Table

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    vote_score INT DEFAULT 0,
    is_edited BOOLEAN DEFAULT false,
    is_removed BOOLEAN DEFAULT false,
    removed_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Comment Votes Table

```sql
CREATE TABLE comment_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, comment_id)
);
```

### Triggers

- `update_comment_vote_score` - Auto-updates comment vote_score
- `update_clip_comment_count` - Auto-updates clip comment_count
- `update_comments_updated_at` - Auto-updates updated_at timestamp
