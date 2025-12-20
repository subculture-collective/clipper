const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Get webhook secret from environment
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.error('ERROR: WEBHOOK_SECRET environment variable is not set');
  process.exit(1);
}

/**
 * Verify the webhook signature using HMAC-SHA256
 */
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Store processed delivery IDs to implement idempotency
 * In production, use Redis or a database
 */
const processedDeliveries = new Set();

/**
 * Process different webhook events
 */
function processWebhookEvent(event, data, deliveryId) {
  console.log(`\n=== Processing Webhook Event ===`);
  console.log(`Event: ${event}`);
  console.log(`Delivery ID: ${deliveryId}`);
  console.log(`Data:`, JSON.stringify(data, null, 2));
  
  switch (event) {
    case 'clip.submitted':
      console.log(`New clip submitted by user ${data.user_id}`);
      console.log(`Submission ID: ${data.submission_id}`);
      console.log(`Clip ID: ${data.clip_id}`);
      // Add your business logic here
      break;
      
    case 'clip.approved':
      console.log(`Clip approved: ${data.clip_id}`);
      console.log(`Approved by: ${data.approved_by}`);
      // Add your business logic here
      break;
      
    case 'clip.rejected':
      console.log(`Clip rejected: ${data.clip_id}`);
      console.log(`Reason: ${data.reason}`);
      // Add your business logic here
      break;
      
    default:
      console.log(`Unknown event type: ${event}`);
  }
  
  console.log(`=== Event Processing Complete ===\n`);
}

/**
 * Webhook endpoint
 * IMPORTANT: Use express.text() to get the raw body for signature verification
 */
app.post('/webhook', express.text({ type: 'application/json' }), (req, res) => {
  const startTime = Date.now();
  
  // Extract headers
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];
  const deliveryId = req.headers['x-webhook-delivery-id'];
  const isReplay = req.headers['x-webhook-replay'] === 'true';
  
  console.log(`\n--- Received Webhook Request ---`);
  console.log(`Event: ${event}`);
  console.log(`Delivery ID: ${deliveryId}`);
  console.log(`Is Replay: ${isReplay}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Validate required headers
  if (!signature || !event || !deliveryId) {
    console.error('Missing required headers');
    return res.status(400).json({
      error: 'Missing required headers',
      required: ['X-Webhook-Signature', 'X-Webhook-Event', 'X-Webhook-Delivery-ID']
    });
  }
  
  // Verify the signature
  try {
    if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    console.log('✓ Signature verified successfully');
  } catch (error) {
    console.error('Error verifying signature:', error);
    return res.status(500).json({ error: 'Signature verification error' });
  }
  
  // Check for duplicate delivery (idempotency)
  if (processedDeliveries.has(deliveryId)) {
    console.log('⚠ Duplicate delivery detected, skipping processing');
    return res.status(200).json({ status: 'already_processed' });
  }
  
  // Parse the payload after verification
  let payload;
  try {
    payload = JSON.parse(req.body);
  } catch (error) {
    console.error('Invalid JSON payload:', error);
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  
  // Validate payload structure
  if (!payload.event || !payload.timestamp || !payload.data) {
    console.error('Invalid payload structure');
    return res.status(400).json({ error: 'Invalid payload structure' });
  }
  
  // Mark as processed (idempotency)
  processedDeliveries.add(deliveryId);
  
  // Clean up old delivery IDs (keep last 1000)
  if (processedDeliveries.size > 1000) {
    const toDelete = Array.from(processedDeliveries).slice(0, 100);
    toDelete.forEach(id => processedDeliveries.delete(id));
  }
  
  // Process the webhook event asynchronously
  // Respond quickly (within 10 seconds) to avoid retries
  setImmediate(() => {
    try {
      processWebhookEvent(event, payload.data, deliveryId);
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
  });
  
  const processingTime = Date.now() - startTime;
  console.log(`✓ Request handled in ${processingTime}ms`);
  console.log(`--- Request Complete ---\n`);
  
  // Respond with success
  res.status(200).json({
    status: 'success',
    received_at: new Date().toISOString(),
    processing_time_ms: processingTime
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Clipper Webhook Test Server',
    endpoints: {
      webhook: 'POST /webhook',
      health: 'GET /health'
    },
    stats: {
      processed_deliveries: processedDeliveries.size
    }
  });
});

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log('\n===========================================');
  console.log('  Clipper Webhook Test Server');
  console.log('===========================================');
  console.log(`  Server running on port ${PORT}`);
  console.log(`  Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  console.log('===========================================\n');
  console.log('Waiting for webhook requests...\n');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
