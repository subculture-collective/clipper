/**
 * K6 Load Test - Audit Log Query Performance
 * 
 * Tests audit log query performance with large datasets (50,000+ entries)
 * Validates filtering, pagination, sorting, and database query optimization
 * 
 * Acceptance Criteria:
 * - Query 50,000+ audit log entries efficiently
 * - p99 response time < 500ms
 * - Support complex filters (moderator, action, date range)
 * - No N+1 query issues
 * - Efficient pagination
 * 
 * Run with: k6 run backend/tests/load/scenarios/moderation_audit_logs.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const queryDuration = new Trend('query_duration');
const resultCount = new Counter('total_results_returned');
const paginationRequests = new Counter('pagination_requests');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 20 },   // Ramp up to 20 users
        { duration: '2m', target: 50 },    // Increase to 50 users
        { duration: '3m', target: 50 },    // Maintain 50 users
        { duration: '1m', target: 100 },   // Stress with 100 users
        { duration: '30s', target: 0 },    // Ramp down
    ],
    
    thresholds: {
        // Overall response times
        'http_req_duration': ['p(95)<200', 'p(99)<500'],
        
        // Query-specific thresholds
        'http_req_duration{endpoint:audit_logs_simple}': ['p(95)<100', 'p(99)<200'],
        'http_req_duration{endpoint:audit_logs_filtered}': ['p(95)<150', 'p(99)<300'],
        'http_req_duration{endpoint:audit_logs_paginated}': ['p(95)<100', 'p(99)<200'],
        
        // Custom metrics
        'query_duration': ['p(95)<150', 'p(99)<300'],
        
        // Error thresholds
        'errors': ['rate<0.01'],
        'http_req_failed': ['rate<0.01'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-admin-token-for-load-testing';

// Test data
const actions = ['approve', 'reject', 'escalate', 'ban_user'];
const moderatorIDs = []; // Will be populated in setup

/**
 * Setup function - get moderator IDs for filtering
 */
export function setup() {
    console.log('Starting audit log performance test');
    console.log(`Target URL: ${BASE_URL}`);
    
    // Verify API is accessible
    const healthResponse = http.get(`${BASE_URL}/health`);
    if (healthResponse.status !== 200) {
        throw new Error('API health check failed');
    }
    
    console.log('Prerequisites verified. Test data should include 50,000+ audit logs.');
    
    return {
        startTime: new Date(),
    };
}

/**
 * Main test function
 */
export default function () {
    // Distribute test scenarios
    const scenario = Math.random();
    
    if (scenario < 0.3) {
        // 30% - Simple queries (no filters)
        testSimpleQuery();
    } else if (scenario < 0.6) {
        // 30% - Filtered queries (single filter)
        testFilteredQuery();
    } else if (scenario < 0.85) {
        // 25% - Complex queries (multiple filters)
        testComplexQuery();
    } else {
        // 15% - Paginated queries (deep pagination)
        testPaginatedQuery();
    }
    
    sleep(Math.random() * 2 + 1); // 1-3 seconds think time
}

/**
 * Test simple audit log queries without filters
 */
function testSimpleQuery() {
    const startTime = Date.now();
    
    const limit = [50, 100, 200][Math.floor(Math.random() * 3)];
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'audit_logs_simple',
            query_type: 'simple',
        },
    };
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/audit?limit=${limit}`,
        params
    );
    
    const duration = Date.now() - startTime;
    queryDuration.add(duration);
    
    const success = check(response, {
        'simple query status is 200': (r) => r.status === 200,
        'simple query response time < 200ms': (r) => r.timings.duration < 200,
        'simple query has data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
        'simple query has pagination': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.meta && typeof body.meta.total === 'number';
            } catch (e) {
                return false;
            }
        },
    });
    
    if (success) {
        try {
            const body = JSON.parse(response.body);
            resultCount.add(body.data.length);
        } catch (e) {
            // Ignore
        }
    } else {
        errorRate.add(1);
    }
}

/**
 * Test filtered queries (single filter)
 */
function testFilteredQuery() {
    const startTime = Date.now();
    
    const action = actions[Math.floor(Math.random() * actions.length)];
    const limit = [50, 100][Math.floor(Math.random() * 2)];
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'audit_logs_filtered',
            query_type: 'filtered',
            filter: 'action',
        },
    };
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/audit?action=${action}&limit=${limit}`,
        params
    );
    
    const duration = Date.now() - startTime;
    queryDuration.add(duration);
    
    const success = check(response, {
        'filtered query status is 200': (r) => r.status === 200,
        'filtered query response time < 300ms': (r) => r.timings.duration < 300,
        'filtered query has data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
        'filtered query results match filter': (r) => {
            try {
                const body = JSON.parse(r.body);
                // Verify all results match the filter
                return body.data.every(item => item.action === action);
            } catch (e) {
                return false;
            }
        },
    });
    
    if (success) {
        try {
            const body = JSON.parse(response.body);
            resultCount.add(body.data.length);
        } catch (e) {
            // Ignore
        }
    } else {
        errorRate.add(1);
    }
}

/**
 * Test complex queries with multiple filters
 */
function testComplexQuery() {
    const startTime = Date.now();
    
    const action = actions[Math.floor(Math.random() * actions.length)];
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const limit = 100;
    const offset = Math.floor(Math.random() * 500);
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'audit_logs_filtered',
            query_type: 'complex',
            filter: 'action_date',
        },
    };
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/audit?action=${action}&start_date=${startDateStr}&limit=${limit}&offset=${offset}`,
        params
    );
    
    const duration = Date.now() - startTime;
    queryDuration.add(duration);
    
    const success = check(response, {
        'complex query status is 200': (r) => r.status === 200,
        'complex query response time < 500ms': (r) => r.timings.duration < 500,
        'complex query has data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true;
            } catch (e) {
                return false;
            }
        },
        'complex query has proper pagination': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.meta && body.meta.offset === offset && body.meta.limit === limit;
            } catch (e) {
                return false;
            }
        },
    });
    
    if (success) {
        try {
            const body = JSON.parse(response.body);
            resultCount.add(body.data ? body.data.length : 0);
        } catch (e) {
            // Ignore
        }
    } else {
        errorRate.add(1);
    }
}

/**
 * Test deep pagination (test database performance with large offsets)
 */
function testPaginatedQuery() {
    const startTime = Date.now();
    
    const limit = 100;
    const page = Math.floor(Math.random() * 100) + 1; // Pages 1-100
    const offset = (page - 1) * limit;
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'audit_logs_paginated',
            query_type: 'paginated',
        },
    };
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/audit?limit=${limit}&offset=${offset}`,
        params
    );
    
    const duration = Date.now() - startTime;
    queryDuration.add(duration);
    paginationRequests.add(1);
    
    const success = check(response, {
        'paginated query status is 200': (r) => r.status === 200,
        'paginated query response time < 200ms': (r) => r.timings.duration < 200,
        'paginated query has data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true;
            } catch (e) {
                return false;
            }
        },
        'paginated query performance acceptable for deep pages': (r) => {
            // Even at deep pagination, should be fast
            return r.timings.duration < 500;
        },
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

/**
 * Teardown function
 */
export function teardown(data) {
    console.log('Audit log performance test completed');
    console.log(`Started at: ${data.startTime}`);
    console.log(`Completed at: ${new Date()}`);
}
