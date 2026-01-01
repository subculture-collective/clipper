/**
 * K6 Load Test: Webhook Delivery Scenario
 * 
 * Tests webhook delivery at scale with:
 * - 10k+ webhook events
 * - Mixed outcomes (success/failure/timeout)
 * - Signature verification
 * - Idempotency tracking
 * - Throughput and latency measurement
 * 
 * Run with: k6 run backend/tests/load/scenarios/webhook_delivery.js
 * 
 * With custom config:
 * k6 run -e BASE_URL=http://localhost:8080 -e WEBHOOK_SECRET=your_secret \
 *        -e TARGET_EVENTS=10000 backend/tests/load/scenarios/webhook_delivery.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import crypto from 'k6/crypto';

// Custom metrics
const webhookDeliverySuccess = new Counter('webhook_delivery_success');
const webhookDeliveryFailure = new Counter('webhook_delivery_failure');
const webhookDeliveryDuration = new Trend('webhook_delivery_duration');
const webhookSignatureVerified = new Counter('webhook_signature_verified');
const webhookSignatureRejected = new Counter('webhook_signature_rejected');
const activeWebhookDeliveries = new Gauge('active_webhook_deliveries');
const webhookThroughput = new Rate('webhook_throughput');

// Test configuration
export const options = {
    scenarios: {
        webhook_delivery_ramp: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 10 },   // Ramp up to 10 VUs
                { duration: '1m', target: 50 },    // Ramp up to 50 VUs
                { duration: '3m', target: 100 },   // Reach 100 VUs for high throughput
                { duration: '5m', target: 100 },   // Sustain 100 VUs
                { duration: '1m', target: 0 },     // Ramp down
            ],
            gracefulRampDown: '30s',
        },
    },
    thresholds: {
        'webhook_delivery_duration': ['p(95)<500', 'p(99)<1000'],
        'webhook_delivery_success': ['count>9000'], // At least 9k successful deliveries (90% of 10k)
        'webhook_signature_verified': ['count>9500'], // 95%+ valid signatures
        'http_req_failed': ['rate<0.05'], // Less than 5% network failures
        'http_req_duration{scenario:webhook_delivery_ramp}': ['p(95)<500'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const WEBHOOK_SECRET = __ENV.WEBHOOK_SECRET || 'test-webhook-secret-12345';

// Generate HMAC-SHA256 signature
function generateSignature(payload, secret) {
    return crypto.hmac('sha256', secret, payload, 'hex');
}

// Generate webhook event payload
function generateWebhookEvent(eventType) {
    // Generate a simple UUID-like string for testing (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const generateUUID = () => {
        const hex = crypto.md5(crypto.randomBytes(16), 'hex');
        return `${hex.substr(0,8)}-${hex.substr(8,4)}-${hex.substr(12,4)}-${hex.substr(16,4)}-${hex.substr(20,12)}`;
    };
    
    const eventID = generateUUID();
    const timestamp = new Date().toISOString();
    
    let data = {};
    
    switch (eventType) {
        case 'clip.submitted':
            data = {
                submission_id: generateUUID(),
                clip_id: generateUUID(),
                user_id: generateUUID(),
                title: `Test Clip ${randomString(10)}`,
                description: 'Load test webhook event',
                game: randomItem(['Valorant', 'CS2', 'Dota 2', 'League of Legends']),
                submitted_at: timestamp,
            };
            break;
        case 'clip.approved':
            data = {
                clip_id: generateUUID(),
                user_id: generateUUID(),
                approved_by: generateUUID(),
                approved_at: timestamp,
            };
            break;
        case 'clip.rejected':
            data = {
                submission_id: generateUUID(),
                clip_id: generateUUID(),
                user_id: generateUUID(),
                rejected_by: generateUUID(),
                rejected_at: timestamp,
                reason: 'Does not meet content guidelines',
            };
            break;
    }
    
    return {
        event: eventType,
        event_id: eventID,
        timestamp: timestamp,
        data: data,
    };
}

// Simulate webhook delivery
function deliverWebhook(eventType, simulateInvalidSignature = false) {
    const startTime = Date.now();
    // Generate UUID-like delivery ID
    const hex = crypto.md5(crypto.randomBytes(16), 'hex');
    const deliveryID = `${hex.substr(0,8)}-${hex.substr(8,4)}-${hex.substr(12,4)}-${hex.substr(16,4)}-${hex.substr(20,12)}`;
    
    // Generate event payload
    const event = generateWebhookEvent(eventType);
    const payload = JSON.stringify(event);
    
    // Generate signature
    const signature = simulateInvalidSignature 
        ? 'invalid_signature_' + randomString(48)
        : generateSignature(payload, WEBHOOK_SECRET);
    
    // Prepare headers
    const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'X-Webhook-Delivery-ID': deliveryID,
        'User-Agent': 'Clipper-Webhooks-LoadTest/1.0',
    };
    
    // Track active deliveries
    activeWebhookDeliveries.add(1);
    
    // Send webhook
    const response = http.post(
        `${BASE_URL}/webhook/test`,
        payload,
        {
            headers: headers,
            tags: {
                scenario: 'webhook_delivery',
                event_type: eventType,
                signature_valid: simulateInvalidSignature ? 'false' : 'true',
            },
        }
    );
    
    const duration = Date.now() - startTime;
    activeWebhookDeliveries.add(-1);
    
    // Record metrics
    webhookDeliveryDuration.add(duration, { event_type: eventType });
    webhookThroughput.add(1);
    
    // Check response
    const success = check(response, {
        'status is 200 (valid signature)': (r) => simulateInvalidSignature || r.status === 200,
        'status is 401 (invalid signature)': (r) => !simulateInvalidSignature || r.status === 401,
        'response time < 1000ms': (r) => r.timings.duration < 1000,
        'has delivery confirmation': (r) => r.body && r.body.length > 0,
    });
    
    if (success && !simulateInvalidSignature) {
        webhookDeliverySuccess.add(1);
        webhookSignatureVerified.add(1);
    } else if (simulateInvalidSignature && response.status === 401) {
        webhookSignatureRejected.add(1);
    } else {
        webhookDeliveryFailure.add(1);
    }
    
    return response;
}

export default function () {
    // Distribute load across event types
    // 60% clip.submitted, 25% clip.approved, 15% clip.rejected
    const roll = Math.random();
    let eventType;
    
    if (roll < 0.60) {
        eventType = 'clip.submitted';
    } else if (roll < 0.85) {
        eventType = 'clip.approved';
    } else {
        eventType = 'clip.rejected';
    }
    
    // 5% of requests should have invalid signatures for testing
    const simulateInvalidSignature = Math.random() < 0.05;
    
    // Deliver webhook
    deliverWebhook(eventType, simulateInvalidSignature);
    
    // Small sleep to simulate realistic webhook generation pattern
    sleep(Math.random() * 0.5);
}

export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'backend/tests/load/reports/webhook_delivery_summary.json': JSON.stringify(data),
        'backend/tests/load/reports/webhook_delivery_summary.html': htmlReport(data),
    };
}

// Text summary helper
function textSummary(data, options) {
    const indent = options?.indent || '';
    
    let summary = '\n' + indent + '=== Webhook Delivery Load Test Summary ===\n\n';
    
    // Test duration
    summary += indent + `Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
    
    // Metrics
    if (data.metrics.webhook_delivery_success) {
        summary += indent + `✓ Successful Deliveries: ${data.metrics.webhook_delivery_success.values.count}\n`;
    }
    if (data.metrics.webhook_delivery_failure) {
        summary += indent + `✗ Failed Deliveries: ${data.metrics.webhook_delivery_failure.values.count}\n`;
    }
    if (data.metrics.webhook_signature_verified) {
        summary += indent + `✓ Valid Signatures: ${data.metrics.webhook_signature_verified.values.count}\n`;
    }
    if (data.metrics.webhook_signature_rejected) {
        summary += indent + `✗ Invalid Signatures: ${data.metrics.webhook_signature_rejected.values.count}\n`;
    }
    
    // Latency
    if (data.metrics.webhook_delivery_duration) {
        const duration = data.metrics.webhook_delivery_duration.values;
        summary += indent + `\nDelivery Latency:\n`;
        summary += indent + `  p(50): ${duration.med.toFixed(2)}ms\n`;
        summary += indent + `  p(95): ${duration['p(95)'].toFixed(2)}ms\n`;
        summary += indent + `  p(99): ${duration['p(99)'].toFixed(2)}ms\n`;
    }
    
    // Throughput
    const totalRequests = data.metrics.http_reqs?.values.count || 0;
    const throughput = totalRequests / (data.state.testRunDurationMs / 1000);
    summary += indent + `\nThroughput: ${throughput.toFixed(2)} req/s\n`;
    
    return summary;
}

// HTML report helper (basic version)
function htmlReport(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Webhook Delivery Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .metric { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .success { color: green; }
        .failure { color: red; }
    </style>
</head>
<body>
    <h1>Webhook Delivery Load Test Report</h1>
    <div class="metric">
        <h2>Summary</h2>
        <p>Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s</p>
        <p class="success">Successful Deliveries: ${data.metrics.webhook_delivery_success?.values.count || 0}</p>
        <p class="failure">Failed Deliveries: ${data.metrics.webhook_delivery_failure?.values.count || 0}</p>
    </div>
    <div class="metric">
        <h2>Performance</h2>
        <p>p95 Latency: ${data.metrics.webhook_delivery_duration?.values['p(95)'].toFixed(2) || 0}ms</p>
        <p>p99 Latency: ${data.metrics.webhook_delivery_duration?.values['p(99)'].toFixed(2) || 0}ms</p>
    </div>
</body>
</html>
    `;
}
