/**
 * K6 Performance Benchmark: Search Clips
 * 
 * Endpoint: GET /api/v1/search
 * Target: p50<30ms, p95<100ms, p99<200ms
 * Expected RPS: 25+
 * 
 * Full-text and hybrid search - optimize for common queries
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('endpoint_errors');
const responseTime = new Trend('endpoint_response_time');
const cacheHitRate = new Rate('cache_hits');

export const options = {
    stages: [
        { duration: '30s', target: 12 },
        { duration: '1m', target: 25 },
        { duration: '3m', target: 25 },
        { duration: '30s', target: 35 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        'http_req_duration{endpoint:search}': [
            'p(50)<30',
            'p(95)<100',
            'p(99)<200',
        ],
        'endpoint_errors': ['rate<0.01'],
        'http_req_failed{endpoint:search}': ['rate<0.01'],
        'http_reqs{endpoint:search}': ['rate>25'],
        'cache_hits': ['rate>0.5'],  // Popular queries should be cached
    },
    tags: {
        endpoint: 'search',
        importance: 'critical',
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Realistic search queries with weights
const searchQueries = [
    // Popular queries (frequently cached)
    { q: 'valorant', weight: 15 },
    { q: 'league', weight: 12 },
    { q: 'csgo', weight: 10 },
    { q: 'fortnite', weight: 8 },
    { q: 'minecraft', weight: 8 },
    // Medium popularity
    { q: 'apex', weight: 5 },
    { q: 'dota', weight: 5 },
    { q: 'warzone', weight: 4 },
    { q: 'overwatch', weight: 4 },
    // Long-tail queries
    { q: 'funny moments', weight: 3 },
    { q: 'clutch', weight: 3 },
    { q: 'highlights', weight: 3 },
    { q: 'tutorial', weight: 2 },
    // Random/unique queries (not cached) - 8% weight for unique searches
    { q: '__RANDOM__', weight: 8 },
];

function selectSearchQuery() {
    const totalWeight = searchQueries.reduce((sum, q) => sum + q.weight, 0);
    const rand = Math.random() * totalWeight;
    let cumulative = 0;
    
    for (const query of searchQueries) {
        cumulative += query.weight;
        if (rand < cumulative) {
            // For random queries, generate unique query each time
            if (query.q === '__RANDOM__') {
                return `search_${Math.random().toString(36).substring(7)}`;
            }
            return query.q;
        }
    }
    return searchQueries[0].q;
}

export default function () {
    const query = selectSearchQuery();
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', '20');
    
    const url = `${BASE_URL}/api/v1/search?${params.toString()}`;
    
    const startTime = Date.now();
    const response = http.get(url, {
        headers: {
            Accept: 'application/json',
        },
        tags: { 
            endpoint: 'search',
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
        'response time < 100ms (p95 target)': (r) => r.timings.duration < 100,
        'response time < 30ms (p50 target)': (r) => r.timings.duration < 30,
        'has results': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
        'has search metadata': (r) => {
            try {
                const body = JSON.parse(r.body);
                return typeof body.total === 'number';
            } catch (e) {
                return false;
            }
        },
    });
    
    errorRate.add(!result);
    
    sleep(Math.random() * 2 + 0.5);  // 0.5-2.5 seconds
}

export function handleSummary(data) {
    const p50 = data.metrics.http_req_duration.values['p(50)'];
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const p99 = data.metrics.http_req_duration.values['p(99)'];
    const errorRate = data.metrics.endpoint_errors.values.rate;
    const rps = data.metrics.http_reqs.values.rate;
    const cacheHitRate = data.metrics.cache_hits ? data.metrics.cache_hits.values.rate : 0;
    
    console.log('\n=== Search Endpoint Benchmark Summary ===');
    console.log(`p50: ${p50.toFixed(2)}ms (target: <30ms) ${p50 < 30 ? '✓' : '✗'}`);
    console.log(`p95: ${p95.toFixed(2)}ms (target: <100ms) ${p95 < 100 ? '✓' : '✗'}`);
    console.log(`p99: ${p99.toFixed(2)}ms (target: <200ms) ${p99 < 200 ? '✓' : '✗'}`);
    console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}% (target: <1%) ${errorRate < 0.01 ? '✓' : '✗'}`);
    console.log(`Throughput: ${rps.toFixed(2)} RPS (target: >25 RPS) ${rps > 25 ? '✓' : '✗'}`);
    console.log(`Cache Hit Rate: ${(cacheHitRate * 100).toFixed(2)}% (target: >50%) ${cacheHitRate > 0.5 ? '✓' : '✗'}`);
    
    return {
        'stdout': '',
    };
}
