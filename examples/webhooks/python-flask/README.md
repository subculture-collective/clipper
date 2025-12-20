# Python Flask Webhook Test Server

A simple Flask server for testing Clipper webhook signature verification and event handling.

## Features

- ✅ HMAC-SHA256 signature verification
- ✅ Timing-safe signature comparison
- ✅ Idempotency handling (prevents duplicate processing)
- ✅ Detailed logging
- ✅ Health check endpoint
- ✅ Graceful shutdown

## Prerequisites

- Python 3.8+
- pip

## Installation

1. Create a virtual environment (recommended):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file:

```bash
cp .env.example .env
```

4. Edit `.env` and set your webhook secret:

```
WEBHOOK_SECRET=your-webhook-secret-here
PORT=3000
```

## Running the Server

```bash
# Using python
python server.py

# Or using Flask CLI
export FLASK_APP=server.py
flask run --port 3000
```

The server will start on port 3000 (or the PORT specified in your environment).

## Testing Locally

### Using ngrok (Recommended)

1. Install [ngrok](https://ngrok.com/)

2. Start your server:
```bash
python server.py
```

3. In another terminal, start ngrok:
```bash
ngrok http 3000
```

4. Use the ngrok HTTPS URL in your Clipper webhook subscription

### Manual Testing with curl

```bash
SECRET="your-webhook-secret"
PAYLOAD='{"event":"clip.submitted","timestamp":"2024-01-15T10:30:00Z","data":{"submission_id":"123e4567-e89b-12d3-a456-426614174000"}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -H "X-Webhook-Event: clip.submitted" \
  -H "X-Webhook-Delivery-ID: $(uuidgen)" \
  -d "$PAYLOAD"
```

## Production Deployment

For production use:

1. Use Gunicorn or uWSGI instead of Flask's development server
2. Deploy behind a reverse proxy with SSL
3. Store secrets in a secret manager
4. Use Redis or a database for processed delivery IDs
5. Implement proper logging and monitoring

### Example Gunicorn Setup

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:3000 server:app
```

## Security Notes

- This is a test/development server for learning and testing webhook signature verification
- For production use:
  - Use Gunicorn or uWSGI, not Flask's development server
  - Add rate limiting (e.g., Flask-Limiter)
  - Deploy behind a reverse proxy with SSL
  - Store secrets in a secret manager
  - Use Redis or a database for processed delivery IDs
  - Implement proper logging and monitoring
  - Add request validation and error handling

## Support

For more information, see:
- [Webhook Signature Verification Guide](../../../docs/WEBHOOK_SIGNATURE_VERIFICATION.md)
- [Webhook Subscription Management](../../../docs/WEBHOOK_SUBSCRIPTION_MANAGEMENT.md)
