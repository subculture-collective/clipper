/**
 * K6 Load Test: Search Failover Scenario
 * 
 * Tests search system behavior under OpenSearch failures:
 * - Simulates OpenSearch degradation/unavailability
 * - Validates graceful fallback to PostgreSQL
 * - Monitors failover metrics and alerting thresholds
 * - Verifies response headers during failover
 * - Tests system stability during sustained failover
 * 
 * This test requires backend configuration to inject failures.
 * Set OPENSEARCH_FAILOVER_MODE=true to enable failover testing.
 * 
 * Run with: k6 run backend/tests/load/scenarios/search_failover.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const searchLoadTime = new Trend('search_load_time');
const fallbackRate = new Rate('fallback_rate');
const failoverLatency = new Trend('failover_latency');
const totalRequests = new Counter('total_requests');
const failoverCount = new Counter('failover_count');
const serviceUnavailableRate = new Rate('service_unavailable_rate');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Warm up
        { duration: '2m', target: 30 },   // Ramp up to 30 users
        { duration: '5m', target: 30 },   // Sustained load during failover
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        // During failover, we expect higher latency but system should remain stable
        'http_req_duration{endpoint:search}': ['p(95)<500', 'p(99)<1000'], // Relaxed during failover
        // In this failover test scenario, we EXPECT high fallback rates (>80%)
        // This validates the system handles failbacks gracefully during OpenSearch degradation
        // In production, fallback rate should ideally be near 0%
        'fallback_rate': ['rate>0.8'], // Most requests should successfully fall back
        'service_unavailable_rate': ['rate<0.05'], // Less than 5% 503 responses
        'errors': ['rate<0.1'], // Error rate should be below 10% during failover
        'http_req_failed': ['rate<0.1'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const FAILOVER_MODE = __ENV.OPENSEARCH_FAILOVER_MODE === 'true';

// Search queries (varied complexity)
const searchQueries = [
    'clutch',
    'funny',
    'epic fail',
    'insane',
    'speedrun',
    'valorant',
    'cs2',
    'league',
    'amazing play',
    'highlight',
    'tournament',
    'pro',
    'best',
    'moment',
    'rage',
];

export default function () {
    const scenario = Math.random();
    
    if (scenario < 0.7) {
        // Basic search query (70% of requests)
        performBasicSearch();
    } else if (scenario < 0.9) {
        // Search with filters (20% of requests)
        performFilteredSearch();
    } else {
        // Get search suggestions (10% of requests)
        performSuggestions();
    }
    
    // Simulate user typing and thinking
    sleep(Math.random() * 2 + 0.5);
}

function performBasicSearch() {
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    const limit = 25;
    const page = Math.floor(Math.random() * 3) + 1; // Pages 1-3
    
    const response = http.get(
        `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { endpoint: 'search', type: 'basic' },
        }
    );
    
    totalRequests.add(1);
    searchLoadTime.add(response.timings.duration);
    
    // Check for failover headers
    const failoverHeader = response.headers['X-Search-Failover'];
    const failoverReason = response.headers['X-Search-Failover-Reason'];
    const failoverService = response.headers['X-Search-Failover-Service'];
    
    if (failoverHeader === 'true') {
        fallbackRate.add(1);
        failoverCount.add(1);
        failoverLatency.add(response.timings.duration);
        
        // In failover mode, we expect to see these headers
        check(response, {
            'failover reason header present': (r) => failoverReason !== undefined,
            'failover service header present': (r) => failoverService === 'opensearch',
        });
    } else {
        fallbackRate.add(0);
    }
    
    // Check response status
    if (response.status === 503) {
        serviceUnavailableRate.add(1);
        
        // Verify Retry-After header on 503
        check(response, {
            '503 has Retry-After header': (r) => r.headers['Retry-After'] !== undefined,
        });
    } else {
        serviceUnavailableRate.add(0);
    }
    
    const success = check(response, {
        'search status is 200 or 503': (r) => r.status === 200 || r.status === 503,
        'search response time < 500ms': (r) => r.timings.duration < 500,
        'has results or error message': (r) => {
            if (r.status === 503) return true;
            try {
                const body = JSON.parse(r.body);
                return body.results !== undefined || body.error !== undefined;
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

function performFilteredSearch() {
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    const limit = 20;
    
    const response = http.get(
        `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&type=clips&limit=${limit}`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { endpoint: 'search', type: 'filtered' },
        }
    );
    
    totalRequests.add(1);
    searchLoadTime.add(response.timings.duration);
    
    // Track failover
    if (response.headers['X-Search-Failover'] === 'true') {
        fallbackRate.add(1);
        failoverCount.add(1);
        failoverLatency.add(response.timings.duration);
    } else {
        fallbackRate.add(0);
    }
    
    if (response.status === 503) {
        serviceUnavailableRate.add(1);
    } else {
        serviceUnavailableRate.add(0);
    }
    
    const success = check(response, {
        'filtered search status is 200 or 503': (r) => r.status === 200 || r.status === 503,
        'filtered search response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

function performSuggestions() {
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    const prefix = query.substring(0, Math.floor(query.length * 0.6)); // Partial query
    
    const response = http.get(
        `${BASE_URL}/api/v1/search/suggestions?q=${encodeURIComponent(prefix)}&limit=10`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { endpoint: 'suggestions' },
        }
    );
    
    totalRequests.add(1);
    
    // Track failover for suggestions
    if (response.headers['X-Search-Failover'] === 'true') {
        fallbackRate.add(1);
        failoverCount.add(1);
    } else {
        fallbackRate.add(0);
    }
    
    if (response.status === 503) {
        serviceUnavailableRate.add(1);
    } else {
        serviceUnavailableRate.add(0);
    }
    
    const success = check(response, {
        'suggestions status is 200 or 503': (r) => r.status === 200 || r.status === 503,
        'suggestions response time < 300ms': (r) => r.timings.duration < 300,
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

export function setup() {
    console.log('Starting search failover load test');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Failover mode: ${FAILOVER_MODE}`);
    if (!FAILOVER_MODE) {
        console.warn('WARNING: OPENSEARCH_FAILOVER_MODE not enabled. Set OPENSEARCH_FAILOVER_MODE=true to test failover.');
    }
    console.log(`Testing ${searchQueries.length} different queries`);
}

export function teardown(data) {
    console.log('Search failover load test completed');
    console.log(`Total failovers: ${failoverCount.count}`);
}
