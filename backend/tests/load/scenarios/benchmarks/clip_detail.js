/**
 * K6 Performance Benchmark: Get Clip Detail
 * 
 * Endpoint: GET /api/v1/clips/:id
 * Target: p50<15ms, p95<50ms, p99<100ms
 * Expected RPS: 40+
 * 
 * Individual clip metadata - high read volume, strong caching candidate
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('endpoint_errors');
const responseTime = new Trend('endpoint_response_time');
const cacheHitRate = new Rate('cache_hits');
const n_plus_one_detected = new Counter('n_plus_one_queries');

export const options = {
    stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 40 },
        { duration: '3m', target: 40 },
        { duration: '30s', target: 60 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        'http_req_duration{endpoint:clip_detail}': [
            'p(50)<15',
            'p(95)<50',
            'p(99)<100',
        ],
        'endpoint_errors': ['rate<0.005'],
        'http_req_failed{endpoint:clip_detail}': ['rate<0.005'],
        'http_reqs{endpoint:clip_detail}': ['rate>40'],
        'cache_hits': ['rate>0.8'],  // Higher cache hit rate expected
    },
    tags: {
        endpoint: 'clip_detail',
        importance: 'critical',
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Simulate realistic clip ID distribution (some hot clips, some cold)
const clipIDs = [];
function initClipIDs() {
    // Popular clips (accessed frequently) - IDs 1-10
    for (let i = 1; i <= 10; i++) {
        for (let j = 0; j < 10; j++) {  // Add 10 times for higher probability
            clipIDs.push(i);
        }
    }
    // Regular clips - IDs 11-50
    for (let i = 11; i <= 50; i++) {
        for (let j = 0; j < 2; j++) {  // Add 2 times
            clipIDs.push(i);
        }
    }
    // Less popular clips - IDs 51-100
    for (let i = 51; i <= 100; i++) {
        clipIDs.push(i);
    }
}
initClipIDs();

function getRandomClipID() {
    return clipIDs[Math.floor(Math.random() * clipIDs.length)];
}

export default function () {
    const clipID = getRandomClipID();
    const url = `${BASE_URL}/api/v1/clips/${clipID}`;
    
    const startTime = Date.now();
    const response = http.get(url, {
        headers: {
            Accept: 'application/json',
        },
        tags: { 
            endpoint: 'clip_detail',
        },
    });
    const duration = Date.now() - startTime;
    
    responseTime.add(duration);
    
    // Check cache status
    const cacheStatus = response.headers['X-Cache-Status'] || response.headers['x-cache-status'];
    if (cacheStatus === 'HIT') {
        cacheHitRate.add(1);
    } else {
        cacheHitRate.add(0);
    }
    
    const result = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 50ms (p95 target)': (r) => r.timings.duration < 50,
        'response time < 15ms (p50 target)': (r) => r.timings.duration < 15,
        'has clip data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data && body.data.id;
            } catch (e) {
                return false;
            }
        },
        'has required fields': (r) => {
            try {
                const body = JSON.parse(r.body);
                const clip = body.data;
                return clip.title && clip.url && clip.broadcaster_name;
            } catch (e) {
                return false;
            }
        },
    });
    
    // Check for N+1 if loading related data
    if (duration > 50) {
        n_plus_one_detected.add(1);
    }
    
    errorRate.add(!result);
    
    sleep(Math.random() * 1.5 + 0.5);  // 0.5-2 seconds
}

export function handleSummary(data) {
    const p50 = data.metrics.http_req_duration.values['p(50)'];
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const p99 = data.metrics.http_req_duration.values['p(99)'];
    const errorRate = data.metrics.endpoint_errors.values.rate;
    const rps = data.metrics.http_reqs.values.rate;
    const cacheHitRate = data.metrics.cache_hits ? data.metrics.cache_hits.values.rate : 0;
    
    console.log('\n=== Clip Detail Endpoint Benchmark Summary ===');
    console.log(`p50: ${p50.toFixed(2)}ms (target: <15ms) ${p50 < 15 ? '✓' : '✗'}`);
    console.log(`p95: ${p95.toFixed(2)}ms (target: <50ms) ${p95 < 50 ? '✓' : '✗'}`);
    console.log(`p99: ${p99.toFixed(2)}ms (target: <100ms) ${p99 < 100 ? '✓' : '✗'}`);
    console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}% (target: <0.5%) ${errorRate < 0.005 ? '✓' : '✗'}`);
    console.log(`Throughput: ${rps.toFixed(2)} RPS (target: >40 RPS) ${rps > 40 ? '✓' : '✗'}`);
    console.log(`Cache Hit Rate: ${(cacheHitRate * 100).toFixed(2)}% (target: >80%) ${cacheHitRate > 0.8 ? '✓' : '✗'}`);
    
    return {
        'stdout': '',
    };
}
