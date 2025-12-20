# Webhook Subscription Management

## Overview

The webhook subscription management feature allows users to create and manage webhook subscriptions for receiving real-time notifications when events occur in the system.

## Features

### User Interface
- **Access**: Navigate to Settings > Webhooks or directly to `/settings/webhooks`
- **CRUD Operations**: Create, read, update, and delete webhook subscriptions
- **Event Selection**: Subscribe to specific events (clip.submitted, clip.approved, clip.rejected)
- **Secret Management**: Secure secret generation and rotation
- **Delivery History**: View audit log of webhook deliveries with status and error messages

### API Endpoints

All webhook endpoints require authentication.

#### Get Supported Events
```
GET /api/v1/webhooks/events
```
Returns a list of available webhook events.

#### Create Webhook Subscription
```
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://example.com/webhook",
  "events": ["clip.submitted", "clip.approved"],
  "description": "My webhook for clip notifications"
}
```
Returns the created subscription and the secret (only shown once).

#### List Webhook Subscriptions
```
GET /api/v1/webhooks
```
Returns all webhook subscriptions for the authenticated user.

#### Get Webhook Subscription
```
GET /api/v1/webhooks/:id
```
Returns details of a specific webhook subscription.

#### Update Webhook Subscription
```
PATCH /api/v1/webhooks/:id
Content-Type: application/json

{
  "url": "https://example.com/webhook-new",
  "events": ["clip.submitted"],
  "is_active": false,
  "description": "Updated description"
}
```
All fields are optional.

#### Delete Webhook Subscription
```
DELETE /api/v1/webhooks/:id
```
Deletes the webhook subscription.

#### Regenerate Secret
```
POST /api/v1/webhooks/:id/regenerate-secret
```
Generates a new secret for the webhook subscription. The old secret becomes invalid.

#### Get Delivery History
```
GET /api/v1/webhooks/:id/deliveries?page=1&limit=20
```
Returns delivery history with pagination.

## Security Features

### Secret Management
- Secrets are 32-byte cryptographically secure random values
- Secrets are only shown once upon creation or regeneration
- Secrets should be stored securely by the webhook consumer
- Secrets are used for HMAC-SHA256 signature verification

### SSRF Protection
- Webhook URLs are validated to prevent Server-Side Request Forgery
- Private IP ranges and localhost are blocked
- Only HTTP and HTTPS schemes are allowed

### Rate Limiting
- Create webhook: 10 requests per hour
- Regenerate secret: 5 requests per hour
- Get events: 60 requests per minute

## Webhook Payload Format

Webhooks are sent as POST requests with the following format:

```json
{
  "event": "clip.submitted",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "submission_id": "uuid",
    "clip_id": "uuid",
    "user_id": "uuid",
    // ... additional event-specific data
  }
}
```

### Signature Verification

Each webhook request includes an `X-Webhook-Signature` header containing an HMAC-SHA256 signature. Verify it using your secret:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Delivery Guarantees

### Retry Logic
- Failed deliveries are automatically retried with exponential backoff
- Maximum 5 retry attempts
- Retry intervals: 30s, 60s, 120s, 240s, 480s

### Delivery Status
- **pending**: Delivery is scheduled or in progress
- **delivered**: Successfully delivered (HTTP 2xx response)
- **failed**: All retry attempts exhausted

### Audit Log
The delivery history provides a complete audit log including:
- Event type and timestamp
- HTTP status code
- Response body (truncated)
- Error messages
- Retry count
- Delivery status

## Best Practices

1. **Verify Signatures**: Always verify the webhook signature before processing
2. **Handle Idempotency**: Use event IDs to prevent duplicate processing
3. **Respond Quickly**: Return 2xx status within 10 seconds
4. **Secure Your Endpoint**: Use HTTPS and validate requests
5. **Monitor Deliveries**: Check delivery history regularly
6. **Rotate Secrets**: Periodically regenerate secrets for security
7. **Handle Failures**: Implement proper error handling and logging

## Troubleshooting

### Webhook Not Receiving Events
1. Check that the subscription is active
2. Verify the URL is correct and accessible
3. Check delivery history for error messages
4. Ensure your endpoint responds within 10 seconds
5. Verify you're subscribed to the correct events

### Authentication Failures
1. Verify signature verification is implemented correctly
2. Ensure you're using the current secret
3. Check that the payload hasn't been modified

### Rate Limiting
If you hit rate limits:
1. Reduce creation frequency
2. Implement exponential backoff
3. Cache supported events list
