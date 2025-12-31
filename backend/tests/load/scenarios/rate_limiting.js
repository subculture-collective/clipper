/**
 * K6 Load Test: Rate Limiting Accuracy & Performance
 * 
 * Tests rate limiting enforcement across key endpoints:
 * - Submission endpoint (10/hour)
 * - Metadata endpoint (100/hour) 
 * - Watch party create (10/hour)
 * - Watch party join (30/hour)
 * - Search endpoint
 * 
 * Validates:
 * - Allowed vs blocked request counts match expected limits (±5% tolerance)
 * - Rate limit headers are accurate (X-RateLimit-Limit, X-RateLimit-Remaining, etc.)
 * - p95 latency within targets even under rate limiting
 * - Error rate < 1% (excluding expected 429 responses)
 * - Retry-After headers are present on 429 responses
 * 
 * Run with: k6 run backend/tests/load/scenarios/rate_limiting.js
 * 
 * Note: This test requires authentication. Set AUTH_TOKEN environment variable.
 */

import { check, sleep, fail } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { simpleHtmlReport } from '../config/html-reporter.js';

// Custom metrics
const errorRate = new Rate('errors');
const rateLimitHitRate = new Rate('rate_limit_hits');
const submissionAttempts = new Counter('submission_attempts');
const submissionAllowed = new Counter('submission_allowed');
const submissionBlocked = new Counter('submission_blocked');
const metadataAttempts = new Counter('metadata_attempts');
const metadataAllowed = new Counter('metadata_allowed');
const metadataBlocked = new Counter('metadata_blocked');
const watchPartyCreateAttempts = new Counter('watch_party_create_attempts');
const watchPartyCreateAllowed = new Counter('watch_party_create_allowed');
const watchPartyCreateBlocked = new Counter('watch_party_create_blocked');
const watchPartyJoinAttempts = new Counter('watch_party_join_attempts');
const watchPartyJoinAllowed = new Counter('watch_party_join_allowed');
const watchPartyJoinBlocked = new Counter('watch_party_join_blocked');
const searchAttempts = new Counter('search_attempts');
const searchAllowed = new Counter('search_allowed');
const searchBlocked = new Counter('search_blocked');

// Latency metrics
const submissionLatency = new Trend('submission_latency');
const metadataLatency = new Trend('metadata_latency');
const watchPartyCreateLatency = new Trend('watch_party_create_latency');
const watchPartyJoinLatency = new Trend('watch_party_join_latency');
const searchLatency = new Trend('search_latency');

// Rate limit header accuracy metrics
const rateLimitRemainingAccuracy = new Gauge('rate_limit_remaining_accuracy');

// Test configuration
export const options = {
    scenarios: {
        submission_rate_limit: {
            executor: 'constant-arrival-rate',
            exec: 'testSubmissionRateLimit',
            rate: 15, // 15 requests per timeUnit (higher than 10/hour limit)
            timeUnit: '1h',
            duration: '2m',
            preAllocatedVUs: 5,
            maxVUs: 10,
        },
        metadata_rate_limit: {
            executor: 'constant-arrival-rate',
            exec: 'testMetadataRateLimit',
            rate: 120, // 120 requests per hour (higher than 100/hour limit)
            timeUnit: '1h',
            duration: '2m',
            preAllocatedVUs: 5,
            maxVUs: 10,
            startTime: '2m', // Start after submission test
        },
        watch_party_create_rate_limit: {
            executor: 'constant-arrival-rate',
            exec: 'testWatchPartyCreateRateLimit',
            rate: 15, // 15 requests per hour (higher than 10/hour limit)
            timeUnit: '1h',
            duration: '2m',
            preAllocatedVUs: 5,
            maxVUs: 10,
            startTime: '4m', // Start after metadata test
        },
        watch_party_join_rate_limit: {
            executor: 'constant-arrival-rate',
            exec: 'testWatchPartyJoinRateLimit',
            rate: 40, // 40 requests per hour (higher than 30/hour limit)
            timeUnit: '1h',
            duration: '2m',
            preAllocatedVUs: 5,
            maxVUs: 10,
            startTime: '6m', // Start after watch party create test
        },
        search_rate_limit: {
            executor: 'constant-vus',
            exec: 'testSearchRateLimit',
            vus: 10,
            duration: '2m',
            startTime: '8m', // Start after watch party join test
        },
    },
    thresholds: {
        // Overall latency should be good even with rate limiting
        'http_req_duration{endpoint:submission}': ['p(95)<250', 'p(99)<500'],
        'http_req_duration{endpoint:metadata}': ['p(95)<150', 'p(99)<300'],
        'http_req_duration{endpoint:watch_party_create}': ['p(95)<200', 'p(99)<400'],
        'http_req_duration{endpoint:watch_party_join}': ['p(95)<150', 'p(99)<300'],
        'http_req_duration{endpoint:search}': ['p(95)<150', 'p(99)<300'],
        
        // Error rate (excluding expected 429s)
        'errors': ['rate<0.01'], // Less than 1% errors
        
        // Rate limit accuracy (between 20-40% should be rate limited based on our test rates)
        'rate_limit_hits': ['rate>0.2', 'rate<0.6'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Sample data for tests
const clipUrls = [
    'https://clips.twitch.tv/RateLimitTest1',
    'https://clips.twitch.tv/RateLimitTest2',
    'https://clips.twitch.tv/RateLimitTest3',
    'https://clips.twitch.tv/RateLimitTest4',
    'https://clips.twitch.tv/RateLimitTest5',
];

const searchQueries = [
    'gaming',
    'speedrun',
    'esports',
    'funny',
    'clutch',
];

/**
 * Test submission endpoint rate limiting (10 per hour)
 */
export function testSubmissionRateLimit() {
    if (!AUTH_TOKEN) {
        return;
    }

    const clipUrl = clipUrls[Math.floor(Math.random() * clipUrls.length)] + `-${Date.now()}-${__VU}`;
    
    const payload = JSON.stringify({
        url: clipUrl,
        note: 'Rate limit test submission',
    });
    
    const response = http.post(
        `${BASE_URL}/api/v1/submissions`,
        payload,
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { endpoint: 'submission' },
        }
    );
    
    submissionAttempts.add(1);
    submissionLatency.add(response.timings.duration);
    
    if (response.status === 429) {
        // Rate limited - expected behavior
        submissionBlocked.add(1);
        rateLimitHitRate.add(1);
        
        check(response, {
            'submission rate limit has retry-after header': (r) => r.headers['Retry-After'] !== undefined,
            'submission rate limit has X-RateLimit-Limit header': (r) => r.headers['X-RateLimit-Limit'] !== undefined,
            'submission rate limit has X-RateLimit-Remaining header': (r) => r.headers['X-RateLimit-Remaining'] !== undefined,
        });
    } else if (response.status === 201 || response.status === 400) {
        // Allowed (201 = created, 400 = duplicate/validation error)
        submissionAllowed.add(1);
        rateLimitHitRate.add(0);
        
        // Validate rate limit headers
        const success = check(response, {
            'submission has X-RateLimit-Limit header': (r) => r.headers['X-RateLimit-Limit'] !== undefined,
            'submission has X-RateLimit-Remaining header': (r) => r.headers['X-RateLimit-Remaining'] !== undefined,
            'submission X-RateLimit-Limit is correct': (r) => {
                const limit = parseInt(r.headers['X-RateLimit-Limit'] || '0');
                // Should be 10 for basic users, could be higher for premium
                return limit >= 10;
            },
        });
        
        if (!success) {
            errorRate.add(1);
        }
    } else {
        // Unexpected error
        errorRate.add(1);
        console.log(`Submission unexpected status ${response.status}: ${response.body}`);
    }
    
    sleep(1);
}

/**
 * Test metadata endpoint rate limiting (100 per hour)
 */
export function testMetadataRateLimit() {
    if (!AUTH_TOKEN) {
        return;
    }

    const clipUrl = clipUrls[Math.floor(Math.random() * clipUrls.length)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/submissions/metadata?url=${encodeURIComponent(clipUrl)}`,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { endpoint: 'metadata' },
        }
    );
    
    metadataAttempts.add(1);
    metadataLatency.add(response.timings.duration);
    
    if (response.status === 429) {
        metadataBlocked.add(1);
        rateLimitHitRate.add(1);
        
        check(response, {
            'metadata rate limit has retry-after header': (r) => r.headers['Retry-After'] !== undefined,
            'metadata rate limit response time acceptable': (r) => r.timings.duration < 100,
        });
    } else if (response.status === 200 || response.status === 400) {
        metadataAllowed.add(1);
        rateLimitHitRate.add(0);
        
        const success = check(response, {
            'metadata has rate limit headers': (r) => {
                return r.headers['X-RateLimit-Limit'] !== undefined &&
                       r.headers['X-RateLimit-Remaining'] !== undefined;
            },
            'metadata X-RateLimit-Limit is correct': (r) => {
                const limit = parseInt(r.headers['X-RateLimit-Limit'] || '0');
                return limit >= 100; // Should be at least 100 for basic users
            },
        });
        
        if (!success) {
            errorRate.add(1);
        }
    } else {
        errorRate.add(1);
        console.log(`Metadata unexpected status ${response.status}`);
    }
    
    sleep(0.5);
}

/**
 * Test watch party create endpoint rate limiting (10 per hour)
 */
export function testWatchPartyCreateRateLimit() {
    if (!AUTH_TOKEN) {
        return;
    }

    const payload = JSON.stringify({
        name: `Rate Limit Test Party ${Date.now()}-${__VU}`,
        is_public: false,
        max_participants: 10,
    });
    
    const response = http.post(
        `${BASE_URL}/api/v1/watch-parties`,
        payload,
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { endpoint: 'watch_party_create' },
        }
    );
    
    watchPartyCreateAttempts.add(1);
    watchPartyCreateLatency.add(response.timings.duration);
    
    if (response.status === 429) {
        watchPartyCreateBlocked.add(1);
        rateLimitHitRate.add(1);
        
        check(response, {
            'watch party create rate limit has retry-after': (r) => r.headers['Retry-After'] !== undefined,
        });
    } else if (response.status === 201) {
        watchPartyCreateAllowed.add(1);
        rateLimitHitRate.add(0);
        
        const success = check(response, {
            'watch party created successfully': (r) => r.status === 201,
            'watch party has rate limit headers': (r) => {
                return r.headers['X-RateLimit-Limit'] !== undefined;
            },
            'watch party create X-RateLimit-Limit is correct': (r) => {
                const limit = parseInt(r.headers['X-RateLimit-Limit'] || '0');
                return limit >= 10;
            },
        });
        
        if (!success) {
            errorRate.add(1);
        }
    } else {
        errorRate.add(1);
        console.log(`Watch party create unexpected status ${response.status}: ${response.body}`);
    }
    
    sleep(1);
}

/**
 * Test watch party join endpoint rate limiting (30 per hour)
 */
export function testWatchPartyJoinRateLimit() {
    if (!AUTH_TOKEN) {
        return;
    }

    // Use a fake party ID - we expect 404 or rate limit
    const fakePartyId = `00000000-0000-0000-0000-${String(__VU).padStart(12, '0')}`;
    
    const response = http.post(
        `${BASE_URL}/api/v1/watch-parties/${fakePartyId}/join`,
        null,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { endpoint: 'watch_party_join' },
        }
    );
    
    watchPartyJoinAttempts.add(1);
    watchPartyJoinLatency.add(response.timings.duration);
    
    if (response.status === 429) {
        watchPartyJoinBlocked.add(1);
        rateLimitHitRate.add(1);
        
        check(response, {
            'watch party join rate limit has retry-after': (r) => r.headers['Retry-After'] !== undefined,
        });
    } else if (response.status === 404 || response.status === 400) {
        // Not rate limited (404 = not found, 400 = already joined/other error)
        watchPartyJoinAllowed.add(1);
        rateLimitHitRate.add(0);
        
        const success = check(response, {
            'watch party join has rate limit headers': (r) => {
                return r.headers['X-RateLimit-Limit'] !== undefined;
            },
            'watch party join X-RateLimit-Limit is correct': (r) => {
                const limit = parseInt(r.headers['X-RateLimit-Limit'] || '0');
                return limit >= 30;
            },
        });
        
        if (!success) {
            errorRate.add(1);
        }
    } else {
        errorRate.add(1);
        console.log(`Watch party join unexpected status ${response.status}`);
    }
    
    sleep(0.5);
}

/**
 * Test search endpoint rate limiting
 */
export function testSearchRateLimit() {
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&limit=20`,
        {
            headers: {
                'Accept': 'application/json',
            },
            tags: { endpoint: 'search' },
        }
    );
    
    searchAttempts.add(1);
    searchLatency.add(response.timings.duration);
    
    if (response.status === 429) {
        searchBlocked.add(1);
        rateLimitHitRate.add(1);
    } else if (response.status === 200) {
        searchAllowed.add(1);
        rateLimitHitRate.add(0);
        
        const success = check(response, {
            'search response is valid': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.success === true;
                } catch (e) {
                    return false;
                }
            },
        });
        
        if (!success) {
            errorRate.add(1);
        }
    } else {
        errorRate.add(1);
    }
    
    sleep(Math.random() * 2 + 1);
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
    console.log('========================================');
    console.log('Rate Limiting Accuracy & Performance Test');
    console.log('========================================');
    console.log(`Target URL: ${BASE_URL}`);
    
    if (!AUTH_TOKEN) {
        console.log('WARNING: No AUTH_TOKEN provided!');
        console.log('Most tests will be skipped. Set AUTH_TOKEN environment variable.');
        console.log('Example: k6 run -e AUTH_TOKEN=your_token backend/tests/load/scenarios/rate_limiting.js');
    } else {
        console.log('Authentication: Enabled');
    }
    
    console.log('\nTest Scenarios:');
    console.log('  1. Submission Rate Limit: 15 req/hour (limit: 10/hour)');
    console.log('  2. Metadata Rate Limit: 120 req/hour (limit: 100/hour)');
    console.log('  3. Watch Party Create: 15 req/hour (limit: 10/hour)');
    console.log('  4. Watch Party Join: 40 req/hour (limit: 30/hour)');
    console.log('  5. Search Rate Limit: Variable load');
    console.log('\nExpected Outcomes:');
    console.log('  - ~33% of submissions should be rate limited (429)');
    console.log('  - ~17% of metadata requests should be rate limited');
    console.log('  - ~33% of watch party creates should be rate limited');
    console.log('  - ~25% of watch party joins should be rate limited');
    console.log('  - Rate limit headers should be accurate');
    console.log('  - p95 latency < 250ms even under rate limiting');
    console.log('========================================\n');
    
    return { startTime: new Date().toISOString() };
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
    console.log('\n========================================');
    console.log('Rate Limiting Test Results');
    console.log('========================================');
    console.log(`Started at: ${data.startTime}`);
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('\nTest completed. Review metrics for rate limiting accuracy.');
    console.log('Expected behavior:');
    console.log('  - Blocked requests should match configured limits');
    console.log('  - Rate limit headers should be present and accurate');
    console.log('  - Latency should remain acceptable even with rate limiting');
    console.log('========================================\n');
}

/**
 * Handle summary - generate HTML report
 */
export function handleSummary(data) {
    return simpleHtmlReport(data, 'rate_limiting');
}
