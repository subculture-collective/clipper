/**
 * K6 Load Test: Comment Scenario
 * 
 * Tests commenting functionality including:
 * - Creating comments (authenticated)
 * - Listing comments
 * - Voting on comments (authenticated)
 * - Fetching comment replies
 * 
 * Target: Comment creation <100ms (p95), List comments <50ms (p95)
 * 
 * Run with: k6 run backend/tests/load/scenarios/comments.js
 * 
 * Note: This test requires authentication. Set AUTH_TOKEN environment variable
 * or the test will only test read operations.
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const commentListLoadTime = new Trend('comment_list_load_time');
const commentCreateTime = new Trend('comment_create_time');
const commentVoteTime = new Trend('comment_vote_time');
const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Ramp up to 10 users
        { duration: '1m', target: 25 },   // Ramp up to 25 users
        { duration: '2m', target: 25 },   // Stay at 25 users
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        'http_req_duration{endpoint:list_comments}': ['p(95)<50', 'p(99)<100'],
        'http_req_duration{endpoint:create_comment}': ['p(95)<100', 'p(99)<200'],
        'http_req_duration{endpoint:vote_comment}': ['p(95)<50', 'p(99)<100'],
        'errors': ['rate<0.02'], // Error rate should be below 2%
        'http_req_failed{endpoint:list_comments}': ['rate<0.01'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ''; // Set this for authenticated tests

// Sample clip IDs (should match seeded data)
const clipIds = [
    'LoadTest00001ClipID',
    'LoadTest00002ClipID',
    'LoadTest00003ClipID',
    'LoadTest00005ClipID',
    'LoadTest00010ClipID',
    'LoadTest00015ClipID',
];

// Comment texts for variety
const commentTexts = [
    'Amazing clip!',
    'This is so good!',
    'LOL that was hilarious',
    'Insane play',
    'Best moment today',
    'How did they pull that off?',
    'Absolutely destroyed',
    'This deserves more views',
    'Epic',
    'Wow just wow',
    'Can\'t stop watching',
    'Pure skill',
    'Lucky shot tbh',
    'Calculated.',
    'No way this is real',
];

export default function () {
    const scenario = Math.random();
    
    if (scenario < 0.7) {
        // List comments (70% of requests)
        listComments();
    } else if (scenario < 0.85 && AUTH_TOKEN) {
        // Create comment (15% of requests, only if authenticated)
        createComment();
    } else if (AUTH_TOKEN) {
        // Vote on comment (15% of requests, only if authenticated)
        voteOnComment();
    } else {
        // If no auth token, just list comments
        listComments();
    }
    
    // Simulate user reading comments
    sleep(Math.random() * 3 + 1);
}

function listComments() {
    const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
    const limit = 20;
    const sort = ['recent', 'top'][Math.floor(Math.random() * 2)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/clips/${clipId}/comments?limit=${limit}&sort=${sort}`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { endpoint: 'list_comments' },
        }
    );
    
    totalRequests.add(1);
    commentListLoadTime.add(response.timings.duration);
    
    const success = check(response, {
        'list comments status is 200': (r) => r.status === 200,
        'list comments response time < 50ms': (r) => r.timings.duration < 50,
        'has comments array': (r) => {
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

function createComment() {
    const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
    const content = commentTexts[Math.floor(Math.random() * commentTexts.length)];
    
    const payload = JSON.stringify({
        content: content,
    });
    
    const response = http.post(
        `${BASE_URL}/api/v1/clips/${clipId}/comments`,
        payload,
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { endpoint: 'create_comment' },
        }
    );
    
    totalRequests.add(1);
    commentCreateTime.add(response.timings.duration);
    
    const success = check(response, {
        'create comment status is 201': (r) => r.status === 201,
        'create comment response time < 100ms': (r) => r.timings.duration < 100,
        'comment created successfully': (r) => {
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

function voteOnComment() {
    // First, get a clip's comments to find comment IDs
    const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
    
    let response = http.get(
        `${BASE_URL}/api/v1/clips/${clipId}/comments?limit=5`,
        {
            headers: { 'Accept': 'application/json' },
        }
    );
    
    let commentId = null;
    try {
        const body = JSON.parse(response.body);
        if (body.success && body.data && body.data.length > 0) {
            commentId = body.data[0].id;
        }
    } catch (e) {
        // Comment not found, skip voting
        return;
    }
    
    if (!commentId) {
        return;
    }
    
    // Vote on the comment
    const voteType = Math.random() < 0.7 ? 1 : -1; // 70% upvotes, 30% downvotes
    
    const payload = JSON.stringify({
        vote_type: voteType,
    });
    
    response = http.post(
        `${BASE_URL}/api/v1/comments/${commentId}/vote`,
        payload,
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { endpoint: 'vote_comment' },
        }
    );
    
    totalRequests.add(1);
    commentVoteTime.add(response.timings.duration);
    
    const success = check(response, {
        'vote comment status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'vote comment response time < 50ms': (r) => r.timings.duration < 50,
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

export function setup() {
    console.log('Starting comment scenario load test');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Authentication: ${AUTH_TOKEN ? 'Enabled' : 'Disabled (read-only mode)'}`);
    
    if (!AUTH_TOKEN) {
        console.log('Warning: No AUTH_TOKEN provided. Only testing read operations.');
        console.log('Set AUTH_TOKEN environment variable to test comment creation and voting.');
    }
}

export function teardown(data) {
    console.log('Comment scenario load test completed');
}
