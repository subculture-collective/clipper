/**
 * K6 Performance Benchmark: Get Related Clips
 * 
 * Endpoint: GET /api/v1/clips/:id/related
 * Target: p50<25ms, p95<75ms, p99<150ms
 * Expected RPS: 30+
 * 
 * Algorithm-based related clips recommendation - complex query
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('endpoint_errors');
const responseTime = new Trend('endpoint_response_time');
const cacheHitRate = new Rate('cache_hits');

export const options = {
    stages: [
        { duration: '30s', target: 15 },
        { duration: '1m', target: 30 },
        { duration: '3m', target: 30 },
        { duration: '30s', target: 40 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        'http_req_duration{endpoint:related_clips}': [
            'p(50)<25',
            'p(95)<75',
            'p(99)<150',
        ],
        'endpoint_errors': ['rate<0.01'],
        'http_req_failed{endpoint:related_clips}': ['rate<0.01'],
        'http_reqs{endpoint:related_clips}': ['rate>30'],
        'cache_hits': ['rate>0.7'],  // Can tolerate staleness
    },
    tags: {
        endpoint: 'related_clips',
        importance: 'high',
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Weighted clip selection
const clipIDs = [];
for (let i = 1; i <= 10; i++) {
    for (let j = 0; j < 8; j++) {
        clipIDs.push(i);
    }
}
for (let i = 11; i <= 30; i++) {
    for (let j = 0; j < 3; j++) {
        clipIDs.push(i);
    }
}
for (let i = 31; i <= 60; i++) {
    clipIDs.push(i);
}

function getRandomClipID() {
    return clipIDs[Math.floor(Math.random() * clipIDs.length)];
}

export default function () {
    const clipID = getRandomClipID();
    const params = new URLSearchParams();
    params.append('limit', '10');
    
    const url = `${BASE_URL}/api/v1/clips/${clipID}/related?${params.toString()}`;
    
    const startTime = Date.now();
    const response = http.get(url, {
        headers: {
            Accept: 'application/json',
        },
        tags: { 
            endpoint: 'related_clips',
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
        'response time < 75ms (p95 target)': (r) => r.timings.duration < 75,
        'response time < 25ms (p50 target)': (r) => r.timings.duration < 25,
        'has related clips': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
        'returns clips': (r) => {
            try {
                const body = JSON.parse(r.body);
                // May return 0 related clips if none found
                return Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
    });
    
    errorRate.add(!result);
    
    sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
    const p50 = data.metrics.http_req_duration.values['p(50)'];
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const p99 = data.metrics.http_req_duration.values['p(99)'];
    const errorRate = data.metrics.endpoint_errors.values.rate;
    const rps = data.metrics.http_reqs.values.rate;
    const cacheHitRate = data.metrics.cache_hits ? data.metrics.cache_hits.values.rate : 0;
    
    console.log('\n=== Related Clips Endpoint Benchmark Summary ===');
    console.log(`p50: ${p50.toFixed(2)}ms (target: <25ms) ${p50 < 25 ? '✓' : '✗'}`);
    console.log(`p95: ${p95.toFixed(2)}ms (target: <75ms) ${p95 < 75 ? '✓' : '✗'}`);
    console.log(`p99: ${p99.toFixed(2)}ms (target: <150ms) ${p99 < 150 ? '✓' : '✗'}`);
    console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}% (target: <1%) ${errorRate < 0.01 ? '✓' : '✗'}`);
    console.log(`Throughput: ${rps.toFixed(2)} RPS (target: >30 RPS) ${rps > 30 ? '✓' : '✗'}`);
    console.log(`Cache Hit Rate: ${(cacheHitRate * 100).toFixed(2)}% (target: >70%) ${cacheHitRate > 0.7 ? '✓' : '✗'}`);
    
    return {
        'stdout': '',
    };
}
