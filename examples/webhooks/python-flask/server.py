import os
import hmac
import hashlib
import json
import signal
import sys
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)

# Get webhook secret from environment
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET')

if not WEBHOOK_SECRET:
    print('ERROR: WEBHOOK_SECRET environment variable is not set', file=sys.stderr)
    sys.exit(1)

# Store processed delivery IDs (in production, use Redis or a database)
processed_deliveries = set()

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify the webhook signature using HMAC-SHA256
    
    Args:
        payload: The raw request body as bytes
        signature: The X-Webhook-Signature header value
        secret: Your webhook secret
        
    Returns:
        True if signature is valid, False otherwise
    """
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    # Use compare_digest for timing-safe comparison
    return hmac.compare_digest(signature, expected_signature)

def process_webhook_event(event: str, data: dict, delivery_id: str):
    """Process different webhook events"""
    print('\n=== Processing Webhook Event ===')
    print(f'Event: {event}')
    print(f'Delivery ID: {delivery_id}')
    print(f'Data: {json.dumps(data, indent=2)}')
    
    if event == 'clip.submitted':
        print(f"New clip submitted by user {data.get('user_id')}")
        print(f"Submission ID: {data.get('submission_id')}")
        print(f"Clip ID: {data.get('clip_id')}")
        # Add your business logic here
        
    elif event == 'clip.approved':
        print(f"Clip approved: {data.get('clip_id')}")
        print(f"Approved by: {data.get('approved_by')}")
        # Add your business logic here
        
    elif event == 'clip.rejected':
        print(f"Clip rejected: {data.get('clip_id')}")
        print(f"Reason: {data.get('reason')}")
        # Add your business logic here
        
    else:
        print(f'Unknown event type: {event}')
    
    print('=== Event Processing Complete ===\n')

@app.route('/webhook', methods=['POST'])
def webhook():
    """Main webhook endpoint"""
    start_time = datetime.now()
    
    # Get the raw body for signature verification
    payload = request.get_data()
    signature = request.headers.get('X-Webhook-Signature', '')
    event = request.headers.get('X-Webhook-Event', '')
    delivery_id = request.headers.get('X-Webhook-Delivery-ID', '')
    is_replay = request.headers.get('X-Webhook-Replay') == 'true'
    
    print('\n--- Received Webhook Request ---')
    print(f'Event: {event}')
    print(f'Delivery ID: {delivery_id}')
    print(f'Is Replay: {is_replay}')
    print(f'Timestamp: {datetime.now().isoformat()}')
    
    # Validate required headers
    if not signature or not event or not delivery_id:
        print('ERROR: Missing required headers')
        return jsonify({
            'error': 'Missing required headers',
            'required': ['X-Webhook-Signature', 'X-Webhook-Event', 'X-Webhook-Delivery-ID']
        }), 400
    
    # Verify the signature
    try:
        if not verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
            print('ERROR: Invalid webhook signature')
            return jsonify({'error': 'Invalid signature'}), 401
        print('✓ Signature verified successfully')
    except Exception as e:
        print(f'ERROR: Signature verification error: {e}')
        return jsonify({'error': 'Signature verification error'}), 500
    
    # Check for duplicate delivery (idempotency)
    if delivery_id in processed_deliveries:
        print('⚠ Duplicate delivery detected, skipping processing')
        return jsonify({'status': 'already_processed'}), 200
    
    # Parse the JSON payload after verification
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as e:
        print(f'ERROR: Invalid JSON payload: {e}')
        return jsonify({'error': 'Invalid JSON payload'}), 400
    
    # Validate payload structure
    if 'event' not in data or 'timestamp' not in data or 'data' not in data:
        print('ERROR: Invalid payload structure')
        return jsonify({'error': 'Invalid payload structure'}), 400
    
    # Mark as processed (idempotency)
    processed_deliveries.add(delivery_id)
    
    # Clean up old delivery IDs (keep last 1000)
    if len(processed_deliveries) > 1000:
        to_delete = list(processed_deliveries)[:100]
        for d_id in to_delete:
            processed_deliveries.discard(d_id)
    
    # Process the webhook event
    # In production, consider using a task queue for async processing
    try:
        process_webhook_event(event, data['data'], delivery_id)
    except Exception as e:
        print(f'ERROR: Error processing webhook: {e}')
        # Still return success to avoid retries
    
    processing_time = (datetime.now() - start_time).total_seconds() * 1000
    print(f'✓ Request handled in {processing_time:.2f}ms')
    print('--- Request Complete ---\n')
    
    # Respond with success
    return jsonify({
        'status': 'success',
        'received_at': datetime.now().isoformat(),
        'processing_time_ms': processing_time
    }), 200

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'processed_deliveries': len(processed_deliveries)
    }), 200

@app.route('/', methods=['GET'])
def root():
    """Root endpoint with server information"""
    return jsonify({
        'message': 'Clipper Webhook Test Server',
        'endpoints': {
            'webhook': 'POST /webhook',
            'health': 'GET /health'
        },
        'stats': {
            'processed_deliveries': len(processed_deliveries)
        }
    }), 200

def signal_handler(sig, frame):
    """Handle shutdown signals gracefully"""
    print('\nShutting down gracefully...')
    sys.exit(0)

if __name__ == '__main__':
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    port = int(os.environ.get('PORT', 3000))
    
    print('\n===========================================')
    print('  Clipper Webhook Test Server')
    print('===========================================')
    print(f'  Server running on port {port}')
    print(f'  Webhook endpoint: http://localhost:{port}/webhook')
    print(f'  Health check: http://localhost:{port}/health')
    print('===========================================\n')
    print('Waiting for webhook requests...\n')
    
    app.run(host='0.0.0.0', port=port, debug=False)
