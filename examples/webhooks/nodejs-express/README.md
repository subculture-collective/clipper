# Node.js Express Webhook Test Server

A simple Express.js server for testing Clipper webhook signature verification and event handling.

## Features

- ✅ HMAC-SHA256 signature verification
- ✅ Timing-safe signature comparison
- ✅ Idempotency handling (prevents duplicate processing)
- ✅ Detailed logging
- ✅ Health check endpoint
- ✅ Graceful shutdown

## Prerequisites

- Node.js 14+ 
- npm or yarn

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file (or export environment variable):

```bash
cp .env.example .env
```

3. Edit `.env` and set your webhook secret:

```
WEBHOOK_SECRET=your-webhook-secret-here
PORT=3000
```

## Running the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

The server will start on port 3000 (or the PORT specified in your environment).

## Endpoints

### POST /webhook

The main webhook endpoint that verifies signatures and processes events.

**Headers:**
- `X-Webhook-Signature` (required) - HMAC-SHA256 signature
- `X-Webhook-Event` (required) - Event type
- `X-Webhook-Delivery-ID` (required) - Unique delivery ID
- `X-Webhook-Replay` (optional) - Set to "true" for replayed deliveries

**Body:** JSON payload

**Response:**
```json
{
  "status": "success",
  "received_at": "2024-01-15T10:30:00.000Z",
  "processing_time_ms": 5
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 123.456,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /

Server information endpoint.

## Testing Locally

### Option 1: Using ngrok (Recommended)

1. Install [ngrok](https://ngrok.com/):
```bash
npm install -g ngrok
```

2. Start your server:
```bash
npm start
```

3. In another terminal, start ngrok:
```bash
ngrok http 3000
```

4. Use the ngrok HTTPS URL in your Clipper webhook subscription

### Option 2: Manual Testing with curl

Generate a test signature and send a request:

```bash
# Generate signature
SECRET="your-webhook-secret"
PAYLOAD='{"event":"clip.submitted","timestamp":"2024-01-15T10:30:00Z","data":{"submission_id":"123e4567-e89b-12d3-a456-426614174000"}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Send request
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -H "X-Webhook-Event: clip.submitted" \
  -H "X-Webhook-Delivery-ID: $(uuidgen)" \
  -d "$PAYLOAD"
```

### Option 3: Using the Test Script

See the [test-payloads](../test-payloads/) directory for a ready-to-use test script.

## Customizing Event Handlers

Edit the `processWebhookEvent` function in `server.js` to add your business logic:

```javascript
function processWebhookEvent(event, data, deliveryId) {
  switch (event) {
    case 'clip.submitted':
      // Your logic here
      console.log('New clip submitted:', data.submission_id);
      break;
    
    case 'clip.approved':
      // Your logic here
      console.log('Clip approved:', data.clip_id);
      break;
    
    case 'clip.rejected':
      // Your logic here
      console.log('Clip rejected:', data.clip_id);
      break;
  }
}
```

## Production Deployment

For production use, consider:

1. **Use HTTPS:** Deploy behind a reverse proxy (nginx, Caddy) with SSL
2. **Environment Variables:** Use a proper secret management system
3. **Process Manager:** Use PM2 or systemd to keep the server running
4. **Database:** Store processed delivery IDs in Redis or a database
5. **Logging:** Use a proper logging solution (Winston, Pino)
6. **Monitoring:** Add health checks and alerts
7. **Rate Limiting:** Implement rate limiting for additional security

### Example PM2 Setup

```bash
# Install PM2
npm install -g pm2

# Start the server
pm2 start server.js --name webhook-server

# Monitor
pm2 logs webhook-server

# Auto-restart on system boot
pm2 startup
pm2 save
```

## Troubleshooting

### Signature Verification Fails

1. Ensure you're using the correct webhook secret
2. Check that the secret doesn't have extra whitespace
3. Verify you're reading the raw request body (not parsed JSON)
4. Make sure the secret matches your webhook subscription in Clipper

### Server Not Receiving Webhooks

1. Check that your webhook URL is accessible from the internet
2. Verify firewall rules allow incoming connections
3. If using ngrok, ensure it's still running
4. Check the Clipper webhook delivery logs for errors

## Security Notes

- This is a test/development server
- For production, add proper error handling, logging, and monitoring
- Store secrets securely (use environment variables or secret managers)
- Always use HTTPS in production
- Implement additional request validation as needed
- Consider adding rate limiting

## Support

For more information, see:
- [Webhook Signature Verification Guide](../../../docs/WEBHOOK_SIGNATURE_VERIFICATION.md)
- [Webhook Subscription Management](../../../docs/WEBHOOK_SUBSCRIPTION_MANAGEMENT.md)
