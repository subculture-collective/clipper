# Clip Submission API - Quick Reference

## Authentication

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| GET | `/api/v1/submissions/metadata` | Fetch clip metadata | 100/hour |
| POST | `/api/v1/submissions` | Submit a clip | 5/hour |
| GET | `/api/v1/submissions` | List submissions | 300/min |
| GET | `/api/v1/submissions/stats` | Get stats | 300/min |

## Quick Examples

### 1. Fetch Metadata

**cURL:**
```bash
curl "http://localhost:8080/api/v1/submissions/metadata?url=CLIP_URL" \
  -H "Authorization: Bearer TOKEN"
```

**TypeScript:**
```typescript
const res = await fetch(`/api/v1/submissions/metadata?url=${clipUrl}`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await res.json();
```

### 2. Submit Clip

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/submissions" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clip_url":"CLIP_URL","tags":["epic"]}'
```

**TypeScript:**
```typescript
const res = await fetch('/api/v1/submissions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ clip_url: clipUrl, tags: ['epic'] })
});
const { submission } = await res.json();
```

## Request Body (POST /submissions)

```json
{
  "clip_url": "https://clips.twitch.tv/ClipID",
  "custom_title": "Optional custom title",
  "tags": ["tag1", "tag2"],
  "is_nsfw": false,
  "submission_reason": "Optional reason"
}
```

## Response Examples

### Success (Auto-Approved)
```json
{
  "success": true,
  "message": "Clip submitted and auto-approved!",
  "submission": {
    "id": "uuid",
    "status": "approved",
    "clip_id": "uuid"
  }
}
```

### Success (Pending Review)
```json
{
  "success": true,
  "message": "Clip submitted for review",
  "submission": {
    "id": "uuid",
    "status": "pending"
  }
}
```

### Error (Duplicate)
```json
{
  "success": false,
  "error": "This clip has already been submitted",
  "field": "clip_url"
}
```

### Error (Rate Limit)
```json
{
  "success": false,
  "error": "Rate limit exceeded. You can submit up to 5 clips per hour."
}
```

## Supported Clip URL Formats

- `https://clips.twitch.tv/ClipID`
- `https://www.twitch.tv/streamer/clip/ClipID`
- `https://m.twitch.tv/streamer/clip/ClipID`
- `ClipID` (direct)

## Requirements

- ✅ Valid JWT token
- ✅ At least 100 karma
- ✅ Clip must be < 6 months old
- ✅ Clip must be ≥ 5 seconds long
- ✅ Clip must not be a duplicate

## Auto-Approval Rules

Clips are auto-approved if submitter:
- Is an admin or moderator, OR
- Has ≥1000 karma points

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 429 | Rate Limit Exceeded |
| 502 | Twitch API Error |

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Unauthorized" | Invalid/expired token | Re-authenticate |
| "Clip not found" | Clip deleted/invalid | Verify clip on Twitch |
| "Duplicate clip" | Already submitted | Submit different clip |
| "Insufficient karma" | < 100 karma | Build karma by participating |
| "Rate limit exceeded" | Too many submissions | Wait before retry |
| "Clip too old" | > 6 months old | Submit newer clip |

## TypeScript Types

```typescript
interface ClipMetadata {
  clip_id: string;
  title: string;
  streamer_name: string;
  game_name: string;
  view_count: number;
  created_at: string;
  thumbnail_url: string;
  duration: number;
  url: string;
}

interface SubmitClipRequest {
  clip_url: string;
  custom_title?: string;
  tags?: string[];
  is_nsfw?: boolean;
  submission_reason?: string;
}

interface ClipSubmission {
  id: string;
  twitch_clip_id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  clip_id?: string;
  rejection_reason?: string;
}
```

## Full Documentation

- **Developer Guide**: [CLIP_SUBMISSION_API_GUIDE.md](./CLIP_SUBMISSION_API_GUIDE.md)
- **OpenAPI Spec**: [openapi/clip-submission-api.yaml](./openapi/clip-submission-api.yaml)
- **Implementation Details**: [USER_SUBMISSION_IMPLEMENTATION.md](./USER_SUBMISSION_IMPLEMENTATION.md)
