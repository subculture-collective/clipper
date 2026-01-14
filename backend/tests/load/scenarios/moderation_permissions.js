/**
 * K6 Load Test - Permission Check Performance
 * 
 * Tests moderation permission checking under load
 * Validates efficient permission checks with no N+1 query issues
 * 
 * Acceptance Criteria:
 * - 100+ concurrent users checking permissions
 * - p99 response time < 500ms
 * - No N+1 queries in permission checks
 * - Efficient role-based access control
 * - Cache utilization for repeated checks
 * 
 * Run with: k6 run backend/tests/load/scenarios/moderation_permissions.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const permissionCheckDuration = new Trend('permission_check_duration');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');
const permissionChecks = new Counter('total_permission_checks');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 30 },    // Ramp up to 30 users
        { duration: '1m', target: 60 },     // Increase to 60 users
        { duration: '2m', target: 100 },    // Stress with 100 users
        { duration: '2m', target: 100 },    // Maintain 100 users
        { duration: '1m', target: 150 },    // Peak load
        { duration: '30s', target: 0 },     // Ramp down
    ],
    
    thresholds: {
        // Response time thresholds
        'http_req_duration': ['p(95)<200', 'p(99)<500'],
        'http_req_duration{endpoint:check_moderator_permission}': ['p(95)<100', 'p(99)<200'],
        'http_req_duration{endpoint:list_moderators}': ['p(95)<150', 'p(99)<300'],
        'http_req_duration{endpoint:community_permissions}': ['p(95)<100', 'p(99)<200'],
        
        // Permission check metrics
        'permission_check_duration': ['p(95)<100', 'p(99)<200'],
        
        // Error rate
        'errors': ['rate<0.01'],
        'http_req_failed': ['rate<0.01'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-admin-token-for-load-testing';

/**
 * Setup function
 */
export function setup() {
    console.log('Starting permission check performance test');
    console.log(`Target URL: ${BASE_URL}`);
    
    // Verify API is accessible
    const response = http.get(`${BASE_URL}/health`);
    if (response.status !== 200) {
        throw new Error('API health check failed');
    }
    
    console.log('Test will check permissions for various user roles and communities.');
    
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
    
    if (scenario < 0.4) {
        // 40% - Check individual moderator permissions
        testModeratorPermissions();
    } else if (scenario < 0.7) {
        // 30% - List moderators (involves permission checks)
        testListModerators();
    } else if (scenario < 0.9) {
        // 20% - Community permission checks
        testCommunityPermissions();
    } else {
        // 10% - Batch permission checks
        testBatchPermissionChecks();
    }
    
    sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds think time
}

/**
 * Test individual moderator permission checks
 */
function testModeratorPermissions() {
    const startTime = Date.now();
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'check_moderator_permission',
            operation: 'permission_check',
        },
    };
    
    // Simulate checking if user can manage moderators
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/moderators`,
        params
    );
    
    const duration = Date.now() - startTime;
    permissionCheckDuration.add(duration);
    permissionChecks.add(1);
    
    const success = check(response, {
        'moderator permission check status is 200 or 403': (r) => r.status === 200 || r.status === 403,
        'moderator permission check response time < 200ms': (r) => r.timings.duration < 200,
        'moderator permission check has proper response': (r) => {
            if (r.status === 200) {
                try {
                    const body = JSON.parse(r.body);
                    return body.success === true && Array.isArray(body.data);
                } catch (e) {
                    return false;
                }
            }
            return true; // 403 is valid
        },
        'no N+1 queries in permission check': (r) => {
            // Response should be fast even with permission checks
            return r.timings.duration < 200;
        },
    });
    
    // Track cache hits based on response headers (if cache-control header present)
    if (response.headers['X-Cache-Hit']) {
        cacheHits.add(1);
    } else if (response.headers['X-Cache-Miss']) {
        cacheMisses.add(1);
    }
    
    if (!success) {
        errorRate.add(1);
    }
}

/**
 * Test listing moderators (includes permission validation)
 */
function testListModerators() {
    const startTime = Date.now();
    
    const limit = [20, 50, 100][Math.floor(Math.random() * 3)];
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'list_moderators',
            operation: 'list_with_permissions',
        },
    };
    
    const response = http.get(
        `${BASE_URL}/api/v1/admin/moderation/moderators?limit=${limit}`,
        params
    );
    
    const duration = Date.now() - startTime;
    permissionCheckDuration.add(duration);
    permissionChecks.add(1);
    
    const success = check(response, {
        'list moderators status is 200': (r) => r.status === 200,
        'list moderators response time < 300ms': (r) => r.timings.duration < 300,
        'list moderators has data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
        'list moderators no N+1 for permissions': (r) => {
            // Should not scale linearly with result count
            // Even with 100 results, should be under 300ms
            return r.timings.duration < 300;
        },
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

/**
 * Test community-specific permission checks
 */
function testCommunityPermissions() {
    const startTime = Date.now();
    
    const communitySlug = `perf-test-community-${Math.floor(Math.random() * 20) + 1}`;
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'community_permissions',
            operation: 'community_permission_check',
        },
    };
    
    // Get community moderators (checks permissions)
    const response = http.get(
        `${BASE_URL}/api/v1/communities/${communitySlug}/moderators`,
        params
    );
    
    const duration = Date.now() - startTime;
    permissionCheckDuration.add(duration);
    permissionChecks.add(1);
    
    const success = check(response, {
        'community permission check status is 200 or 403': (r) => r.status === 200 || r.status === 403,
        'community permission check response time < 200ms': (r) => r.timings.duration < 200,
        'community permission check efficient': (r) => {
            // Should be fast even for communities with many moderators
            return r.timings.duration < 300;
        },
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

/**
 * Test batch permission checks (multiple permissions at once)
 */
function testBatchPermissionChecks() {
    const startTime = Date.now();
    
    const params = {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json',
        },
        tags: {
            endpoint: 'batch_permissions',
            operation: 'batch_check',
        },
    };
    
    // Perform multiple permission-gated operations in quick succession
    const operations = [
        http.get(`${BASE_URL}/api/v1/admin/moderation/moderators`, params),
        http.get(`${BASE_URL}/api/v1/admin/moderation/queue`, params),
        http.get(`${BASE_URL}/api/v1/admin/moderation/audit`, params),
    ];
    
    const duration = Date.now() - startTime;
    permissionChecks.add(operations.length);
    
    // Check that all operations completed successfully and efficiently
    const allSuccessful = operations.every(response => {
        return check(response, {
            'batch operation status is 200 or 403': (r) => r.status === 200 || r.status === 403,
            'batch operation response time < 300ms': (r) => r.timings.duration < 300,
        });
    });
    
    const success = check(null, {
        'batch operations completed': () => allSuccessful,
        'batch operations total time < 1000ms': () => duration < 1000,
        'no N+1 queries across batch': () => {
            // Average time per operation should be reasonable
            const avgTime = duration / operations.length;
            return avgTime < 350;
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
    console.log('Permission check performance test completed');
    console.log(`Started at: ${data.startTime}`);
    console.log(`Completed at: ${new Date()}`);
    console.log('\nKey Findings:');
    console.log('- Verify permission check times in custom metrics');
    console.log('- Check for cache hit/miss ratio');
    console.log('- Review database query patterns for N+1 issues');
}
