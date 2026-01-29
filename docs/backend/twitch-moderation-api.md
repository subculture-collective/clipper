---
title: "Twitch Moderation API Reference"
summary: "API reference for Twitch ban/unban endpoints with examples and error handling."
tags: ["backend", "api", "moderation", "twitch"]
area: "backend"
status: "stable"
owner: "team-moderation"
version: "1.0"
last_reviewed: 2026-01-12
aliases: ["moderation-api", "ban-api", "twitch-bans"]
---

# Twitch Moderation API Reference

REST API endpoints for managing Twitch bans and unbans directly from Clipper.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Ban User on Twitch](#ban-user-on-twitch)
  - [Unban User on Twitch](#unban-user-on-twitch)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## Overview

**Base URL**: `https://api.clipper.app/v1`

These endpoints allow broadcasters and Twitch channel moderators to ban/unban users on Twitch through Clipper's API.

**Key Features:**
- Permanent bans and temporary timeouts
- Ban reason tracking
- OAuth scope validation
- Rate limiting (10 requests/hour)
- Audit logging for all actions

**Permissions:**
- ✅ Broadcaster with `channel:manage:banned_users` scope
- ✅ Twitch channel moderator with `moderator:manage:banned_users` scope
- ❌ Site moderators (read-only)
- ❌ Regular users

## Authentication

All endpoints require authentication via JWT token obtained from Twitch OAuth:

```http
Authorization: Bearer <jwt_token>
```

**Required Scopes:**
- Broadcasters: `channel:manage:banned_users`
- Moderators: `moderator:manage:banned_users`

See [Twitch OAuth Setup](../../TWITCH_OAUTH_BAN_SCOPES_IMPLEMENTATION.md) for details.

## Endpoints

### Ban User on Twitch

Ban or timeout a user on Twitch.

#### Request

```http
POST /api/v1/moderation/twitch/ban
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcasterID` | string | ✅ Yes | Twitch broadcaster's user ID |
| `userID` | string | ✅ Yes | Twitch user ID to ban |
| `reason` | string | ❌ No | Reason for the ban (max 500 chars) |
| `duration` | integer | ❌ No | Timeout duration in seconds (1-1209600). Omit for permanent ban. |

**Request Example (Permanent Ban):**
```json
{
  "broadcasterID": "12345",
  "userID": "67890",
  "reason": "Repeated harassment of other users"
}
```

**Request Example (Timeout):**
```json
{
  "broadcasterID": "12345",
  "userID": "67890",
  "reason": "Spam in chat",
  "duration": 600
}
```

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "User banned on Twitch successfully",
  "broadcasterID": "12345",
  "userID": "67890"
}
```

**Success for Timeout (200 OK):**
```json
{
  "success": true,
  "message": "User timed out on Twitch for 600 seconds",
  "broadcasterID": "12345",
  "userID": "67890"
}
```

**Error Responses:**

See [Error Codes](#error-codes) section below.

---

### Unban User on Twitch

Remove a ban or timeout from a user on Twitch.

#### Request

```http
DELETE /api/v1/moderation/twitch/ban?broadcasterID=<id>&userID=<id>
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `broadcasterID` | string | ✅ Yes | Twitch broadcaster's user ID |
| `userID` | string | ✅ Yes | Twitch user ID to unban |

**Request Example:**
```http
DELETE /api/v1/moderation/twitch/ban?broadcasterID=12345&userID=67890
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "User unbanned on Twitch successfully",
  "broadcasterID": "12345",
  "userID": "67890"
}
```

**Error Responses:**

See [Error Codes](#error-codes) section below.

---

## Error Codes

All endpoints return structured error responses with specific codes:

### 400 Bad Request

**Missing Required Fields:**
```json
{
  "error": "Missing required fields: broadcasterID and userID are required"
}
```

**Invalid Duration:**
```json
{
  "error": "Duration must be between 1 and 1209600 seconds (14 days)"
}
```

---

### 401 Unauthorized

**No Authentication Token:**
```json
{
  "error": "Unauthorized"
}
```

---

### 403 Forbidden

**Site Moderators Read-Only:**
```json
{
  "error": "Site moderators cannot perform Twitch actions",
  "code": "SITE_MODERATORS_READ_ONLY",
  "detail": "You are a site moderator but not a Twitch channel moderator. You can only view moderation data."
}
```

**Not Authenticated with Twitch:**
```json
{
  "error": "Not authenticated with Twitch",
  "code": "NOT_AUTHENTICATED",
  "detail": "You must authenticate with Twitch to perform moderation actions."
}
```

**Insufficient OAuth Scopes:**
```json
{
  "error": "Insufficient OAuth scopes",
  "code": "INSUFFICIENT_SCOPES",
  "detail": "Your Twitch token lacks the required scopes. Please re-authenticate with moderator:manage:banned_users or channel:manage:banned_users scope."
}
```

**Not Broadcaster or Moderator:**
```json
{
  "error": "Forbidden",
  "code": "NOT_BROADCASTER",
  "detail": "Only the broadcaster or channel moderators can perform this action."
}
```

---

### 429 Too Many Requests

**Rate Limit Exceeded:**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "detail": "You have exceeded the rate limit for Twitch ban actions. Please try again later."
}
```

---

### 500 Internal Server Error

**Generic Failure:**
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "detail": "An unexpected error occurred. Please try again."
}
```

---

### 503 Service Unavailable

**Twitch Service Not Configured:**
```json
{
  "error": "Twitch moderation service not configured",
  "code": "SERVICE_UNAVAILABLE",
  "detail": "The Twitch moderation service is temporarily unavailable."
}
```

---

## Rate Limiting

**Limits:**
- **10 requests per hour** per authenticated user
- Applies to both ban and unban endpoints combined
- Resets every 60 minutes

**Headers:**

Response includes rate limit headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1673550000
```

**When Exceeded:**
- HTTP 429 status code
- Error code: `RATE_LIMIT_EXCEEDED`
- User must wait until reset time

**Checking Rate Limit:**

No dedicated endpoint, but headers are returned on every request.

---

## Examples

### cURL Examples

**Ban User (Permanent):**

```bash
curl -X POST https://api.clipper.app/v1/moderation/twitch/ban \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "broadcasterID": "12345",
    "userID": "67890",
    "reason": "Harassment"
  }'
```

**Ban User (Timeout 10 minutes):**

```bash
curl -X POST https://api.clipper.app/v1/moderation/twitch/ban \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "broadcasterID": "12345",
    "userID": "67890",
    "reason": "Spam",
    "duration": 600
  }'
```

**Unban User:**

```bash
curl -X DELETE "https://api.clipper.app/v1/moderation/twitch/ban?broadcasterID=12345&userID=67890" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### JavaScript/TypeScript Examples

**Using Fetch API:**

```typescript
// Ban user permanently
async function banUser(broadcasterID: string, userID: string, reason: string) {
  const response = await fetch('https://api.clipper.app/v1/moderation/twitch/ban', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      broadcasterID,
      userID,
      reason,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ban failed');
  }

  return response.json();
}

// Timeout user for 10 minutes
async function timeoutUser(broadcasterID: string, userID: string, reason: string) {
  const response = await fetch('https://api.clipper.app/v1/moderation/twitch/ban', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      broadcasterID,
      userID,
      reason,
      duration: 600, // 10 minutes
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Timeout failed');
  }

  return response.json();
}

// Unban user
async function unbanUser(broadcasterID: string, userID: string) {
  const response = await fetch(
    `https://api.clipper.app/v1/moderation/twitch/ban?broadcasterID=${broadcasterID}&userID=${userID}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Unban failed');
  }

  return response.json();
}
```

**Error Handling:**

```typescript
try {
  await banUser('12345', '67890', 'Harassment');
  console.log('User banned successfully');
} catch (error) {
  if (error.message.includes('INSUFFICIENT_SCOPES')) {
    // Prompt user to re-authenticate
    redirectToTwitchOAuth();
  } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
    // Show rate limit message
    showRateLimitError('Please wait before trying again');
  } else {
    // Generic error
    showError(error.message);
  }
}
```

---

### Python Examples

**Using Requests Library:**

```python
import requests

API_BASE = 'https://api.clipper.app/v1'
JWT_TOKEN = 'your_jwt_token_here'

def ban_user(broadcaster_id: str, user_id: str, reason: str, duration: int = None):
    """Ban or timeout a user on Twitch."""
    url = f'{API_BASE}/moderation/twitch/ban'
    headers = {
        'Authorization': f'Bearer {JWT_TOKEN}',
        'Content-Type': 'application/json'
    }
    data = {
        'broadcasterID': broadcaster_id,
        'userID': user_id,
        'reason': reason
    }
    
    if duration:
        data['duration'] = duration
    
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    return response.json()

def unban_user(broadcaster_id: str, user_id: str):
    """Unban a user on Twitch."""
    url = f'{API_BASE}/moderation/twitch/ban'
    headers = {
        'Authorization': f'Bearer {JWT_TOKEN}'
    }
    params = {
        'broadcasterID': broadcaster_id,
        'userID': user_id
    }
    
    response = requests.delete(url, params=params, headers=headers)
    response.raise_for_status()
    return response.json()

# Usage
try:
    # Permanent ban
    result = ban_user('12345', '67890', 'Harassment')
    print(f"Ban successful: {result['message']}")
    
    # Timeout for 10 minutes
    result = ban_user('12345', '67890', 'Spam', duration=600)
    print(f"Timeout successful: {result['message']}")
    
    # Unban
    result = unban_user('12345', '67890')
    print(f"Unban successful: {result['message']}")
    
except requests.exceptions.HTTPError as e:
    error_data = e.response.json()
    print(f"Error: {error_data.get('error')}")
    if error_data.get('code') == 'INSUFFICIENT_SCOPES':
        print("Please re-authenticate with Twitch")
```

---

## Related Documentation

- [Twitch Moderation Actions (Product Guide)](../../product/twitch-moderation-actions.md)
- [Rollout Plan](../../operations/twitch-moderation-rollout-plan.md)
- [Feature Flags](../../operations/feature-flags.md#feature_twitch_moderation)
- [Twitch OAuth Implementation](../../TWITCH_OAUTH_BAN_SCOPES_IMPLEMENTATION.md)
- [Twitch Integration Guide](./twitch-integration.md)

---

**Last Updated**: 2026-01-12  
**API Version**: v1  
**Status**: ✅ Production Ready
