---
title: "Webhook Integration Guide"
summary: "This guide explains how to integrate with Clipper's outbound webhooks to receive real-time notificat"
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Webhook Integration Guide

This guide explains how to integrate with Clipper's outbound webhooks to receive real-time notifications when clips are submitted, approved, or rejected.

## Overview

Clipper webhooks allow third-party systems to receive HTTP POST notifications when specific events occur. All webhook payloads are signed using HMAC-SHA256 to verify authenticity.

## Supported Events

- `clip.submitted` - Fired when a clip is submitted for review
- `clip.approved` - Fired when a clip submission is approved
- `clip.rejected` - Fired when a clip submission is rejected

## Getting Started

### 1. Create a Webhook Subscription

**Endpoint:** `POST /api/v1/webhooks`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "url": "https://your-domain.com/webhook-endpoint",
  "events": ["clip.submitted", "clip.approved", "clip.rejected"],
  "description": "Production webhook for clip notifications"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "url": "https://your-domain.com/webhook-endpoint",
    "events": ["clip.submitted", "clip.approved", "clip.rejected"],
    "is_active": true,
    "description": "Production webhook for clip notifications",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "secret": "a1b2c3d4e5f6...64-character-hex-string",
  "message": "Webhook subscription created. Save the secret safely - it won't be shown again."
}
```

**Important:** The `secret` is only returned once during creation. Store it securely - you'll need it to verify webhook signatures.

### 2. Webhook URL Requirements

Your webhook endpoint must:
- Be publicly accessible via HTTP or HTTPS
- **Not** point to private/internal IP addresses (localhost, 192.168.x.x, 10.x.x.x, etc.)
- Respond within 10 seconds
- Return a 2xx HTTP status code to acknowledge receipt

### 3. Verify Webhook Signatures

All webhook requests include an `X-Webhook-Signature` header containing an HMAC-SHA256 signature of the request body.

**Request Headers:**
```
POST /your-endpoint HTTP/1.1
Content-Type: application/json
X-Webhook-Signature: a3f2b1c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1
X-Webhook-Event: clip.submitted
X-Webhook-Delivery-ID: 550e8400-e29b-41d4-a716-446655440001
User-Agent: Clipper-Webhooks/1.0
```

#### Verification Steps

**1. Extract the signature from headers:**
```javascript
const signature = req.headers['x-webhook-signature'];
```

**2. Compute HMAC-SHA256 of the raw request body:**
```javascript
const crypto = require('crypto');

const computedSignature = crypto
  .createHmac('sha256', YOUR_WEBHOOK_SECRET)
  .update(rawRequestBody)  // Important: use raw body, not parsed JSON
  .digest('hex');
```

**3. Compare signatures (use constant-time comparison):**
```javascript
const isValid = crypto.timingSafeEqual(
  Buffer.from(signature, 'hex'),
  Buffer.from(computedSignature, 'hex')
);

if (!isValid) {
  return res.status(401).send('Invalid signature');
}
```

#### Example Implementation (Node.js/Express)

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

// Important: You need raw body for signature verification
app.post('/webhook', 
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const eventType = req.headers['x-webhook-event'];
    const deliveryId = req.headers['x-webhook-delivery-id'];
    
    // Verify signature
    const computedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');
    
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    )) {
      console.error('Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }
    
    // Parse the verified payload
    const payload = JSON.parse(req.body.toString());
    
    console.log(`Received ${eventType} event:`, payload);
    
    // Process the webhook event
    switch (eventType) {
      case 'clip.submitted':
        handleClipSubmitted(payload.data);
        break;
      case 'clip.approved':
        handleClipApproved(payload.data);
        break;
      case 'clip.rejected':
        handleClipRejected(payload.data);
        break;
      default:
        console.warn('Unknown event type:', eventType);
    }
    
    // Acknowledge receipt
    res.status(200).send('OK');
  }
);
```

#### Example Implementation (Python/Flask)

```python
import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    event_type = request.headers.get('X-Webhook-Event')
    delivery_id = request.headers.get('X-Webhook-Delivery-ID')
    
    # Get raw request body
    raw_body = request.get_data()
    
    # Compute signature
    computed_signature = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    
    # Verify signature (constant-time comparison)
    if not hmac.compare_digest(signature, computed_signature):
        return 'Invalid signature', 401
    
    # Parse verified payload
    payload = request.get_json()
    
    print(f'Received {event_type} event:', payload)
    
    # Process the event
    if event_type == 'clip.submitted':
        handle_clip_submitted(payload['data'])
    elif event_type == 'clip.approved':
        handle_clip_approved(payload['data'])
    elif event_type == 'clip.rejected':
        handle_clip_rejected(payload['data'])
    
    return 'OK', 200
```

## Webhook Payload Structure

All webhook events follow this structure:

```json
{
  "event": "clip.submitted",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "submission_id": "550e8400-e29b-41d4-a716-446655440002",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "twitch_clip_id": "AwkwardHelpfulSalamanderSwiftRage",
    "twitch_clip_url": "https://clips.twitch.tv/AwkwardHelpfulSalamanderSwiftRage",
    "status": "pending",
    "is_nsfw": false,
    "created_at": "2024-01-15T10:30:00Z",
    "custom_title": "Amazing play!",
    "tags": ["highlight", "epic"]
  }
}
```

### Event-Specific Fields

#### clip.submitted
- Standard payload (shown above)
- If auto-approved, also includes `"auto_approved": true` in the `clip.approved` event that follows

#### clip.approved
```json
{
  "event": "clip.approved",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    // ... standard fields ...
    "reviewer_id": "789e0123-e45f-67g8-h901-234567890abc",
    "approved_at": "2024-01-15T10:35:00Z",
    "auto_approved": false  // true if automatically approved
  }
}
```

#### clip.rejected
```json
{
  "event": "clip.rejected",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    // ... standard fields ...
    "reviewer_id": "789e0123-e45f-67g8-h901-234567890abc",
    "rejection_reason": "Low quality clip",
    "rejected_at": "2024-01-15T10:35:00Z"
  }
}
```

## Retry Behavior

If your endpoint fails to respond with a 2xx status code, Clipper will automatically retry the delivery:

- **Max Attempts:** 5
- **Backoff Strategy:** Exponential backoff
  - Attempt 1: Immediate
  - Attempt 2: 60 seconds later
  - Attempt 3: 2 minutes later
  - Attempt 4: 4 minutes later
  - Attempt 5: 8 minutes later (capped at 1 hour max)

After 5 failed attempts, the delivery is marked as failed and moved to a dead-letter queue for manual review.

## Managing Webhook Subscriptions

### List Your Subscriptions

**Endpoint:** `GET /api/v1/webhooks`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://your-domain.com/webhook-endpoint",
      "events": ["clip.submitted", "clip.approved"],
      "is_active": true,
      "description": "Production webhook",
      "created_at": "2024-01-15T10:30:00Z",
      "last_delivery_at": "2024-01-15T12:45:00Z"
    }
  ]
}
```

### Get Subscription Details

**Endpoint:** `GET /api/v1/webhooks/{id}`

### Update Subscription

**Endpoint:** `PATCH /api/v1/webhooks/{id}`

**Request Body:**
```json
{
  "url": "https://new-domain.com/webhook",
  "events": ["clip.approved", "clip.rejected"],
  "is_active": true,
  "description": "Updated webhook"
}
```

### Delete Subscription

**Endpoint:** `DELETE /api/v1/webhooks/{id}`

### Regenerate Secret

If your webhook secret is compromised, regenerate it:

**Endpoint:** `POST /api/v1/webhooks/{id}/regenerate-secret`

**Response:**
```json
{
  "success": true,
  "secret": "new-64-character-hex-secret",
  "message": "Secret regenerated. Save it safely - it won't be shown again."
}
```

**Important:** Update your webhook endpoint with the new secret immediately to avoid failed deliveries.

### View Delivery History

**Endpoint:** `GET /api/v1/webhooks/{id}/deliveries?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "event_type": "clip.submitted",
      "status": "delivered",
      "http_status_code": 200,
      "attempt_count": 1,
      "delivered_at": "2024-01-15T10:30:05Z",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "event_type": "clip.approved",
      "status": "failed",
      "http_status_code": 500,
      "error_message": "HTTP 500: Internal Server Error",
      "attempt_count": 5,
      "created_at": "2024-01-15T11:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

## Best Practices

### 1. Use HTTPS
Always use HTTPS for your webhook endpoints to ensure data is encrypted in transit.

### 2. Validate Signatures
Always verify the `X-Webhook-Signature` header before processing webhook events to ensure they're from Clipper.

### 3. Return Quickly
Process webhooks asynchronously. Acknowledge receipt immediately (return 200) and process the event in the background.

```javascript
app.post('/webhook', async (req, res) => {
  // Verify signature
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Acknowledge immediately
  res.status(200).send('OK');
  
  // Process asynchronously
  processWebhookAsync(req.body).catch(err => {
    console.error('Failed to process webhook:', err);
  });
});
```

### 4. Handle Duplicates
The same event may be delivered multiple times (e.g., during retries). Use the `X-Webhook-Delivery-ID` header or `submission_id` to implement idempotency.

```javascript
const processedDeliveries = new Set();

function processWebhook(deliveryId, payload) {
  if (processedDeliveries.has(deliveryId)) {
    console.log('Duplicate delivery, skipping:', deliveryId);
    return;
  }
  
  processedDeliveries.add(deliveryId);
  // Process the webhook...
}
```

### 5. Monitor Your Endpoints
- Log all webhook deliveries
- Set up alerts for high failure rates
- Monitor response times

### 6. Test Webhooks
Use tools like [webhook.site](https://webhook.site) or [ngrok](https://ngrok.com) to test your webhook integration during development.

## Rate Limits

- **Create subscription:** 10 per hour
- **Regenerate secret:** 5 per hour
- **Get events (public):** 60 per minute
- Other endpoints: No specific limits (general API rate limits apply)

## Troubleshooting

### Webhooks Not Received

1. **Check subscription is active:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://clpr.tv/api/v1/webhooks
   ```

2. **Verify URL is accessible:**
   - Ensure your endpoint is publicly accessible
   - Not behind a firewall
   - HTTPS certificate is valid

3. **Check delivery history:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://clpr.tv/api/v1/webhooks/{id}/deliveries
   ```

### Signature Verification Fails

1. **Use raw request body** - Don't parse JSON before verification
2. **Check encoding** - Secret is hex-encoded, result should be hex
3. **Use constant-time comparison** - Prevents timing attacks
4. **Verify secret** - Ensure you're using the correct secret

### High Failure Rate

1. **Check response times** - Endpoint must respond within 10 seconds
2. **Return 2xx status** - Even if processing fails, acknowledge receipt
3. **Process asynchronously** - Don't do heavy processing in request handler
4. **Check logs** - Look for errors in your webhook handler

## Security Considerations

1. **Never expose your webhook secret** in client-side code or public repositories
2. **Validate all input** even after signature verification
3. **Use HTTPS** to prevent man-in-the-middle attacks
4. **Implement rate limiting** on your webhook endpoint to prevent abuse
5. **Log security events** such as signature verification failures

## Support

For issues or questions:
- Check the [API documentation](https://docs.clpr.tv)
- Contact support at support@clpr.tv
- GitHub issues: https://github.com/subculture-collective/clipper/issues
