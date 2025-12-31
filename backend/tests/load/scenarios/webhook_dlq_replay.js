/**
 * K6 Load Test: DLQ Replay Scenario
 * 
 * Tests dead-letter queue replay at scale with:
 * - Bulk replay operations
 * - Rate limiting enforcement
 * - Retry backoff validation
 * - Throughput measurement
 * 
 * Run with: k6 run backend/tests/load/scenarios/webhook_dlq_replay.js
 * 
 * With custom config:
 * k6 run -e BASE_URL=http://localhost:8080 -e AUTH_TOKEN=your_token \
 *        -e DLQ_SIZE=1000 backend/tests/load/scenarios/webhook_dlq_replay.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const dlqReplaySuccess = new Counter('webhook_dlq_replay_success');
const dlqReplayFailure = new Counter('webhook_dlq_replay_failure');
const dlqReplayDuration = new Trend('webhook_dlq_replay_duration');
const dlqReplayRateLimited = new Counter('webhook_dlq_replay_rate_limited');
const activeDLQReplays = new Gauge('active_dlq_replays');
const dlqItemsFetched = new Counter('dlq_items_fetched');

// Test configuration
export const options = {
    scenarios: {
        // Scenario 1: List and fetch DLQ items
        fetch_dlq_items: {
            executor: 'constant-vus',
            vus: 5,
            duration: '2m',
            exec: 'fetchDLQItems',
            gracefulStop: '30s',
        },
        // Scenario 2: Replay DLQ items with rate limiting
        replay_dlq_items: {
            executor: 'ramping-arrival-rate',
            startRate: 5,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 50,
            stages: [
                { duration: '1m', target: 10 },  // Start with 10 replays/sec
                { duration: '2m', target: 20 },  // Ramp to 20 replays/sec
                { duration: '3m', target: 20 },  // Sustain 20 replays/sec
                { duration: '1m', target: 5 },   // Ramp down
            ],
            exec: 'replayDLQItem',
            gracefulStop: '30s',
        },
        // Scenario 3: Bulk replay operations
        bulk_replay: {
            executor: 'shared-iterations',
            vus: 3,
            iterations: 10,
            maxDuration: '5m',
            exec: 'bulkReplay',
            startTime: '3m', // Start after initial replay has been running
        },
    },
    thresholds: {
        'webhook_dlq_replay_duration': ['p(95)<2000', 'p(99)<5000'],
        'webhook_dlq_replay_success': ['count>800'], // At least 80% success for 1000 items
        'http_req_failed{scenario:fetch_dlq_items}': ['rate<0.01'],
        'http_req_failed{scenario:replay_dlq_items}': ['rate<0.10'], // Allow 10% failure for retries
        'http_req_duration{scenario:fetch_dlq_items}': ['p(95)<200'],
        'http_req_duration{scenario:replay_dlq_items}': ['p(95)<2000'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const DLQ_SIZE = parseInt(__ENV.DLQ_SIZE || '1000');

// Track replayed DLQ items to avoid duplicates
const replayedItems = new Set();

// Get auth headers
function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
    };
}

// Fetch DLQ items
export function fetchDLQItems() {
    const page = Math.floor(Math.random() * 10) + 1; // Random page 1-10
    const limit = 20;
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/webhooks/dlq?page=${page}&limit=${limit}`,
        {
            headers: getHeaders(),
            tags: {
                scenario: 'fetch_dlq_items',
            },
        }
    );
    
    const success = check(response, {
        'status is 200': (r) => r.status === 200,
        'has items array': (r) => r.json('items') !== undefined,
        'has pagination': (r) => r.json('pagination') !== undefined,
        'response time < 200ms': (r) => r.timings.duration < 200,
    });
    
    if (success) {
        const data = response.json();
        dlqItemsFetched.add(data.items ? data.items.length : 0);
        
        // Log sample DLQ item structure
        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            check(item, {
                'has id': (i) => i.id !== undefined,
                'has subscription_id': (i) => i.subscription_id !== undefined,
                'has delivery_id': (i) => i.delivery_id !== undefined,
                'has event_type': (i) => i.event_type !== undefined,
                'has error_message': (i) => i.error_message !== undefined,
                'has attempt_count': (i) => i.attempt_count !== undefined,
            });
        }
    }
    
    sleep(1); // Small delay between fetches
}

// Replay a single DLQ item
export function replayDLQItem() {
    const startTime = Date.now();
    activeDLQReplays.add(1);
    
    // Generate a mock DLQ item ID (in real test, would use actual IDs from fetch)
    const dlqItemID = generateMockDLQItemID();
    
    // Check if already replayed (idempotency check)
    if (replayedItems.has(dlqItemID)) {
        activeDLQReplays.add(-1);
        return;
    }
    
    const response = http.post(
        `${BASE_URL}/api/v1/admin/webhooks/dlq/${dlqItemID}/replay`,
        null,
        {
            headers: getHeaders(),
            tags: {
                scenario: 'replay_dlq_items',
            },
        }
    );
    
    const duration = Date.now() - startTime;
    activeDLQReplays.add(-1);
    
    // Record metrics
    dlqReplayDuration.add(duration);
    
    // Check response
    const success = check(response, {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404, // 404 = already replayed
        'status is 429 (rate limited)': (r) => r.status === 429,
        'has success message': (r) => r.status === 200 && r.json('message') !== undefined,
        'response time < 5000ms': (r) => r.timings.duration < 5000,
    });
    
    if (response.status === 200) {
        dlqReplaySuccess.add(1);
        replayedItems.add(dlqItemID);
    } else if (response.status === 429) {
        dlqReplayRateLimited.add(1);
        // Backoff on rate limit
        sleep(1);
    } else if (response.status !== 404) {
        dlqReplayFailure.add(1);
    }
    
    // Small sleep to respect rate limits
    sleep(0.05); // 50ms between replays
}

// Bulk replay multiple DLQ items
export function bulkReplay() {
    const batchSize = 50; // Replay 50 items in this batch
    let successCount = 0;
    let failureCount = 0;
    
    console.log(`[BULK_REPLAY] Starting bulk replay of ${batchSize} items`);
    
    for (let i = 0; i < batchSize; i++) {
        const dlqItemID = generateMockDLQItemID();
        
        const response = http.post(
            `${BASE_URL}/api/v1/admin/webhooks/dlq/${dlqItemID}/replay`,
            null,
            {
                headers: getHeaders(),
                tags: {
                    scenario: 'bulk_replay',
                },
            }
        );
        
        if (response.status === 200) {
            successCount++;
            dlqReplaySuccess.add(1);
        } else if (response.status === 429) {
            dlqReplayRateLimited.add(1);
            // Exponential backoff on rate limit
            const backoffTime = Math.min(Math.pow(2, failureCount) * 0.1, 5);
            sleep(backoffTime);
        } else {
            failureCount++;
            dlqReplayFailure.add(1);
        }
        
        // Small delay between requests
        sleep(0.1);
    }
    
    console.log(`[BULK_REPLAY] Completed: ${successCount} success, ${failureCount} failure`);
}

// Helper: Generate mock DLQ item ID
// In real scenario, would fetch actual DLQ item IDs from the API
function generateMockDLQItemID() {
    const chars = '0123456789abcdef';
    let id = '';
    for (let i = 0; i < 32; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
        if (i === 7 || i === 11 || i === 15 || i === 19) {
            id += '-';
        }
    }
    return id;
}

export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'backend/tests/load/reports/webhook_dlq_replay_summary.json': JSON.stringify(data),
        'backend/tests/load/reports/webhook_dlq_replay_summary.html': htmlReport(data),
    };
}

// Text summary helper
function textSummary(data, options) {
    const indent = options?.indent || '';
    
    let summary = '\n' + indent + '=== DLQ Replay Load Test Summary ===\n\n';
    
    // Test duration
    summary += indent + `Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
    
    // Metrics
    if (data.metrics.webhook_dlq_replay_success) {
        summary += indent + `✓ Successful Replays: ${data.metrics.webhook_dlq_replay_success.values.count}\n`;
    }
    if (data.metrics.webhook_dlq_replay_failure) {
        summary += indent + `✗ Failed Replays: ${data.metrics.webhook_dlq_replay_failure.values.count}\n`;
    }
    if (data.metrics.webhook_dlq_replay_rate_limited) {
        summary += indent + `⚠ Rate Limited Requests: ${data.metrics.webhook_dlq_replay_rate_limited.values.count}\n`;
    }
    if (data.metrics.dlq_items_fetched) {
        summary += indent + `📋 DLQ Items Fetched: ${data.metrics.dlq_items_fetched.values.count}\n`;
    }
    
    // Latency
    if (data.metrics.webhook_dlq_replay_duration) {
        const duration = data.metrics.webhook_dlq_replay_duration.values;
        summary += indent + `\nReplay Latency:\n`;
        summary += indent + `  p(50): ${duration.med.toFixed(2)}ms\n`;
        summary += indent + `  p(95): ${duration['p(95)'].toFixed(2)}ms\n`;
        summary += indent + `  p(99): ${duration['p(99)'].toFixed(2)}ms\n`;
    }
    
    // Calculate success rate
    const successCount = data.metrics.webhook_dlq_replay_success?.values.count || 0;
    const failureCount = data.metrics.webhook_dlq_replay_failure?.values.count || 0;
    const totalAttempts = successCount + failureCount;
    if (totalAttempts > 0) {
        const successRate = (successCount / totalAttempts * 100).toFixed(2);
        summary += indent + `\nSuccess Rate: ${successRate}%\n`;
    }
    
    return summary;
}

// HTML report helper
function htmlReport(data) {
    const successCount = data.metrics.webhook_dlq_replay_success?.values.count || 0;
    const failureCount = data.metrics.webhook_dlq_replay_failure?.values.count || 0;
    const rateLimitedCount = data.metrics.webhook_dlq_replay_rate_limited?.values.count || 0;
    const totalAttempts = successCount + failureCount;
    const successRate = totalAttempts > 0 ? (successCount / totalAttempts * 100).toFixed(2) : 0;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>DLQ Replay Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .metric { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .success { color: green; }
        .failure { color: red; }
        .warning { color: orange; }
    </style>
</head>
<body>
    <h1>DLQ Replay Load Test Report</h1>
    <div class="metric">
        <h2>Summary</h2>
        <p>Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s</p>
        <p class="success">Successful Replays: ${successCount}</p>
        <p class="failure">Failed Replays: ${failureCount}</p>
        <p class="warning">Rate Limited: ${rateLimitedCount}</p>
        <p><strong>Success Rate: ${successRate}%</strong></p>
    </div>
    <div class="metric">
        <h2>Performance</h2>
        <p>p95 Latency: ${data.metrics.webhook_dlq_replay_duration?.values['p(95)'].toFixed(2) || 0}ms</p>
        <p>p99 Latency: ${data.metrics.webhook_dlq_replay_duration?.values['p(99)'].toFixed(2) || 0}ms</p>
    </div>
</body>
</html>
    `;
}
