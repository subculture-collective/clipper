/**
 * K6 Load Test: Mixed Realistic User Behavior Scenario
 * 
 * Simulates realistic user behavior patterns combining:
 * - Feed browsing (hot, new, top)
 * - Clip detail viewing
 * - Searching
 * - Commenting (if authenticated)
 * - Voting (if authenticated)
 * - Tag browsing
 * 
 * This test represents a realistic mix of user activities on the platform.
 * 
 * Target: Overall p95 response time <100ms
 * 
 * Run with: k6 run backend/tests/load/scenarios/mixed_behavior.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');
const totalRequests = new Counter('total_requests');
const userSessions = new Counter('user_sessions');

// Test configuration
export const options = {
    stages: [
        { duration: '1m', target: 30 },   // Ramp up to 30 users
        { duration: '3m', target: 75 },   // Ramp up to 75 users
        { duration: '5m', target: 100 },  // Reach 100 concurrent users
        { duration: '5m', target: 100 },  // Sustain 100 users
        { duration: '2m', target: 50 },   // Ramp down to 50
        { duration: '1m', target: 0 },    // Ramp down to 0
    ],
    thresholds: {
        'http_req_duration': ['p(95)<100', 'p(99)<200'],
        'http_req_duration{page:feed}': ['p(95)<75'],
        'http_req_duration{page:clip_detail}': ['p(95)<100'],
        'http_req_duration{page:search}': ['p(95)<100'],
        'errors': ['rate<0.02'],
        'http_req_failed': ['rate<0.02'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// User behavior profiles
const USER_PROFILES = {
    CASUAL_BROWSER: 0.4,      // 40% - Mainly browse feed
    ACTIVE_VIEWER: 0.3,       // 30% - View clips, vote occasionally
    SEARCHER: 0.15,           // 15% - Use search frequently
    ENGAGED_USER: 0.15,       // 15% - Vote, comment, search (requires auth)
};

export default function () {
    userSessions.add(1);
    
    // Determine user profile
    const profile = determineUserProfile();
    
    // Execute user journey based on profile
    switch (profile) {
        case 'CASUAL_BROWSER':
            casualBrowserJourney();
            break;
        case 'ACTIVE_VIEWER':
            activeViewerJourney();
            break;
        case 'SEARCHER':
            searcherJourney();
            break;
        case 'ENGAGED_USER':
            engagedUserJourney();
            break;
    }
}

function determineUserProfile() {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [profile, probability] of Object.entries(USER_PROFILES)) {
        cumulative += probability;
        if (rand < cumulative) {
            return profile;
        }
    }
    
    return 'CASUAL_BROWSER';
}

function casualBrowserJourney() {
    // Browse feed (hot/new/top)
    browseFeed();
    sleep(2);
    
    // Maybe view a clip (60% chance)
    if (Math.random() < 0.6) {
        viewClipDetail();
        sleep(5); // Watch clip
    }
    
    // Browse another feed
    browseFeed('new');
    sleep(2);
}

function activeViewerJourney() {
    // Browse feed
    browseFeed();
    sleep(1);
    
    // View 2-3 clips
    const numClips = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numClips; i++) {
        viewClipDetail();
        sleep(8); // Watch clip
        
        // Vote on clip (70% chance if authenticated)
        if (AUTH_TOKEN && Math.random() < 0.7) {
            voteOnClip();
        }
        
        sleep(2); // Browse related clips briefly
    }
    
    // Browse by tag (40% chance)
    if (Math.random() < 0.4) {
        browseByTag();
        sleep(3);
    }
}

function searcherJourney() {
    // Perform search
    performSearch();
    sleep(2);
    
    // View search result
    viewClipDetail();
    sleep(6);
    
    // Refine search
    performSearch();
    sleep(2);
    
    // View another result
    viewClipDetail();
    sleep(5);
}

function engagedUserJourney() {
    if (!AUTH_TOKEN) {
        // Fall back to active viewer if not authenticated
        activeViewerJourney();
        return;
    }
    
    // Browse feed
    browseFeed();
    sleep(1);
    
    // View clip and interact
    viewClipDetail();
    sleep(7);
    
    // Vote on clip
    voteOnClip();
    sleep(1);
    
    // Read and maybe comment
    if (Math.random() < 0.5) {
        createComment();
        sleep(2);
    }
    
    // Search for specific content
    performSearch();
    sleep(2);
    
    // View search result
    viewClipDetail();
    sleep(5);
}

// Helper functions for API calls

function browseFeed(sort = null) {
    const sorts = ['hot', 'new', 'top'];
    const selectedSort = sort || sorts[Math.floor(Math.random() * sorts.length)];
    const limit = 25;
    const timeframe = selectedSort === 'top' ? '&timeframe=week' : '';
    
    const response = http.get(
        `${BASE_URL}/api/v1/clips?sort=${selectedSort}&limit=${limit}${timeframe}`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { page: 'feed', sort: selectedSort },
        }
    );
    
    totalRequests.add(1);
    pageLoadTime.add(response.timings.duration);
    
    check(response, {
        'feed loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
}

function viewClipDetail() {
    const clipIds = [
        'LoadTest00001ClipID',
        'LoadTest00005ClipID',
        'LoadTest00010ClipID',
        'LoadTest00015ClipID',
        'LoadTest00020ClipID',
    ];
    
    const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/clips/${clipId}`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { page: 'clip_detail' },
        }
    );
    
    totalRequests.add(1);
    pageLoadTime.add(response.timings.duration);
    
    check(response, {
        'clip detail loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    // Load comments
    http.get(
        `${BASE_URL}/api/v1/clips/${clipId}/comments?limit=20`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { page: 'clip_detail', type: 'comments' },
        }
    );
    
    totalRequests.add(1);
}

function performSearch() {
    const queries = ['clutch', 'funny', 'epic', 'valorant', 'insane', 'highlight'];
    const query = queries[Math.floor(Math.random() * queries.length)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&limit=25`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { page: 'search' },
        }
    );
    
    totalRequests.add(1);
    pageLoadTime.add(response.timings.duration);
    
    check(response, {
        'search completed': (r) => r.status === 200,
    }) || errorRate.add(1);
}

function browseByTag() {
    const tags = ['funny', 'epic', 'fail', 'highlight', 'clutch'];
    const tag = tags[Math.floor(Math.random() * tags.length)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/tags/${tag}/clips?limit=20`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { page: 'tag_browse' },
        }
    );
    
    totalRequests.add(1);
    pageLoadTime.add(response.timings.duration);
    
    check(response, {
        'tag browse loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
}

function voteOnClip() {
    const clipIds = [
        'LoadTest00001ClipID',
        'LoadTest00005ClipID',
        'LoadTest00010ClipID',
    ];
    
    const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
    const voteType = Math.random() < 0.8 ? 1 : -1; // 80% upvotes
    
    const response = http.post(
        `${BASE_URL}/api/v1/clips/${clipId}/vote`,
        JSON.stringify({ vote_type: voteType }),
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { page: 'clip_detail', action: 'vote' },
        }
    );
    
    totalRequests.add(1);
    
    check(response, {
        'vote recorded': (r) => r.status === 200 || r.status === 201,
    }) || errorRate.add(1);
}

function createComment() {
    const clipIds = [
        'LoadTest00001ClipID',
        'LoadTest00005ClipID',
        'LoadTest00010ClipID',
    ];
    
    const comments = [
        'Great clip!',
        'Amazing play',
        'This is so good',
        'LOL',
        'Insane',
    ];
    
    const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
    const content = comments[Math.floor(Math.random() * comments.length)];
    
    const response = http.post(
        `${BASE_URL}/api/v1/clips/${clipId}/comments`,
        JSON.stringify({ content }),
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { page: 'clip_detail', action: 'comment' },
        }
    );
    
    totalRequests.add(1);
    
    check(response, {
        'comment created': (r) => r.status === 201,
    }) || errorRate.add(1);
}

export function setup() {
    console.log('Starting mixed realistic user behavior load test');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Authentication: ${AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);
    console.log('\nUser Profiles:');
    console.log(`  - Casual Browser: ${USER_PROFILES.CASUAL_BROWSER * 100}%`);
    console.log(`  - Active Viewer: ${USER_PROFILES.ACTIVE_VIEWER * 100}%`);
    console.log(`  - Searcher: ${USER_PROFILES.SEARCHER * 100}%`);
    console.log(`  - Engaged User: ${USER_PROFILES.ENGAGED_USER * 100}%`);
}

export function teardown(data) {
    console.log('\nMixed user behavior load test completed');
}
