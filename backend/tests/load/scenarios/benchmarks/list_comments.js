/**
 * K6 Performance Benchmark: List Comments
 * 
 * Endpoint: GET /api/v1/clips/:id/comments
 * Target: p50<20ms, p95<50ms, p99<100ms
 * Expected RPS: 35+
 * 
 * Paginated comments for clips - watch for N+1 queries with user data
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('endpoint_errors');
const responseTime = new Trend('endpoint_response_time');
const cacheHitRate = new Rate('cache_hits');
const n_plus_one_detected = new Counter('n_plus_one_queries');

// N+1 detection thresholds
const N1_DURATION_THRESHOLD_MS = parseInt(__ENV.N1_DURATION_THRESHOLD_MS || '50');
const N1_ITEM_COUNT_THRESHOLD = parseInt(__ENV.N1_ITEM_COUNT_THRESHOLD || '5');

export const options = {
    stages: [
        { duration: '30s', target: 17 },
        { duration: '1m', target: 35 },
        { duration: '3m', target: 35 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        'http_req_duration{endpoint:list_comments}': [
            'p(50)<20',
            'p(95)<50',
            'p(99)<100',
        ],
        'endpoint_errors': ['rate<0.005'],
        'http_req_failed{endpoint:list_comments}': ['rate<0.005'],
        'http_reqs{endpoint:list_comments}': ['rate>35'],
        'cache_hits': ['rate>0.6'],
    },
    tags: {
        endpoint: 'list_comments',
        importance: 'high',
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Popular clips with comments
const clipsWithComments = [];
for (let i = 1; i <= 20; i++) {
    // Weight popular clips higher
    const weight = i <= 5 ? 10 : i <= 10 ? 5 : 2;
    for (let j = 0; j < weight; j++) {
        clipsWithComments.push(i);
    }
}

function getRandomClipID() {
    return clipsWithComments[Math.floor(Math.random() * clipsWithComments.length)];
}

export default function () {
    const clipID = getRandomClipID();
    const params = new URLSearchParams();
    params.append('limit', '20');
    params.append('sort', 'best');  // or 'new', 'old'
    
    const url = `${BASE_URL}/api/v1/clips/${clipID}/comments?${params.toString()}`;
    
    const startTime = Date.now();
    const response = http.get(url, {
        headers: {
            Accept: 'application/json',
        },
        tags: { 
            endpoint: 'list_comments',
        },
    });
    const duration = Date.now() - startTime;
    
    responseTime.add(duration);
    
    const cacheStatus = response.headers['X-Cache-Status'] || response.headers['x-cache-status'];
    if (cacheStatus === 'HIT') {
        cacheHitRate.add(1);
    } else {
        cacheHitRate.add(0);
    }
    
    const result = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 50ms (p95 target)': (r) => r.timings.duration < 50,
        'response time < 20ms (p50 target)': (r) => r.timings.duration < 20,
        'has comments array': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
        'comments have user data': (r) => {
            try {
                const body = JSON.parse(r.body);
                if (body.data && body.data.length > 0) {
                    return body.data[0].user && body.data[0].user.username;
                }
                return true; // No comments is valid
            } catch (e) {
                return false;
            }
        },
    });
    
    // N+1 detection - if response is slow and has many comments with user data
    // This might indicate separate queries for each user
    if (duration > N1_DURATION_THRESHOLD_MS) {
        try {
            const body = JSON.parse(response.body);
            if (body.data && body.data.length > N1_ITEM_COUNT_THRESHOLD) {
                n_plus_one_detected.add(1);
            }
        } catch (e) {
            // Ignore
        }
    }
    
    errorRate.add(!result);
    
    sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
    const p50 = data.metrics.http_req_duration.values['p(50)'];
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const p99 = data.metrics.http_req_duration.values['p(99)'];
    const errorRate = data.metrics.endpoint_errors.values.rate;
    const rps = data.metrics.http_reqs.values.rate;
    const cacheHitRate = data.metrics.cache_hits ? data.metrics.cache_hits.values.rate : 0;
    const n1Detected = data.metrics.n_plus_one_queries ? data.metrics.n_plus_one_queries.values.count : 0;
    
    console.log('\n=== List Comments Endpoint Benchmark Summary ===');
    console.log(`p50: ${p50.toFixed(2)}ms (target: <20ms) ${p50 < 20 ? '✓' : '✗'}`);
    console.log(`p95: ${p95.toFixed(2)}ms (target: <50ms) ${p95 < 50 ? '✓' : '✗'}`);
    console.log(`p99: ${p99.toFixed(2)}ms (target: <100ms) ${p99 < 100 ? '✓' : '✗'}`);
    console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}% (target: <0.5%) ${errorRate < 0.005 ? '✓' : '✗'}`);
    console.log(`Throughput: ${rps.toFixed(2)} RPS (target: >35 RPS) ${rps > 35 ? '✓' : '✗'}`);
    console.log(`Cache Hit Rate: ${(cacheHitRate * 100).toFixed(2)}% (target: >60%) ${cacheHitRate > 0.6 ? '✓' : '✗'}`);
    
    if (n1Detected > 0) {
        console.log(`⚠️  Potential N+1 patterns detected: ${n1Detected} occurrences`);
    }
    
    return {
        'stdout': '',
    };
}
