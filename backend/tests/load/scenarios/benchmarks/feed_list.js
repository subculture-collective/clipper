/**
 * K6 Performance Benchmark: List Clips (Feed)
 * 
 * Endpoint: GET /api/v1/clips
 * Target: p50<20ms, p95<75ms, p99<150ms
 * Expected RPS: 50+
 * 
 * This benchmark tests the main feed endpoint with various sort options.
 * Feed is the most accessed endpoint and requires aggressive caching.
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('endpoint_errors');
const responseTime = new Trend('endpoint_response_time');
const cacheHitRate = new Rate('cache_hits');
const n_plus_one_detected = new Counter('n_plus_one_queries');

// Performance targets from endpoint-targets.yaml
export const options = {
    stages: [
        { duration: '30s', target: 25 },  // Warm up
        { duration: '1m', target: 50 },   // Ramp to target load
        { duration: '3m', target: 50 },   // Sustain at target load
        { duration: '30s', target: 75 },  // Peak load test
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        'http_req_duration{endpoint:feed_list}': [
            'p(50)<20',   // p50 target: 20ms
            'p(95)<75',   // p95 target: 75ms
            'p(99)<150',  // p99 target: 150ms
        ],
        'endpoint_errors': ['rate<0.005'],  // Error rate < 0.5%
        'http_req_failed{endpoint:feed_list}': ['rate<0.005'],
        'http_reqs{endpoint:feed_list}': ['rate>50'],  // Min 50 RPS
        'cache_hits': ['rate>0.7'],  // Cache hit rate > 70%
    },
    tags: {
        endpoint: 'feed_list',
        importance: 'critical',
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Test scenarios matching real user behavior
const feedVariants = [
    { sort: 'hot', limit: 25, weight: 50 },      // Most common
    { sort: 'new', limit: 25, weight: 30 },      // Second most common
    { sort: 'top', timeframe: 'week', limit: 25, weight: 15 },  // Popular
    { sort: 'top', timeframe: 'day', limit: 25, weight: 5 },    // Less common
];

function selectFeedVariant() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    
    for (const variant of feedVariants) {
        cumulative += variant.weight;
        if (rand < cumulative) {
            return variant;
        }
    }
    return feedVariants[0];
}

export default function () {
    const variant = selectFeedVariant();
    
    // Build query string
    const params = new URLSearchParams();
    params.append('sort', variant.sort);
    params.append('limit', variant.limit);
    if (variant.timeframe) {
        params.append('timeframe', variant.timeframe);
    }
    
    const url = `${BASE_URL}/api/v1/clips?${params.toString()}`;
    
    const startTime = Date.now();
    const response = http.get(url, {
        headers: {
            Accept: 'application/json',
        },
        tags: { 
            endpoint: 'feed_list',
            sort: variant.sort,
        },
    });
    const duration = Date.now() - startTime;
    
    // Record metrics
    responseTime.add(duration);
    
    // Check for cache hit (X-Cache-Status header)
    const cacheStatus = response.headers['X-Cache-Status'] || response.headers['x-cache-status'];
    if (cacheStatus === 'HIT') {
        cacheHitRate.add(1);
    } else {
        cacheHitRate.add(0);
    }
    
    // Validate response
    const result = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 75ms (p95 target)': (r) => r.timings.duration < 75,
        'response time < 20ms (p50 target)': (r) => r.timings.duration < 20,
        'has success field': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true;
            } catch (e) {
                return false;
            }
        },
        'has data array': (r) => {
            try {
                const body = JSON.parse(r.body);
                return Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
        'returns clips': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.length > 0;
            } catch (e) {
                return false;
            }
        },
        'has pagination metadata': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.pagination && typeof body.pagination.total === 'number';
            } catch (e) {
                return false;
            }
        },
    });
    
    // Detect potential N+1 issues
    // If response time is high and there are many clips, might indicate N+1
    if (duration > 100) {
        try {
            const body = JSON.parse(response.body);
            if (body.data && body.data.length > 10) {
                n_plus_one_detected.add(1);
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
    
    errorRate.add(!result);
    
    // Simulate realistic user behavior - viewing feed then pausing
    sleep(Math.random() * 2 + 1);  // 1-3 seconds
}

export function handleSummary(data) {
    const p50 = data.metrics.http_req_duration.values['p(50)'];
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const p99 = data.metrics.http_req_duration.values['p(99)'];
    const errorRate = data.metrics.endpoint_errors.values.rate;
    const rps = data.metrics.http_reqs.values.rate;
    const cacheHitRate = data.metrics.cache_hits ? data.metrics.cache_hits.values.rate : 0;
    
    console.log('\n=== Feed List Endpoint Benchmark Summary ===');
    console.log(`p50: ${p50.toFixed(2)}ms (target: <20ms) ${p50 < 20 ? '✓' : '✗'}`);
    console.log(`p95: ${p95.toFixed(2)}ms (target: <75ms) ${p95 < 75 ? '✓' : '✗'}`);
    console.log(`p99: ${p99.toFixed(2)}ms (target: <150ms) ${p99 < 150 ? '✓' : '✗'}`);
    console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}% (target: <0.5%) ${errorRate < 0.005 ? '✓' : '✗'}`);
    console.log(`Throughput: ${rps.toFixed(2)} RPS (target: >50 RPS) ${rps > 50 ? '✓' : '✗'}`);
    console.log(`Cache Hit Rate: ${(cacheHitRate * 100).toFixed(2)}% (target: >70%) ${cacheHitRate > 0.7 ? '✓' : '✗'}`);
    
    return {
        'stdout': '', // Return empty to avoid duplicate output
    };
}
