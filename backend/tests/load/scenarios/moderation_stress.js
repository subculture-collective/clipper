/**
 * K6 Load Test - Moderation API Stress Test
 * 
 * Comprehensive stress test for all moderation endpoints
 * Tests system behavior under high load and identifies bottlenecks
 * 
 * Acceptance Criteria:
 * - Handle 100+ concurrent users
 * - All endpoints respond within SLA (p99 < 500ms)
 * - System remains stable under stress
 * - Database performs well under load
 * - No memory leaks or resource exhaustion
 * 
 * Run with: k6 run backend/tests/load/scenarios/moderation_stress.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time_ms');
const requestsPerSecond = new Counter('requests_per_second');
const concurrentUsers = new Gauge('concurrent_users');
const databaseQueryTime = new Trend('database_query_time_ms');

// Test configuration - Stress test pattern
export const options = {
    stages: [
        // Baseline
        { duration: '1m', target: 50 },     // Baseline load
        
        // Stress phase 1 - Normal capacity
        { duration: '2m', target: 100 },    // Normal operating capacity
        
        // Stress phase 2 - Beyond capacity
        { duration: '2m', target: 200 },    // Stress beyond normal capacity
        
        // Stress phase 3 - Peak stress
        { duration: '2m', target: 300 },    // Maximum stress
        
        // Recovery phase
        { duration: '2m', target: 150 },    // Reduced load to test recovery
        
        // Cool down
        { duration: '1m', target: 0 },      // Ramp down
    ],
    
    thresholds: {
        // Response time thresholds - more lenient during stress
        'http_req_duration': ['p(95)<500', 'p(99)<1000'],
        
        // Endpoint-specific thresholds
        'http_req_duration{endpoint:moderation_queue}': ['p(95)<300', 'p(99)<600'],
        'http_req_duration{endpoint:audit_logs}': ['p(95)<300', 'p(99)<600'],
        'http_req_duration{endpoint:ban_operations}': ['p(95)<500', 'p(99)<1000'],
        'http_req_duration{endpoint:moderator_management}': ['p(95)<200', 'p(99)<400'],
        
        // Error thresholds - allow slightly higher during peak stress
        'errors': ['rate<0.05'], // Less than 5% errors
        'http_req_failed': ['rate<0.05'],
        
        // System should handle minimum throughput
        'requests_per_second': ['count>500'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-admin-token-for-load-testing';

// Test data
const priorities = ['critical', 'high', 'medium', 'low'];
const statuses = ['pending', 'approved', 'rejected'];
const actions = ['approve', 'reject', 'escalate', 'ban_user'];

/**
 * Setup function
 */
export function setup() {
    console.log('Starting moderation API stress test');
    console.log(`Target URL: ${BASE_URL}`);
    console.log('This test will stress all moderation endpoints with high concurrency');
    
    // Verify API is accessible
    const response = http.get(`${BASE_URL}/health`);
    if (response.status !== 200) {
        throw new Error('API health check failed');
    }
    
    return {
        startTime: new Date(),
    };
}

/**
 * Main test function - simulates various moderation activities
 */
export default function () {
    concurrentUsers.add(1);
    requestsPerSecond.add(1);
    
    // Weighted distribution of operations (realistic usage pattern)
    const operation = Math.random();
    
    if (operation < 0.35) {
        // 35% - Query moderation queue
        testModerationQueue();
    } else if (operation < 0.60) {
        // 25% - Query audit logs
        testAuditLogs();
    } else if (operation < 0.75) {
        // 15% - Moderator management
        testModeratorManagement();
    } else if (operation < 0.88) {
        // 13% - Ban operations
        testBanOperations();
    } else if (operation < 0.95) {
        // 7% - Approve/reject content
        testContentModeration();
    } else {
        // 5% - Analytics queries
        testAnalytics();
    }
    
    sleep(Math.random() * 1 + 0.2); // 0.2-1.2 seconds think time
}

/**
 * Test moderation queue operations
 */
function testModerationQueue() {
    const startTime = Date.now();
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const limit = [20, 50, 100][Math.floor(Math.random() * 3)];
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'moderation_queue',
        },
    };
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/queue?status=${status}&priority=${priority}&limit=${limit}`,
        params
    );
    
    const duration = Date.now() - startTime;
    responseTime.add(duration);
    
    check(response, {
        'queue query status is 200': (r) => r.status === 200,
        'queue query response time acceptable': (r) => r.timings.duration < 600,
    }) || errorRate.add(1);
}

/**
 * Test audit log operations
 */
function testAuditLogs() {
    const startTime = Date.now();
    
    const action = actions[Math.floor(Math.random() * actions.length)];
    const limit = [50, 100, 200][Math.floor(Math.random() * 3)];
    const offset = Math.floor(Math.random() * 1000);
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'audit_logs',
        },
    };
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/audit?action=${action}&limit=${limit}&offset=${offset}`,
        params
    );
    
    const duration = Date.now() - startTime;
    responseTime.add(duration);
    databaseQueryTime.add(duration);
    
    check(response, {
        'audit log query status is 200': (r) => r.status === 200,
        'audit log response time acceptable': (r) => r.timings.duration < 600,
    }) || errorRate.add(1);
}

/**
 * Test moderator management operations
 */
function testModeratorManagement() {
    const startTime = Date.now();
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'moderator_management',
        },
    };
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/moderators`,
        params
    );
    
    const duration = Date.now() - startTime;
    responseTime.add(duration);
    
    check(response, {
        'moderator query status is 200': (r) => r.status === 200,
        'moderator query response time acceptable': (r) => r.timings.duration < 400,
    }) || errorRate.add(1);
}

/**
 * Test ban operations
 */
function testBanOperations() {
    const startTime = Date.now();
    
    const channelID = `perf_channel_${Math.floor(Math.random() * 10) + 1}`;
    const limit = [50, 100][Math.floor(Math.random() * 2)];
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'ban_operations',
        },
    };
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/bans?channel_id=${channelID}&limit=${limit}`,
        params
    );
    
    const duration = Date.now() - startTime;
    responseTime.add(duration);
    databaseQueryTime.add(duration);
    
    check(response, {
        'ban query status is 200': (r) => r.status === 200,
        'ban query response time acceptable': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
}

/**
 * Test content moderation (approve/reject)
 */
function testContentModeration() {
    const startTime = Date.now();
    
    // First get a queue item
    const getParams = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'content_moderation',
        },
    };
    
    const queueResponse = http.get(
        `${BASE_URL}/api/v1/admin/moderation/queue?status=pending&limit=1`,
        getParams
    );
    
    if (queueResponse.status === 200) {
        try {
            const body = JSON.parse(queueResponse.body);
            if (body.data && body.data.length > 0) {
                const itemID = body.data[0].id;
                const action = Math.random() < 0.7 ? 'approve' : 'reject';
                
                const postParams = {
                    headers: {
                        'Authorization': `Bearer ${AUTH_TOKEN}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    tags: {
                        endpoint: 'content_moderation',
                        action: action,
                    },
                };
                
                const payload = action === 'reject' ? JSON.stringify({ reason: 'Test rejection' }) : '';
                
                const response = http.post(
                    `${BASE_URL}/api/v1/admin/moderation/${itemID}/${action}`,
                    payload,
                    postParams
                );
                
                check(response, {
                    'moderation action status is 200': (r) => r.status === 200,
                }) || errorRate.add(1);
            }
        } catch (e) {
            // Ignore parsing errors during stress test
        }
    }
    
    const duration = Date.now() - startTime;
    responseTime.add(duration);
}

/**
 * Test analytics queries
 */
function testAnalytics() {
    const startTime = Date.now();
    
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'analytics',
        },
    };
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/analytics?days=${daysAgo}`,
        params
    );
    
    const duration = Date.now() - startTime;
    responseTime.add(duration);
    databaseQueryTime.add(duration);
    
    check(response, {
        'analytics query status is 200': (r) => r.status === 200,
        'analytics response time acceptable': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
}

/**
 * Teardown function
 */
export function teardown(data) {
    console.log('\n=== Moderation Stress Test Results ===');
    console.log(`Started at: ${data.startTime}`);
    console.log(`Completed at: ${new Date()}`);
    console.log('\nCheck the following:');
    console.log('- Response time trends during stress phases');
    console.log('- Error rates during peak load (should be < 5%)');
    console.log('- Database query performance degradation');
    console.log('- System recovery after peak stress');
    console.log('- Memory usage and resource utilization');
}
