---
title: "Clip Submission API - Developer Guide"
summary: "- [Overview](#overview)"
tags: ['backend', 'api', 'guide']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Clip Submission API - Developer Guide

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Authentication](#authentication)
- [Quick Start](#quick-start)
- [Complete Workflow](#complete-workflow)
- [TypeScript/JavaScript SDK Examples](#typescriptjavascript-sdk-examples)
- [cURL Examples](#curl-examples)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Clip Submission API allows users to submit Twitch clips to the Clipper platform. This guide provides complete examples for submitting clips end-to-end.

### Key Features

- **Metadata Validation**: Fetch and validate clip metadata before submission
- **Auto-Approval**: Clips from trusted users (admins, moderators, or users with ≥1000 karma) are automatically approved
- **Moderation Queue**: Other submissions are placed in a queue for review
- **Rate Limiting**: Protection against spam and abuse
- **Duplicate Detection**: Prevents duplicate submissions

### API Endpoints

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/v1/submissions/metadata` | GET | Fetch clip metadata from Twitch | 100/hour |
| `/api/v1/submissions` | POST | Submit a clip | 5/hour |
| `/api/v1/submissions` | GET | List user's submissions | 300/min |
| `/api/v1/submissions/stats` | GET | Get submission statistics | 300/min |

## Prerequisites

- **Authentication Token**: You need a valid JWT token from the Clipper authentication system
- **Minimum Karma**: At least 100 karma points to submit clips
- **Valid Twitch Clip**: The clip must be publicly accessible on Twitch

> **💡 Looking for ready-to-use code?** Check out the [Examples Directory](./examples/) for working TypeScript and shell script examples you can run immediately.

## Authentication

All API endpoints require authentication via JWT Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

To obtain a token, authenticate using the Twitch OAuth flow. See the [Authentication API documentation](../AUTHENTICATION.md) for details.

## Quick Start

### 1. Fetch Clip Metadata

Before submitting, validate the clip URL and fetch metadata:

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/submissions/metadata?url=https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**TypeScript:**
```typescript
const response = await fetch(
  'http://localhost:8080/api/v1/submissions/metadata?url=https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
if (data.success) {
  console.log('Clip metadata:', data.data);
}
```

### 2. Submit the Clip

After validating metadata, submit the clip:

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/submissions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clip_url": "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
    "tags": ["epic", "valorant"],
    "is_nsfw": false
  }'
```

**TypeScript:**
```typescript
const response = await fetch('http://localhost:8080/api/v1/submissions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    clip_url: 'https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage',
    tags: ['epic', 'valorant'],
    is_nsfw: false
  })
});

const data = await response.json();
if (data.success) {
  console.log('Submission status:', data.message);
  console.log('Submission ID:', data.submission.id);
}
```

## Complete Workflow

### End-to-End Clip Submission

Here's a complete TypeScript example that handles the entire submission workflow:

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1';

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
}

class ClipSubmissionClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Step 1: Fetch and validate clip metadata
   */
  async fetchMetadata(clipUrl: string): Promise<ClipMetadata> {
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/metadata`, {
        params: { url: clipUrl },
        headers: this.headers
      });

      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Invalid clip URL');
      }
      if (error.response?.status === 502) {
        throw new Error('Unable to fetch clip from Twitch. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Step 2: Submit the clip
   */
  async submitClip(request: SubmitClipRequest): Promise<ClipSubmission> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/submissions`,
        request,
        { headers: this.headers }
      );

      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      return response.data.submission;
    } catch (error: any) {
      if (error.response?.status === 400) {
        const errorMsg = error.response.data.error;
        const field = error.response.data.field;
        throw new Error(`${field}: ${errorMsg}`);
      }
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. You can submit up to 5 clips per hour.');
      }
      throw error;
    }
  }

  /**
   * Step 3: Get user's submission history
   */
  async getMySubmissions(page: number = 1, limit: number = 20): Promise<{
    submissions: ClipSubmission[];
    total: number;
    totalPages: number;
  }> {
    const response = await axios.get(`${API_BASE_URL}/submissions`, {
      params: { page, limit },
      headers: this.headers
    });

    return {
      submissions: response.data.data,
      total: response.data.meta.total,
      totalPages: response.data.meta.total_pages
    };
  }

  /**
   * Get submission statistics
   */
  async getStats() {
    const response = await axios.get(`${API_BASE_URL}/submissions/stats`, {
      headers: this.headers
    });

    return response.data.data;
  }

  /**
   * Complete workflow: Validate and submit a clip
   */
  async submitClipWorkflow(clipUrl: string, options?: {
    customTitle?: string;
    tags?: string[];
    isNsfw?: boolean;
    reason?: string;
  }): Promise<{
    metadata: ClipMetadata;
    submission: ClipSubmission;
  }> {
    // Step 1: Validate and fetch metadata
    console.log('Fetching clip metadata...');
    const metadata = await this.fetchMetadata(clipUrl);
    console.log('✓ Clip found:', metadata.title);

    // Step 2: Submit the clip
    console.log('Submitting clip...');
    const submission = await this.submitClip({
      clip_url: clipUrl,
      custom_title: options?.customTitle,
      tags: options?.tags,
      is_nsfw: options?.isNsfw || false,
      submission_reason: options?.reason
    });

    if (submission.status === 'approved') {
      console.log('✓ Clip auto-approved! Clip ID:', submission.clip_id);
    } else {
      console.log('✓ Clip submitted for review. Submission ID:', submission.id);
    }

    return { metadata, submission };
  }
}

// Example usage
async function main() {
  const client = new ClipSubmissionClient('YOUR_JWT_TOKEN');

  try {
    // Submit a clip with the complete workflow
    const result = await client.submitClipWorkflow(
      'https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage',
      {
        customTitle: 'Epic 1v5 Clutch',
        tags: ['clutch', 'epic', 'valorant'],
        reason: 'Amazing gameplay moment'
      }
    );

    console.log('Submission complete:', result);

    // Get submission statistics
    const stats = await client.getStats();
    console.log('Your stats:', stats);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### React Hook Example

For React applications, here's a custom hook for clip submission:

```typescript
import { useState } from 'react';
import { ClipSubmissionClient } from './clip-submission-client';

export function useClipSubmission(token: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = new ClipSubmissionClient(token);

  const submitClip = async (clipUrl: string, options?: {
    customTitle?: string;
    tags?: string[];
    isNsfw?: boolean;
    reason?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const result = await client.submitClipWorkflow(clipUrl, options);
      setLoading(false);
      return result;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const fetchMetadata = async (clipUrl: string) => {
    setLoading(true);
    setError(null);

    try {
      const metadata = await client.fetchMetadata(clipUrl);
      setLoading(false);
      return metadata;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    submitClip,
    fetchMetadata,
    loading,
    error
  };
}

// Usage in a component
function SubmitClipForm({ token }: { token: string }) {
  const { submitClip, fetchMetadata, loading, error } = useClipSubmission(token);
  const [clipUrl, setClipUrl] = useState('');
  const [metadata, setMetadata] = useState(null);

  const handleFetchMetadata = async () => {
    try {
      const data = await fetchMetadata(clipUrl);
      setMetadata(data);
    } catch (err) {
      // Error is already set in the hook
    }
  };

  const handleSubmit = async () => {
    try {
      const result = await submitClip(clipUrl, {
        tags: ['epic'],
        isNsfw: false
      });
      alert(`Clip submitted! Status: ${result.submission.status}`);
    } catch (err) {
      // Error is already set in the hook
    }
  };

  return (
    <div>
      <input
        value={clipUrl}
        onChange={(e) => setClipUrl(e.target.value)}
        placeholder="Enter Twitch clip URL"
      />
      <button onClick={handleFetchMetadata} disabled={loading}>
        Validate Clip
      </button>
      {metadata && (
        <div>
          <p>Title: {metadata.title}</p>
          <p>Streamer: {metadata.streamer_name}</p>
          <button onClick={handleSubmit} disabled={loading}>
            Submit Clip
          </button>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

## cURL Examples

### Complete Workflow with cURL

Here's a complete shell script example:

```bash
#!/bin/bash

# Configuration
API_BASE_URL="http://localhost:8080/api/v1"
TOKEN="YOUR_JWT_TOKEN"
CLIP_URL="https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage"

# Step 1: Fetch metadata
echo "Fetching clip metadata..."
METADATA=$(curl -s -X GET \
  "${API_BASE_URL}/submissions/metadata?url=${CLIP_URL}" \
  -H "Authorization: Bearer ${TOKEN}")

# Check if metadata fetch was successful
SUCCESS=$(echo $METADATA | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
  echo "Error fetching metadata:"
  echo $METADATA | jq -r '.error'
  exit 1
fi

# Display clip info
echo "Clip found!"
echo $METADATA | jq -r '.data | "Title: \(.title)\nStreamer: \(.streamer_name)\nGame: \(.game_name)"'

# Step 2: Submit the clip
echo -e "\nSubmitting clip..."
SUBMISSION=$(curl -s -X POST \
  "${API_BASE_URL}/submissions" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"clip_url\": \"${CLIP_URL}\",
    \"custom_title\": \"Epic Moment\",
    \"tags\": [\"epic\", \"highlight\"],
    \"is_nsfw\": false,
    \"submission_reason\": \"Amazing gameplay\"
  }")

# Check submission result
SUCCESS=$(echo $SUBMISSION | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
  echo "Error submitting clip:"
  echo $SUBMISSION | jq -r '.error'
  exit 1
fi

# Display submission result
MESSAGE=$(echo $SUBMISSION | jq -r '.message')
STATUS=$(echo $SUBMISSION | jq -r '.submission.status')
SUBMISSION_ID=$(echo $SUBMISSION | jq -r '.submission.id')

echo "✓ $MESSAGE"
echo "Status: $STATUS"
echo "Submission ID: $SUBMISSION_ID"

if [ "$STATUS" == "approved" ]; then
  CLIP_ID=$(echo $SUBMISSION | jq -r '.submission.clip_id')
  echo "Clip ID: $CLIP_ID"
fi

# Step 3: Get submission stats
echo -e "\nFetching your submission statistics..."
STATS=$(curl -s -X GET \
  "${API_BASE_URL}/submissions/stats" \
  -H "Authorization: Bearer ${TOKEN}")

echo $STATS | jq '.data'
```

### Individual cURL Examples

#### 1. Fetch Metadata

```bash
curl -X GET \
  "http://localhost:8080/api/v1/submissions/metadata?url=https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq .
```

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

#### 2. Submit Clip (Basic)

```bash
curl -X POST \
  "http://localhost:8080/api/v1/submissions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clip_url": "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage"
  }' \
  | jq .
```

#### 3. Submit Clip (With Optional Fields)

```bash
curl -X POST \
  "http://localhost:8080/api/v1/submissions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clip_url": "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
    "custom_title": "Epic 1v5 Clutch",
    "tags": ["clutch", "epic", "valorant"],
    "is_nsfw": false,
    "submission_reason": "Amazing gameplay moment that deserves to be shared"
  }' \
  | jq .
```

#### 4. List Your Submissions

```bash
curl -X GET \
  "http://localhost:8080/api/v1/submissions?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq .
```

#### 5. Get Submission Statistics

```bash
curl -X GET \
  "http://localhost:8080/api/v1/submissions/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq .
```

## Error Handling

### Common Error Responses

#### 400 Bad Request - Invalid URL

```json
{
  "success": false,
  "error": "Invalid Twitch clip URL format",
  "field": "clip_url"
}
```

#### 400 Bad Request - Duplicate Clip

```json
{
  "success": false,
  "error": "This clip has already been submitted",
  "field": "clip_url"
}
```

#### 400 Bad Request - Insufficient Karma

```json
{
  "success": false,
  "error": "You need at least 100 karma to submit clips",
  "field": "karma"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 429 Too Many Requests

```json
{
  "success": false,
  "error": "Rate limit exceeded. You can submit up to 5 clips per hour."
}
```

#### 502 Bad Gateway - Twitch API Error

```json
{
  "success": false,
  "error": "Unable to fetch clip metadata from Twitch. Please try again later."
}
```

### Error Handling in TypeScript

```typescript
try {
  const submission = await client.submitClip({ clip_url: url });
} catch (error: any) {
  if (error.response?.status === 400) {
    const { error: message, field } = error.response.data;
    
    if (field === 'clip_url') {
      if (message.includes('duplicate')) {
        alert('This clip has already been submitted!');
      } else if (message.includes('format')) {
        alert('Invalid clip URL format. Please check the URL.');
      }
    } else if (field === 'karma') {
      alert('You need more karma to submit clips. Participate more in the community!');
    }
  } else if (error.response?.status === 429) {
    alert('Rate limit exceeded. Please wait before submitting another clip.');
  } else if (error.response?.status === 502) {
    alert('Unable to connect to Twitch. Please try again later.');
  } else {
    alert('An unexpected error occurred. Please try again.');
  }
}
```

## Rate Limits

| Endpoint | Limit | Period |
|----------|-------|--------|
| `POST /api/v1/submissions` | 5 requests | per hour |
| `GET /api/v1/submissions/metadata` | 100 requests | per hour |
| `GET /api/v1/submissions` | 300 requests | per minute |
| `GET /api/v1/submissions/stats` | 300 requests | per minute |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1634567890
```

## Best Practices

### 1. Always Validate Before Submitting

```typescript
// Good: Validate first
const metadata = await client.fetchMetadata(clipUrl);
// Show user the clip details for confirmation
const submission = await client.submitClip({ clip_url: clipUrl });

// Bad: Submit without validation
const submission = await client.submitClip({ clip_url: clipUrl });
```

### 2. Handle Rate Limits Gracefully

```typescript
async function submitWithRetry(client: ClipSubmissionClient, clipUrl: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.submitClip({ clip_url: clipUrl });
    } catch (error: any) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        console.log(`Rate limited. Retrying in ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3. Cache Metadata Locally

```typescript
// Cache metadata to avoid repeated API calls
const metadataCache = new Map<string, ClipMetadata>();

async function getCachedMetadata(client: ClipSubmissionClient, clipUrl: string) {
  if (metadataCache.has(clipUrl)) {
    return metadataCache.get(clipUrl)!;
  }
  
  const metadata = await client.fetchMetadata(clipUrl);
  metadataCache.set(clipUrl, metadata);
  return metadata;
}
```

### 4. Provide User Feedback

```typescript
async function submitWithFeedback(client: ClipSubmissionClient, clipUrl: string) {
  try {
    // Step 1: Show loading
    showLoading('Validating clip...');
    const metadata = await client.fetchMetadata(clipUrl);
    
    // Step 2: Show clip info for user confirmation
    const confirmed = await showConfirmDialog({
      title: metadata.title,
      streamer: metadata.streamer_name,
      game: metadata.game_name
    });
    
    if (!confirmed) return;
    
    // Step 3: Submit
    showLoading('Submitting clip...');
    const submission = await client.submitClip({ clip_url: clipUrl });
    
    // Step 4: Show success
    if (submission.status === 'approved') {
      showSuccess('Clip approved and published!');
    } else {
      showSuccess('Clip submitted for review. You\'ll be notified when it\'s reviewed.');
    }
    
  } catch (error: any) {
    showError(error.message);
  } finally {
    hideLoading();
  }
}
```

### 5. Validate URLs Client-Side

```typescript
function isValidTwitchClipUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/clips\.twitch\.tv\/[a-zA-Z0-9_-]+$/,
    /^https?:\/\/(www\.)?twitch\.tv\/[a-zA-Z0-9_]+\/clip\/[a-zA-Z0-9_-]+$/,
    /^https?:\/\/m\.twitch\.tv\/[a-zA-Z0-9_]+\/clip\/[a-zA-Z0-9_-]+$/,
    /^[a-zA-Z0-9_-]+$/ // Direct clip ID
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

// Usage
if (!isValidTwitchClipUrl(clipUrl)) {
  alert('Invalid Twitch clip URL format');
  return;
}
```

## Troubleshooting

### Problem: "Unauthorized" error

**Solution:** Check that your JWT token is valid and not expired. Re-authenticate if necessary.

```bash
# Test your token
curl -X GET "http://localhost:8080/api/v1/submissions/stats" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

### Problem: "Clip not found on Twitch"

**Possible causes:**
1. Clip was deleted by the broadcaster
2. Invalid clip URL or ID
3. Clip is from a suspended channel

**Solution:** Verify the clip exists by visiting it on Twitch directly.

### Problem: "Rate limit exceeded"

**Solution:** Wait for the rate limit window to reset. Check `X-RateLimit-Reset` header for reset time.

```typescript
const resetTime = new Date(parseInt(response.headers['x-ratelimit-reset']) * 1000);
console.log(`Rate limit resets at: ${resetTime}`);
```

### Problem: "Insufficient karma"

**Solution:** Build up karma by:
- Voting on clips (+1 karma per vote)
- Getting approved submissions (+10 karma per approval)
- Receiving upvotes on comments (+2 karma per upvote)

### Problem: "Duplicate clip"

**Solution:** This clip has already been submitted. You can:
- Search for the clip in the Clipper feed
- Submit a different clip

### Problem: Metadata fetch fails (502 error)

**Possible causes:**
1. Twitch API is temporarily unavailable
2. Twitch API rate limits exceeded (from server side)
3. Network connectivity issues

**Solution:** Retry after a short delay (exponential backoff recommended).

```typescript
async function fetchWithRetry(client: ClipSubmissionClient, clipUrl: string) {
  const delays = [1000, 2000, 4000]; // Exponential backoff
  
  for (const delay of delays) {
    try {
      return await client.fetchMetadata(clipUrl);
    } catch (error: any) {
      if (error.response?.status === 502) {
        console.log(`Twitch API error. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Failed to fetch metadata after retries');
}
```

## Additional Resources

- [OpenAPI Specification](../openapi/clip-submission-api.yaml) - Complete API specification
- [User Submission Implementation](../USER_SUBMISSION_IMPLEMENTATION.md) - Technical implementation details
- [API Reference](../API.md) - Complete API documentation
- [Authentication Guide](../AUTHENTICATION.md) - How to obtain JWT tokens

## Support

If you encounter issues or have questions:

1. Check the [FAQ](../users/faq.md)
2. Review [existing issues](https://github.com/subculture-collective/clipper/issues)
3. Open a new issue with the `api` label
