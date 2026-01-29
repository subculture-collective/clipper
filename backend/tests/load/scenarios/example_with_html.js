/**
 * K6 Load Test Example with HTML Reporting
 *
 * This example demonstrates how to integrate HTML report generation
 * into your k6 load test scenarios using the html-reporter module.
 *
 * Run with: k6 run backend/tests/load/scenarios/example_with_html.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';
import { simpleHtmlReport } from '../config/html-reporter.js';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 20 },  // Ramp up to 20 users
        { duration: '1m', target: 20 },   // Stay at 20 users
        { duration: '30s', target: 0 },   // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<100'],  // 95% of requests should be below 100ms
        errors: ['rate<0.05'],              // Error rate should be below 5%
        http_req_failed: ['rate<0.05'],    // Failed requests should be below 5%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
    const response = http.get(`${BASE_URL}/api/v1/clips?sort=hot&limit=25`, {
        headers: {
            Accept: 'application/json',
        },
    });

    // Record custom metric
    responseTime.add(response.timings.duration);

    // Check response
    const result = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 100ms': (r) => r.timings.duration < 100,
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
    console.log('Starting load test with HTML reporting');
    console.log(`Target URL: ${BASE_URL}`);
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
    console.log('Load test completed');
}

/**
 * Handle summary - generates HTML, JSON, and console output
 * This function is called after the test completes
 */
export function handleSummary(data) {
    return simpleHtmlReport(data, 'ExampleTest');
}
