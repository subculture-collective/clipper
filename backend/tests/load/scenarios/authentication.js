/**
 * K6 Load Test: Authentication Scenario
 * 
 * Tests authentication workflow performance including:
 * - OAuth initiation
 * - Token refresh operations
 * - User profile fetching
 * - Logout operations
 * 
 * Target: 20 logins/minute (authentication flow simulation)
 * Note: This test simulates authentication patterns rather than actual OAuth
 * flows since OAuth requires browser interaction with Twitch.
 * 
 * Run with: k6 run backend/tests/load/scenarios/authentication.js
 * 
 * With authentication token: 
 * k6 run -e AUTH_TOKEN=your_token backend/tests/load/scenarios/authentication.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authFlowDuration = new Trend('auth_flow_duration');
const tokenRefreshTime = new Trend('token_refresh_time');
const profileFetchTime = new Trend('profile_fetch_time');
const logoutTime = new Trend('logout_time');
const totalRequests = new Counter('total_requests');
const authFlowsCompleted = new Counter('auth_flows_completed');

// Test configuration
// Target: 20 logins/minute = 1 login every 3 seconds
// With multiple users, we spread this out
export const options = {
    stages: [
        { duration: '30s', target: 5 },   // Ramp up to 5 users
        { duration: '1m', target: 10 },   // Ramp up to 10 users
        { duration: '2m', target: 20 },   // Reach 20 users (20 auth flows/min)
        { duration: '2m', target: 20 },   // Sustain 20 users
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        'http_req_duration{endpoint:auth_me}': ['p(95)<50', 'p(99)<100'],
        'http_req_duration{endpoint:token_refresh}': ['p(95)<100', 'p(99)<200'],
        'http_req_duration{endpoint:logout}': ['p(95)<30', 'p(99)<75'],
        'errors': ['rate<0.05'], // Error rate should be below 5%
        'http_req_failed{endpoint:auth_me}': ['rate<0.01'],
        'http_req_failed{endpoint:token_refresh}': ['rate<0.02'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
    if (!AUTH_TOKEN) {
        // Simulate anonymous user behavior when no auth token
        simulateAnonymousUser();
        return;
    }
    
    // Simulate authenticated user behavior
    const scenario = Math.random();
    
    if (scenario < 0.5) {
        // Fetch user profile (50% of requests)
        fetchUserProfile();
    } else if (scenario < 0.8) {
        // Simulate token refresh (30% of requests)
        simulateTokenRefresh();
    } else {
        // Simulate logout (20% of requests)
        simulateLogout();
    }
    
    // Simulate user activity time
    sleep(Math.random() * 5 + 2);
}

function simulateAnonymousUser() {
    // Without real OAuth flow, we can only test public endpoints
    // and measure response times for auth-related public APIs
    
    const startTime = Date.now();
    
    // Check health endpoint (simulating pre-auth checks)
    const healthResponse = http.get(
        `${BASE_URL}/health`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { endpoint: 'health_check' },
        }
    );
    
    totalRequests.add(1);
    
    check(healthResponse, {
        'health check is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    const duration = Date.now() - startTime;
    authFlowDuration.add(duration);
    
    // Simulate thinking time before next attempt
    sleep(Math.random() * 3 + 2);
}

function fetchUserProfile() {
    const startTime = Date.now();
    
    const response = http.get(
        `${BASE_URL}/api/v1/auth/me`,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { endpoint: 'auth_me' },
        }
    );
    
    totalRequests.add(1);
    profileFetchTime.add(response.timings.duration);
    
    const success = check(response, {
        'profile fetch status is 200': (r) => r.status === 200,
        'profile fetch response time < 50ms': (r) => r.timings.duration < 50,
        'profile fetch response time < 30ms': (r) => r.timings.duration < 30,
        'has user data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && body.data !== null;
            } catch (e) {
                return false;
            }
        },
        'has user id': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.id !== undefined;
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!success) {
        errorRate.add(1);
    } else {
        authFlowsCompleted.add(1);
    }
}

function simulateTokenRefresh() {
    // Note: Actual token refresh requires a valid refresh token
    // This simulates the endpoint call pattern
    const startTime = Date.now();
    
    // In a real scenario, this would use a refresh token
    // For load testing, we're measuring the endpoint performance
    const response = http.post(
        `${BASE_URL}/api/v1/auth/refresh`,
        JSON.stringify({
            refresh_token: 'simulated_refresh_token_for_load_testing',
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            tags: { endpoint: 'token_refresh' },
        }
    );
    
    totalRequests.add(1);
    tokenRefreshTime.add(response.timings.duration);
    
    // We expect this to fail with invalid token, but we're measuring performance
    const success = check(response, {
        'refresh response received': (r) => r.status !== 0,
        'refresh response time < 100ms': (r) => r.timings.duration < 100,
        'refresh response time < 50ms': (r) => r.timings.duration < 50,
    });
    
    // Don't count auth failures as errors since we're using dummy tokens
    if (response.status === 0) {
        errorRate.add(1);
    }
}

function simulateLogout() {
    const startTime = Date.now();
    
    const response = http.post(
        `${BASE_URL}/api/v1/auth/logout`,
        null,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { endpoint: 'logout' },
        }
    );
    
    totalRequests.add(1);
    logoutTime.add(response.timings.duration);
    
    const success = check(response, {
        'logout status is 200': (r) => r.status === 200,
        'logout response time < 30ms': (r) => r.timings.duration < 30,
        'logout response time < 20ms': (r) => r.timings.duration < 20,
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

export function setup() {
    console.log('Starting authentication load test');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Target rate: 20 authentication flows per minute`);
    
    if (!AUTH_TOKEN) {
        console.log('\nWARNING: No AUTH_TOKEN provided');
        console.log('Running in limited mode - testing public endpoints only');
        console.log('For full authentication testing, provide AUTH_TOKEN:');
        console.log('  k6 run -e AUTH_TOKEN=your_token backend/tests/load/scenarios/authentication.js');
    } else {
        console.log('\nAuthentication: Enabled');
        console.log('Testing:');
        console.log('  - User profile fetching (/api/v1/auth/me)');
        console.log('  - Token refresh operations (/api/v1/auth/refresh)');
        console.log('  - Logout operations (/api/v1/auth/logout)');
    }
    
    return { startTime: Date.now() };
}

export function teardown(data) {
    const duration = (Date.now() - data.startTime) / 1000;
    console.log('\nAuthentication load test completed');
    console.log(`Total duration: ${duration.toFixed(2)}s`);
}
