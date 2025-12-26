/**
 * K6 Performance Benchmark: Get Current User (Auth Me)
 * 
 * Endpoint: GET /api/v1/auth/me
 * Target: p50<15ms, p95<40ms, p99<75ms
 * Expected RPS: 30+
 * 
 * Called on every page load for authenticated users - critical path
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
        { duration: '30s', target: 45 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        'http_req_duration{endpoint:auth_me}': [
            'p(50)<15',
            'p(95)<40',
            'p(99)<75',
        ],
        'endpoint_errors': ['rate<0.005'],
        'http_req_failed{endpoint:auth_me}': ['rate<0.005'],
        'http_reqs{endpoint:auth_me}': ['rate>30'],
        'cache_hits': ['rate>0.7'],  // Session caching expected
    },
    tags: {
        endpoint: 'auth_me',
        importance: 'critical',
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
    if (!AUTH_TOKEN) {
        // Skip if no auth token provided
        console.log('Warning: No AUTH_TOKEN provided, benchmark will test unauthenticated behavior');
        sleep(1);
        return;
    }
    
    const url = `${BASE_URL}/api/v1/auth/me`;
    
    const startTime = Date.now();
    const response = http.get(url, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        tags: { 
            endpoint: 'auth_me',
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
        'response time < 40ms (p95 target)': (r) => r.timings.duration < 40,
        'response time < 15ms (p50 target)': (r) => r.timings.duration < 15,
        'has user data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data && body.data.id;
            } catch (e) {
                return false;
            }
        },
        'has username': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.username;
            } catch (e) {
                return false;
            }
        },
    });
    
    errorRate.add(!result);
    
    // Simulate user staying on page
    sleep(Math.random() * 3 + 2);  // 2-5 seconds
}

export function handleSummary(data) {
    if (!AUTH_TOKEN) {
        console.log('\n⚠️  Benchmark skipped: No AUTH_TOKEN provided');
        console.log('Run with: k6 run -e AUTH_TOKEN=<token> auth_me.js');
        return { 'stdout': '' };
    }
    
    const p50 = data.metrics.http_req_duration.values['p(50)'];
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const p99 = data.metrics.http_req_duration.values['p(99)'];
    const errorRate = data.metrics.endpoint_errors.values.rate;
    const rps = data.metrics.http_reqs.values.rate;
    const cacheHitRate = data.metrics.cache_hits ? data.metrics.cache_hits.values.rate : 0;
    
    console.log('\n=== Auth Me Endpoint Benchmark Summary ===');
    console.log(`p50: ${p50.toFixed(2)}ms (target: <15ms) ${p50 < 15 ? '✓' : '✗'}`);
    console.log(`p95: ${p95.toFixed(2)}ms (target: <40ms) ${p95 < 40 ? '✓' : '✗'}`);
    console.log(`p99: ${p99.toFixed(2)}ms (target: <75ms) ${p99 < 75 ? '✓' : '✗'}`);
    console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}% (target: <0.5%) ${errorRate < 0.005 ? '✓' : '✗'}`);
    console.log(`Throughput: ${rps.toFixed(2)} RPS (target: >30 RPS) ${rps > 30 ? '✓' : '✗'}`);
    console.log(`Cache Hit Rate: ${(cacheHitRate * 100).toFixed(2)}% (target: >70%) ${cacheHitRate > 0.7 ? '✓' : '✗'}`);
    
    return {
        'stdout': '',
    };
}
