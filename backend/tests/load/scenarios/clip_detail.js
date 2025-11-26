/**
 * K6 Load Test: Clip Detail View Scenario
 * 
 * Tests the performance of viewing individual clip details including:
 * - Clip metadata retrieval
 * - Related clips loading
 * - Comments fetching
 * - Analytics tracking
 * 
 * Target: Response time <50ms (p95), Handle concurrent viewers
 * 
 * Run with: k6 run backend/tests/load/scenarios/clip_detail.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const clipDetailLoadTime = new Trend('clip_detail_load_time');
const relatedClipsLoadTime = new Trend('related_clips_load_time');
const commentsLoadTime = new Trend('comments_load_time');
const viewTrackingTime = new Trend('view_tracking_time');
const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 20 },  // Ramp up to 20 users
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        { duration: '2m', target: 50 },   // Stay at 50 users
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        'http_req_duration{endpoint:clip_detail}': ['p(95)<50', 'p(99)<100'],
        'http_req_duration{endpoint:related_clips}': ['p(95)<75', 'p(99)<150'],
        'http_req_duration{endpoint:comments}': ['p(95)<50', 'p(99)<100'],
        'http_req_duration{endpoint:track_view}': ['p(95)<30', 'p(99)<75'],
        'errors': ['rate<0.01'], // Error rate should be below 1%
        'http_req_failed': ['rate<0.01'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Sample clip IDs (should match seeded data)
const clipIds = [
    'LoadTest00001ClipID',
    'LoadTest00002ClipID',
    'LoadTest00003ClipID',
    'LoadTest00004ClipID',
    'LoadTest00005ClipID',
    'LoadTest00010ClipID',
    'LoadTest00015ClipID',
    'LoadTest00020ClipID',
];

export default function () {
    // Randomly select a clip to view
    const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
    
    // Fetch clip details
    let response = http.get(`${BASE_URL}/api/v1/clips/${clipId}`, {
        headers: { 'Accept': 'application/json' },
        tags: { endpoint: 'clip_detail' },
    });
    
    totalRequests.add(1);
    clipDetailLoadTime.add(response.timings.duration);
    
    let clipDetailSuccess = check(response, {
        'clip detail status is 200': (r) => r.status === 200,
        'clip detail response time < 50ms': (r) => r.timings.duration < 50,
        'has clip data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && body.data !== null;
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!clipDetailSuccess) {
        errorRate.add(1);
    }
    
    // Small delay to simulate user reading clip info
    sleep(0.5);
    
    // Fetch related clips
    response = http.get(`${BASE_URL}/api/v1/clips/${clipId}/related?limit=6`, {
        headers: { 'Accept': 'application/json' },
        tags: { endpoint: 'related_clips' },
    });
    
    totalRequests.add(1);
    relatedClipsLoadTime.add(response.timings.duration);
    
    let relatedSuccess = check(response, {
        'related clips status is 200': (r) => r.status === 200,
        'related clips response time < 75ms': (r) => r.timings.duration < 75,
        'has related clips array': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!relatedSuccess) {
        errorRate.add(1);
    }
    
    // Fetch comments for the clip
    response = http.get(`${BASE_URL}/api/v1/clips/${clipId}/comments?limit=20`, {
        headers: { 'Accept': 'application/json' },
        tags: { endpoint: 'comments' },
    });
    
    totalRequests.add(1);
    commentsLoadTime.add(response.timings.duration);
    
    let commentsSuccess = check(response, {
        'comments status is 200': (r) => r.status === 200,
        'comments response time < 50ms': (r) => r.timings.duration < 50,
        'has comments array': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!commentsSuccess) {
        errorRate.add(1);
    }
    
    // Track view (analytics)
    response = http.post(`${BASE_URL}/api/v1/clips/${clipId}/track-view`, null, {
        headers: { 'Accept': 'application/json' },
        tags: { endpoint: 'track_view' },
    });
    
    totalRequests.add(1);
    viewTrackingTime.add(response.timings.duration);
    
    let trackingSuccess = check(response, {
        'view tracking status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'view tracking response time < 30ms': (r) => r.timings.duration < 30,
    });
    
    if (!trackingSuccess) {
        errorRate.add(1);
    }
    
    // Simulate user viewing the clip (average clip duration is ~30s)
    sleep(Math.random() * 10 + 5); // 5-15 seconds
}

export function setup() {
    console.log('Starting clip detail view load test');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Testing ${clipIds.length} different clips`);
}

export function teardown(data) {
    console.log('Clip detail view load test completed');
}
