/**
 * K6 Load Test: Clip Submission Scenario
 * 
 * Tests clip submission functionality (authenticated):
 * - Submit new clip URL
 * - Get user submissions
 * - Get submission stats
 * 
 * Target: Submission processing <200ms (p95)
 * 
 * Run with: k6 run backend/tests/load/scenarios/submit.js
 * 
 * Note: This test requires authentication. Set AUTH_TOKEN environment variable.
 * The test will fail gracefully if AUTH_TOKEN is not provided.
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const submitLoadTime = new Trend('submit_load_time');
const submissionsListLoadTime = new Trend('submissions_list_load_time');
const submissionStatsLoadTime = new Trend('submission_stats_load_time');
const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 5 },   // Ramp up to 5 users (low for submissions)
        { duration: '1m', target: 10 },   // Ramp up to 10 users
        { duration: '2m', target: 10 },   // Stay at 10 users
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        'http_req_duration{endpoint:submit_clip}': ['p(95)<200', 'p(99)<500'],
        'http_req_duration{endpoint:list_submissions}': ['p(95)<50', 'p(99)<100'],
        'http_req_duration{endpoint:submission_stats}': ['p(95)<30', 'p(99)<75'],
        'errors': ['rate<0.05'], // Error rate should be below 5%
        'http_req_failed{endpoint:list_submissions}': ['rate<0.01'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Sample Twitch clip URLs for submission
const clipUrls = [
    'https://clips.twitch.tv/FamousCrispyEelPJSalt',
    'https://clips.twitch.tv/ToughSillyFrogFunRun',
    'https://clips.twitch.tv/SplendidBumblingDolphinNotATK',
    'https://clips.twitch.tv/GeniusEagerChinchillaBuddhaBar',
    'https://clips.twitch.tv/RelatedArbitraryOcelotPeoplesChamp',
    'https://www.twitch.tv/videos/123456789?t=1h2m3s',
];

export default function () {
    if (!AUTH_TOKEN) {
        console.log('Skipping test iteration - no AUTH_TOKEN provided');
        sleep(5);
        return;
    }
    
    const scenario = Math.random();
    
    if (scenario < 0.3) {
        // Submit new clip (30% of requests)
        submitClip();
    } else if (scenario < 0.7) {
        // List user submissions (40% of requests)
        listSubmissions();
    } else {
        // Get submission stats (30% of requests)
        getSubmissionStats();
    }
    
    // Simulate user reviewing submission
    sleep(Math.random() * 5 + 2);
}

function submitClip() {
    const clipUrl = clipUrls[Math.floor(Math.random() * clipUrls.length)];
    
    const payload = JSON.stringify({
        url: clipUrl,
        note: 'Load test submission',
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
            tags: { endpoint: 'submit_clip' },
        }
    );
    
    totalRequests.add(1);
    submitLoadTime.add(response.timings.duration);
    
    const success = check(response, {
        'submit status is 201 or 400': (r) => r.status === 201 || r.status === 400, // 400 for duplicates
        'submit response time < 200ms': (r) => r.timings.duration < 200,
        'submit response time < 100ms': (r) => r.timings.duration < 100,
        'has response data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body !== null;
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

function listSubmissions() {
    const limit = 20;
    const status = ['pending', 'approved', 'rejected', 'all'][Math.floor(Math.random() * 4)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/submissions?limit=${limit}&status=${status}`,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { endpoint: 'list_submissions' },
        }
    );
    
    totalRequests.add(1);
    submissionsListLoadTime.add(response.timings.duration);
    
    const success = check(response, {
        'list submissions status is 200': (r) => r.status === 200,
        'list submissions response time < 50ms': (r) => r.timings.duration < 50,
        'has submissions array': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
        'has pagination': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.pagination !== undefined;
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

function getSubmissionStats() {
    const response = http.get(
        `${BASE_URL}/api/v1/submissions/stats`,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { endpoint: 'submission_stats' },
        }
    );
    
    totalRequests.add(1);
    submissionStatsLoadTime.add(response.timings.duration);
    
    const success = check(response, {
        'stats status is 200': (r) => r.status === 200,
        'stats response time < 30ms': (r) => r.timings.duration < 30,
        'has stats data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && body.data !== null;
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

export function setup() {
    console.log('Starting clip submission load test');
    console.log(`Target URL: ${BASE_URL}`);
    
    if (!AUTH_TOKEN) {
        console.log('ERROR: No AUTH_TOKEN provided!');
        console.log('Set AUTH_TOKEN environment variable to run this test.');
        console.log('Example: k6 run -e AUTH_TOKEN=your_token backend/tests/load/scenarios/submit.js');
        return { skipTest: true };
    }
    
    console.log('Authentication: Enabled');
    return { skipTest: false };
}

export function teardown(data) {
    console.log('Clip submission load test completed');
}
