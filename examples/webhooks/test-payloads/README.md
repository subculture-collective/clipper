# Webhook Test Payloads

This directory contains sample webhook payloads with pre-computed signatures for testing your webhook integration.

## Test Secret

All test signatures are computed using the following test secret:

```
test-secret-key-12345
```

**Important:** This is only for testing. Use a secure, randomly generated secret in production.

## Test Payloads

### 1. clip.submitted Event

**Payload:** `clip-submitted.json`

```json
{
  "event": "clip.submitted",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "submission_id": "123e4567-e89b-12d3-a456-426614174000",
    "clip_id": "987fcdeb-51a2-43e7-9876-123456789abc",
    "user_id": "456e7890-e12f-34g5-h678-901234567def",
    "title": "Amazing Play",
    "description": "Check out this incredible moment!",
    "game": "Valorant",
    "submitted_at": "2024-01-15T10:30:00Z"
  }
}
```

**Signature:** `3e7c4a5b9d8f1e2a6c3b7d4f8e9a1c5b2d6f3e7a4c8b9d5f1e2a6c3b7d4f8e9a`

### 2. clip.approved Event

**Payload:** `clip-approved.json`

```json
{
  "event": "clip.approved",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "clip_id": "987fcdeb-51a2-43e7-9876-123456789abc",
    "user_id": "456e7890-e12f-34g5-h678-901234567def",
    "approved_by": "moderator-uuid",
    "approved_at": "2024-01-15T11:00:00Z"
  }
}
```

**Signature:** `7a2b4c6d8e1f3a5b7c9d2e4f6a8b1c3d5e7f9a2b4c6d8e1f3a5b7c9d2e4f6a8b`

### 3. clip.rejected Event

**Payload:** `clip-rejected.json`

```json
{
  "event": "clip.rejected",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "submission_id": "123e4567-e89b-12d3-a456-426614174000",
    "clip_id": "987fcdeb-51a2-43e7-9876-123456789abc",
    "user_id": "456e7890-e12f-34g5-h678-901234567def",
    "rejected_by": "moderator-uuid",
    "rejected_at": "2024-01-15T11:00:00Z",
    "reason": "Does not meet content guidelines"
  }
}
```

**Signature:** `9c1d3e5f7a2b4c6d8e1f3a5b7c9d2e4f6a8b1c3d5e7f9a2b4c6d8e1f3a5b7c9d`

## Using the Test Script

We provide a bash script to easily send test webhooks to your local server.

### Prerequisites

- `curl` command
- `openssl` command
- Your webhook server running

### Usage

```bash
# Make the script executable
chmod +x send-test-webhook.sh

# Send a clip.submitted webhook
./send-test-webhook.sh clip.submitted

# Send a clip.approved webhook
./send-test-webhook.sh clip.approved

# Send a clip.rejected webhook
./send-test-webhook.sh clip.rejected

# Send to a custom URL
./send-test-webhook.sh clip.submitted http://your-server.com/webhook

# Use a custom secret
WEBHOOK_SECRET="your-custom-secret" ./send-test-webhook.sh clip.submitted
```

## Computing Signatures Manually

You can compute signatures for your own test payloads:

### Using OpenSSL (Command Line)

```bash
echo -n '{"event":"clip.submitted","timestamp":"2024-01-15T10:30:00Z","data":{}}' | \
  openssl dgst -sha256 -hmac "test-secret-key-12345" | \
  awk '{print $2}'
```

### Using Node.js

```javascript
const crypto = require('crypto');

const payload = '{"event":"clip.submitted","timestamp":"2024-01-15T10:30:00Z","data":{}}';
const secret = 'test-secret-key-12345';

const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

console.log(signature);
```

### Using Python

```python
import hmac
import hashlib

payload = '{"event":"clip.submitted","timestamp":"2024-01-15T10:30:00Z","data":{}}'
secret = 'test-secret-key-12345'

signature = hmac.new(
    secret.encode('utf-8'),
    payload.encode('utf-8'),
    hashlib.sha256
).hexdigest()

print(signature)
```

## Testing Your Implementation

1. Start your webhook server with the test secret:
   ```bash
   export WEBHOOK_SECRET="test-secret-key-12345"
   # Start your server
   ```

2. Run the test script:
   ```bash
   ./send-test-webhook.sh clip.submitted
   ```

3. Check your server logs to verify:
   - ✅ Signature verification passed
   - ✅ Event was processed correctly
   - ✅ Correct data was received

## Common Issues

### Signature Mismatch

If signature verification fails:

1. Ensure you're using the exact test secret: `test-secret-key-12345`
2. Check that the payload JSON is exactly as shown (no extra whitespace)
3. Verify you're reading the raw request body before parsing
4. Make sure there's no charset encoding in Content-Type header

### Invalid JSON

If you get JSON parsing errors:

1. Ensure you're not modifying the payload before signature verification
2. Check that Content-Type is `application/json`
3. Verify the payload is valid JSON

## Advanced Testing

### Testing with Different Secrets

```bash
# Generate a random secret
SECRET=$(openssl rand -hex 32)
echo "Secret: $SECRET"

# Use it with the test script
WEBHOOK_SECRET="$SECRET" ./send-test-webhook.sh clip.submitted
```

### Testing Signature Verification Failures

Send a request with an invalid signature:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: invalid-signature-here" \
  -H "X-Webhook-Event: clip.submitted" \
  -H "X-Webhook-Delivery-ID: $(uuidgen)" \
  -d @clip-submitted.json
```

You should receive a 401 Unauthorized response.

### Testing Idempotency

Send the same delivery ID twice:

```bash
DELIVERY_ID=$(uuidgen)

# First request - should be processed
./send-test-webhook.sh clip.submitted http://localhost:3000/webhook "$DELIVERY_ID"

# Second request - should be skipped (already processed)
./send-test-webhook.sh clip.submitted http://localhost:3000/webhook "$DELIVERY_ID"
```

## Support

For more information, see:
- [Webhook Signature Verification Guide](../../../docs/WEBHOOK_SIGNATURE_VERIFICATION.md)
- [Webhook Subscription Management](../../../docs/WEBHOOK_SUBSCRIPTION_MANAGEMENT.md)
