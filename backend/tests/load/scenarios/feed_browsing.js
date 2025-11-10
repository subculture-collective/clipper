/**
 * K6 Load Test for Clip Feed Endpoint
 *
 * Tests feed endpoint performance under various load scenarios
 * Target: Feed response time <100ms (p95), Handle 100 req/s
 *
 * Run with: k6 run backend/tests/load/scenarios/feed_browsing.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const feedLoadTime = new Trend('feed_load_time');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 50 }, // Ramp up to 50 users
        { duration: '1m', target: 100 }, // Ramp up to 100 users
        { duration: '2m', target: 100 }, // Stay at 100 users
        { duration: '30s', target: 0 }, // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<100'], // 95% of requests should be below 100ms
        errors: ['rate<0.05'], // Error rate should be below 5%
        http_req_failed: ['rate<0.05'], // Failed requests should be below 5%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    // Test different feed endpoints
    const endpoints = [
        '/api/v1/clips?sort=hot&limit=25',
        '/api/v1/clips?sort=new&limit=25',
        '/api/v1/clips?sort=top&limit=25&timeframe=week',
    ];

    // Randomly select an endpoint
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    const response = http.get(`${BASE_URL}${endpoint}`, {
        headers: {
            Accept: 'application/json',
        },
    });

    // Record custom metric
    feedLoadTime.add(response.timings.duration);

    // Check response
    const result = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 100ms': (r) => r.timings.duration < 100,
        'response time < 50ms': (r) => r.timings.duration < 50,
        'has data array': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
    });

    errorRate.add(!result);

    // Random sleep between 1-3 seconds to simulate real user behavior
    sleep(Math.random() * 2 + 1);
}

/**
 * Setup function - runs once before test
 */
export function setup() {
    console.log('Starting load test for feed endpoint');
    console.log(`Target URL: ${BASE_URL}`);
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
    console.log('Load test completed');
}
