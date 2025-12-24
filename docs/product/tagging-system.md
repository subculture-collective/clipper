---
title: "Tagging System Implementation"
summary: "This document describes the implementation of the comprehensive tagging system for Clipper."
tags: ['product']
area: "product"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Tagging System Implementation

This document describes the implementation of the comprehensive tagging system for Clipper.

## Overview

The tagging system allows clips to be categorized and filtered using tags. Tags are automatically generated based on clip content, and users can manually add or remove tags. Admins have full control over tag management.

## Backend Implementation

### Database Schema

The tagging system uses two main tables:

#### `tags` table

- `id` (UUID): Primary key
- `name` (VARCHAR): Display name
- `slug` (VARCHAR): URL-friendly identifier (unique)
- `description` (TEXT): Optional description
- `color` (VARCHAR): Hex color code for UI display
- `usage_count` (INT): Number of clips using this tag
- `created_at` (TIMESTAMP): Creation timestamp

#### `clip_tags` junction table

- `clip_id` (UUID): Foreign key to clips
- `tag_id` (UUID): Foreign key to tags
- `created_at` (TIMESTAMP): When tag was added
- Primary key: (clip_id, tag_id)

### API Endpoints

#### Public Endpoints

**GET /api/v1/tags**

- List all tags with sorting and pagination
- Query params: `sort` (popularity|alphabetical|recent), `limit`, `page`
- Returns: List of tags with metadata

**GET /api/v1/tags/search**

- Search tags by name
- Query params: `q` (search query), `limit`
- Returns: Matching tags

**GET /api/v1/tags/:slug**

- Get tag details
- Returns: Tag with clip count

**GET /api/v1/tags/:slug/clips**

- Get clips with a specific tag
- Query params: `limit`, `page`
- Returns: Paginated list of clips

**GET /api/v1/clips/:id/tags**

- Get all tags for a clip
- Returns: List of tags

#### Authenticated Endpoints

**POST /api/v1/clips/:id/tags**

- Add tags to a clip
- Body: `{ "tag_slugs": ["tag1", "tag2"] }`
- Rate limited: 10 requests per minute
- Max 10 tags per request, 15 tags per clip total

**DELETE /api/v1/clips/:id/tags/:slug**

- Remove a tag from a clip
- Requires authentication (author or admin)

#### Admin Endpoints

**POST /api/v1/admin/tags**

- Create a new tag
- Body: `{ "name": "Tag Name", "slug": "tag-slug", "description": "...", "color": "#FF0000" }`

**PUT /api/v1/admin/tags/:id**

- Update tag metadata
- Body: Same as create

**DELETE /api/v1/admin/tags/:id**

- Delete a tag and all associations
- Requires confirmation

### Auto-Tagging System

The auto-tagging service automatically generates tags for clips based on:

#### Pattern Matching

Detects keywords in clip titles:

- **ace**, **5k**, **team wipe** → "Ace"
- **clutch**, **1v[2-5]** → "Clutch"
- **fail**, **epic fail** → "Fail"
- **rage**, **angry** → "Rage"
- **funny**, **lol**, **lmao** → "Funny"
- **insane**, **crazy**, **amazing** → "Insane"
- **lucky**, **rng** → "Lucky"
- **bug**, **glitch** → "Bug"
- **pro**, **professional** → "Pro"
- **highlight**, **best** → "Highlight"
- **speedrun**, **wr** → "Speedrun"
- **tutorial**, **guide** → "Tutorial"

#### Game Name

Creates a tag from the game name (e.g., "Counter-Strike" → "counter-strike")

#### Broadcaster Name

Creates a tag from the broadcaster name (e.g., "Shroud" → "shroud")

#### Duration

- Clips < 15 seconds → "short"
- Clips > 2 minutes → "long"

#### Language

Maps language codes to readable names:

- "en" → "english"
- "es" → "spanish"
- "ja" → "japanese"
- etc.

### Repository Layer

**TagRepository** (`backend/internal/repository/tag_repository.go`)

- `Create`: Insert new tag
- `GetByID`: Retrieve by UUID
- `GetBySlug`: Retrieve by slug
- `List`: List tags with sorting/pagination
- `Count`: Total tag count
- `Search`: Search by name/slug
- `Update`: Update tag metadata
- `Delete`: Remove tag and associations
- `AddTagToClip`: Associate tag with clip
- `RemoveTagFromClip`: Remove association
- `GetClipTags`: Get all tags for a clip
- `GetClipsByTag`: Get clips with a tag
- `CountClipsByTag`: Count clips with a tag
- `GetOrCreateTag`: Get existing or create new tag
- `GetClipTagCount`: Count tags on a clip

### Service Layer

**AutoTagService** (`backend/internal/services/auto_tag_service.go`)

- `GenerateTagsForClip`: Generate tag slugs based on clip data
- `ApplyAutoTags`: Generate and apply tags to a clip
- Helper functions for slugification and language mapping

### Handler Layer

**TagHandler** (`backend/internal/handlers/tag_handler.go`)

- Implements all API endpoints
- Validates input (tag limits, color format, slug format)
- Handles authentication and authorization
- Returns appropriate HTTP status codes

## Frontend Implementation

### Type Definitions

**Tag** (`frontend/src/types/tag.ts`)

```typescript
interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  usage_count: number;
  created_at: string;
}
```

### API Client

**tagApi** (`frontend/src/lib/tag-api.ts`)

- Complete client for all tag endpoints
- Type-safe using TypeScript interfaces
- Axios-based with error handling

### React Hooks

**useTags** (`frontend/src/hooks/useTags.ts`)

- `useTags`: List tags
- `useTagSearch`: Search tags
- `useTag`: Get tag details
- `useClipsByTag`: Get clips by tag
- `useClipTags`: Get clip tags
- `useAddTagsToClip`: Add tags (mutation)
- `useRemoveTagFromClip`: Remove tag (mutation)
- `useCreateTag`: Create tag (admin)
- `useUpdateTag`: Update tag (admin)
- `useDeleteTag`: Delete tag (admin)

All hooks use React Query for caching and automatic refetching.

### UI Components

#### TagChip

**File**: `frontend/src/components/tag/TagChip.tsx`

Displays a single tag as a clickable chip with:

- Custom background color
- Size variants (small, medium)
- Optional remove button
- Links to tag page or custom click handler

Usage:

```tsx
<TagChip 
  tag={tag} 
  size="small"
  removable={true}
  onRemove={(slug) => console.log('Remove', slug)}
/>
```

#### TagList

**File**: `frontend/src/components/tag/TagList.tsx`

Displays a list of tags for a clip with:

- Loading skeleton
- Configurable max visible tags
- "+" indicator for additional tags

Usage:

```tsx
<TagList clipId={clip.id} maxVisible={5} />
```

#### TagSelector

**File**: `frontend/src/components/tag/TagSelector.tsx`

Interactive tag selection component with:

- Search with autocomplete
- Tag suggestions from API
- Selected tags with remove buttons
- Tag count indicator
- Max tag validation

Usage:

```tsx
<TagSelector
  selectedTags={tags}
  onTagsChange={setTags}
  maxTags={15}
/>
```

### Integration

Tags are displayed on ClipCard components automatically via the TagList component. The component:

1. Fetches tags using `useClipTags` hook
2. Displays loading skeleton while fetching
3. Shows tags as clickable chips
4. Links to tag pages for filtering

## Testing

### Backend Tests

**Tag Repository Tests** (`backend/internal/repository/tag_repository_test.go`)

- Mock repository implementation
- Tests for CRUD operations
- Tests for clip-tag associations
- Tests for usage count tracking

**Auto-Tag Service Tests** (`backend/internal/services/auto_tag_service_test.go`)

- Pattern matching validation
- Duration-based tagging logic
- Slug generation
- Language mapping

All tests pass with 100% success rate.

### Security

CodeQL analysis completed with 0 alerts:

- No SQL injection vulnerabilities
- No XSS vulnerabilities
- No authentication/authorization issues
- No sensitive data exposure

## Usage Examples

### Automatically tag a clip

```go
// In clip sync service or handler
autoTagService.ApplyAutoTags(ctx, clip)
```

### Add tags via API

```bash
curl -X POST http://localhost:8080/api/v1/clips/{id}/tags \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"tag_slugs": ["ace", "clutch", "epic"]}'
```

### Search tags

```bash
curl http://localhost:8080/api/v1/tags/search?q=ace
```

### Get clips by tag

```bash
curl http://localhost:8080/api/v1/tags/ace/clips?limit=20&page=1
```

## Configuration

No additional configuration required. The tagging system uses:

- Existing database connection
- Existing authentication middleware
- Existing rate limiting configuration

## Performance Considerations

1. **Database Indexes**: Tags table has indexes on `slug` and `usage_count`
2. **Usage Count**: Updated via database triggers for consistency
3. **Caching**: Tag lists should be cached in Redis for frequently accessed data
4. **Pagination**: All list endpoints support pagination
5. **Rate Limiting**: Tag creation/modification is rate limited

## Future Enhancements

Potential improvements (not implemented in this PR):

- Tag categories/groups
- Tag trending analytics
- User tag following
- Tag recommendations based on viewing history
- AI-powered tagging using ML models
- Tag merge functionality for admins
- Tag moderation queue
- Tag popularity charts
- Advanced tag-based search filters

## Migrations

The database schema for tags already exists in the initial migration:

- `migrations/000001_initial_schema.up.sql`

No new migrations required.

## API Documentation

Complete API documentation should be generated using tools like Swagger/OpenAPI. The endpoints follow RESTful conventions and return appropriate HTTP status codes:

- 200: Success
- 201: Created
- 400: Bad Request (invalid input)
- 401: Unauthorized
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate slug)
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error
