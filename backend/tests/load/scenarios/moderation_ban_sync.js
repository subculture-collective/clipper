/**
 * K6 Load Test - Ban Sync Performance
 * 
 * Tests Twitch ban synchronization with large datasets (10,000+ bans)
 * Validates batch processing, database performance, and API response times
 * 
 * Acceptance Criteria:
 * - Sync 10,000+ bans successfully
 * - p99 response time < 500ms for API endpoints
 * - No N+1 query issues
 * - Batch operations complete efficiently
 * 
 * Run with: k6 run backend/tests/load/scenarios/moderation_ban_sync.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const syncDuration = new Trend('sync_duration');
const batchProcessTime = new Trend('batch_process_time');
const totalBansSynced = new Counter('total_bans_synced');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 5 },   // Ramp up to 5 concurrent syncs
        { duration: '2m', target: 10 },   // Increase to 10 concurrent syncs
        { duration: '3m', target: 10 },   // Maintain load
        { duration: '1m', target: 20 },   // Stress test with 20 concurrent
        { duration: '30s', target: 0 },   // Ramp down
    ],
    
    thresholds: {
        // API response times
        'http_req_duration': ['p(95)<200', 'p(99)<500'],
        'http_req_duration{endpoint:sync_bans}': ['p(95)<500', 'p(99)<1000'],
        'http_req_duration{endpoint:get_bans}': ['p(95)<100', 'p(99)<200'],
        
        // Sync-specific metrics
        'sync_duration': ['p(95)<2000', 'p(99)<5000'],
        'batch_process_time': ['p(95)<100', 'p(99)<200'],
        
        // Error thresholds
        'errors': ['rate<0.01'],
        'http_req_failed': ['rate<0.01'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-admin-token-for-load-testing';

// Test data - channel IDs and moderator tokens
const testChannels = [
    'perf_channel_1', 'perf_channel_2', 'perf_channel_3', 'perf_channel_4', 'perf_channel_5',
    'perf_channel_6', 'perf_channel_7', 'perf_channel_8', 'perf_channel_9', 'perf_channel_10',
];

/**
 * Setup function - verify prerequisites
 */
export function setup() {
    console.log('Starting ban sync performance test');
    console.log(`Target URL: ${BASE_URL}`);
    
    // Verify API is accessible
    const response = http.get(`${BASE_URL}/health`);
    if (response.status !== 200) {
        throw new Error('API health check failed');
    }
    
    console.log('Prerequisites verified. Test data should include 10,000+ bans.');
    
    return {
        startTime: new Date(),
    };
}

/**
 * Main test function
 */
export default function () {
    const channelID = testChannels[Math.floor(Math.random() * testChannels.length)];
    
    // Test 1: Get existing bans (list operation)
    testGetBanList(channelID);
    
    sleep(1);
    
    // Test 2: Sync bans from Twitch (batch operation)
    if (Math.random() < 0.3) { // 30% of iterations trigger sync
        testSyncBans(channelID);
    }
    
    sleep(2);
    
    // Test 3: Get ban details (single record)
    testGetBanDetails(channelID);
    
    sleep(1);
}

/**
 * Test getting ban list with pagination
 */
function testGetBanList(channelID) {
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'get_bans',
            operation: 'list',
        },
    };
    
    const limit = [50, 100, 200][Math.floor(Math.random() * 3)];
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/bans?channel_id=${channelID}&limit=${limit}`,
        params
    );
    
    const success = check(response, {
        'get bans status is 200': (r) => r.status === 200,
        'get bans response time < 200ms': (r) => r.timings.duration < 200,
        'get bans has data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
        'get bans pagination works': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.meta && typeof body.meta.total === 'number';
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

/**
 * Test ban sync operation (simulates Twitch API sync)
 */
function testSyncBans(channelID) {
    const startTime = Date.now();
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        tags: {
            endpoint: 'sync_bans',
            operation: 'batch_sync',
        },
    };
    
    const payload = JSON.stringify({
        channel_id: channelID,
        force_full_sync: Math.random() < 0.1, // 10% force full sync
    });
    
    const response = http.post(
        `${BASE_URL}/api/v1/admin/moderation/bans/sync`,
        payload,
        params
    );
    
    const duration = Date.now() - startTime;
    syncDuration.add(duration);
    
    const success = check(response, {
        'sync bans status is 200 or 202': (r) => r.status === 200 || r.status === 202,
        'sync bans response time < 1000ms': (r) => r.timings.duration < 1000,
        'sync bans returns sync info': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && typeof body.data.synced_count === 'number';
            } catch (e) {
                return false;
            }
        },
    });
    
    if (success && response.status === 200) {
        try {
            const body = JSON.parse(response.body);
            totalBansSynced.add(body.data.synced_count || 0);
            batchProcessTime.add(body.data.process_time_ms || duration);
        } catch (e) {
            // Ignore parse errors
        }
    } else {
        errorRate.add(1);
    }
}

/**
 * Test getting details for a specific ban
 */
function testGetBanDetails(channelID) {
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'get_ban_details',
            operation: 'read',
        },
    };
    
    // Get a random ban from the channel
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/bans?channel_id=${channelID}&limit=1`,
        params
    );
    
    if (response.status === 200) {
        try {
            const body = JSON.parse(response.body);
            if (body.data && body.data.length > 0) {
                const banID = body.data[0].id;
                
                // Get full ban details
                const detailResponse = http.get(
                    `${BASE_URL}/api/v1/admin/moderation/bans/${banID}`,
                    params
                );
                
                check(detailResponse, {
                    'get ban details status is 200': (r) => r.status === 200,
                    'get ban details response time < 100ms': (r) => r.timings.duration < 100,
                }) || errorRate.add(1);
            }
        } catch (e) {
            // Ignore if no bans exist yet
        }
    }
}

/**
 * Teardown function - print results
 */
export function teardown(data) {
    console.log('Ban sync performance test completed');
    console.log(`Started at: ${data.startTime}`);
    console.log(`Completed at: ${new Date()}`);
}
