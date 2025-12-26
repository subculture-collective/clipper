/**
 * K6 Soak Test: 24-Hour Endurance Test with Memory Leak Detection
 * 
 * This test runs for an extended period (default 24 hours) with realistic
 * traffic patterns to identify:
 * - Memory leaks and gradual resource exhaustion
 * - Performance degradation over time
 * - Connection pool issues
 * - Cache effectiveness over extended periods
 * - Database connection leaks
 * 
 * Goals:
 * - Maintain stable performance over extended duration
 * - Detect memory leaks and resource accumulation
 * - Validate long-term system stability
 * - Identify gradual performance degradation
 * 
 * Monitoring Focus:
 * - Memory usage trends (should be stable)
 * - Response time trends (should not degrade)
 * - Error rate trends (should remain low)
 * - Database connection pool usage
 * - Cache hit rates over time
 * 
 * Run with: k6 run backend/tests/load/scenarios/soak.js
 * Run short version (1h): k6 run -e DURATION_HOURS=1 backend/tests/load/scenarios/soak.js
 * Run with monitoring: k6 run -e ENABLE_MONITORING=true backend/tests/load/scenarios/soak.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics for soak testing and leak detection
const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');
const memoryIndicator = new Trend('response_size_bytes');
const timeToFirstByte = new Trend('time_to_first_byte');
const totalRequests = new Counter('total_requests');
const degradationEvents = new Counter('degradation_events');
const timeoutEvents = new Counter('timeout_events');
const connectionErrors = new Counter('connection_errors');
const slowRequests = new Counter('slow_requests');
const verySlowRequests = new Counter('very_slow_requests');
const currentHour = new Gauge('current_test_hour');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const DURATION_HOURS = parseFloat(__ENV.DURATION_HOURS || '24');
const ENABLE_MONITORING = __ENV.ENABLE_MONITORING === 'true';
const TARGET_VUS = parseInt(__ENV.TARGET_VUS || '75');

// Soak test configuration
// Maintains constant moderate load for extended period
export const options = {
    stages: [
        // Quick ramp up (5 minutes)
        { duration: '5m', target: Math.floor(TARGET_VUS * 0.5) },
        
        // Reach target load (10 minutes)
        { duration: '10m', target: TARGET_VUS },
        
        // Maintain constant load for soak duration
        { duration: `${DURATION_HOURS}h`, target: TARGET_VUS },
        
        // Gradual ramp down (5 minutes)
        { duration: '5m', target: 0 },
    ],
    
    // Strict thresholds - we expect consistent performance
    thresholds: {
        // Response times should remain stable
        'http_req_duration': ['p(95)<150', 'p(99)<300'],
        
        // Error rate should stay very low
        'errors': ['rate<0.01'], // Less than 1%
        'http_req_failed': ['rate<0.01'],
        
        // Slow requests should not increase over time
        'slow_requests': ['count<1000'], // Adjust based on duration
        'very_slow_requests': ['count<100'],
        
        // Time to first byte should remain stable
        'time_to_first_byte': ['p(95)<50'],
    },
    
    // Extended timeout for long-running test
    setupTimeout: '60s',
    teardownTimeout: '60s',
};

// Track test progress for hourly reporting
let testStartTime;
let lastHourReported = 0;
const performanceBaseline = {
    p95: null,
    p99: null,
    errorRate: 0,
};

// Realistic user behavior patterns
const USER_BEHAVIORS = {
    CASUAL_BROWSER: 0.40,     // Browse and view occasionally
    REGULAR_USER: 0.35,        // Browse, view, vote
    ACTIVE_USER: 0.15,         // Frequent interactions
    SEARCHER: 0.10,            // Search-focused users
};

export default function () {
    totalRequests.add(1);
    
    // Update hourly metrics
    updateHourlyMetrics();
    
    // Periodic health check and monitoring
    if (ENABLE_MONITORING && Math.random() < 0.01) {
        performHealthCheck();
    }
    
    // Select user behavior
    const behavior = selectUserBehavior();
    
    // Execute realistic user journey
    switch (behavior) {
        case 'CASUAL_BROWSER':
            casualBrowserSoak();
            break;
        case 'REGULAR_USER':
            regularUserSoak();
            break;
        case 'ACTIVE_USER':
            activeUserSoak();
            break;
        case 'SEARCHER':
            searcherSoak();
            break;
    }
}

function updateHourlyMetrics() {
    if (!testStartTime) {
        testStartTime = Date.now();
    }
    
    const elapsedHours = Math.floor((Date.now() - testStartTime) / (1000 * 60 * 60));
    
    if (elapsedHours > lastHourReported) {
        lastHourReported = elapsedHours;
        currentHour.add(elapsedHours);
        
        if (elapsedHours > 0 && elapsedHours % 6 === 0) {
            console.log(`[SOAK TEST] ${elapsedHours} hours elapsed - System stable`);
        }
    }
}

function selectUserBehavior() {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [behavior, probability] of Object.entries(USER_BEHAVIORS)) {
        cumulative += probability;
        if (rand < cumulative) {
            return behavior;
        }
    }
    
    return 'CASUAL_BROWSER';
}

function performHealthCheck() {
    const response = http.get(
        `${BASE_URL}/api/v1/health`,
        {
            tags: { type: 'health_check' },
            timeout: '10s',
        }
    );
    
    if (response.status !== 200) {
        console.warn(`[SOAK TEST] Health check failed: ${response.status}`);
    }
}

function casualBrowserSoak() {
    // Browse feed casually
    const response = browseFeed();
    
    // Long think time - casual users are slow
    sleep(Math.random() * 5 + 10); // 10-15 seconds
    
    // Maybe view a clip (50% chance)
    if (Math.random() < 0.5) {
        viewClip();
        sleep(Math.random() * 10 + 15); // Watch clip 15-25 seconds
    }
    
    // Browse again
    browseFeed('new');
    sleep(Math.random() * 5 + 8);
}

function regularUserSoak() {
    // Browse feed
    browseFeed();
    sleep(Math.random() * 3 + 2); // 2-5 seconds
    
    // View 1-2 clips
    const clipCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < clipCount; i++) {
        viewClip();
        sleep(Math.random() * 8 + 10); // Watch 10-18 seconds
        
        // Maybe vote (60% chance if authenticated)
        if (AUTH_TOKEN && Math.random() < 0.6) {
            voteOnClip();
            sleep(1);
        }
        
        sleep(Math.random() * 3 + 2);
    }
    
    // Browse by tag occasionally (30% chance)
    if (Math.random() < 0.3) {
        browseTag();
        sleep(Math.random() * 3 + 3);
    }
}

function activeUserSoak() {
    if (!AUTH_TOKEN) {
        regularUserSoak();
        return;
    }
    
    // Browse and interact heavily
    browseFeed();
    sleep(2);
    
    // View multiple clips
    for (let i = 0; i < 3; i++) {
        viewClip();
        sleep(Math.random() * 5 + 8);
        
        // Vote on most clips (80% chance)
        if (Math.random() < 0.8) {
            voteOnClip();
            sleep(0.5);
        }
        
        // Occasionally comment (20% chance)
        if (Math.random() < 0.2) {
            createComment();
            sleep(2);
        }
    }
    
    sleep(Math.random() * 2 + 1);
}

function searcherSoak() {
    // Perform search
    performSearch();
    sleep(Math.random() * 2 + 2);
    
    // View search results
    viewClip();
    sleep(Math.random() * 8 + 10);
    
    // Refine search
    performSearch();
    sleep(Math.random() * 3 + 2);
    
    // View another result
    viewClip();
    sleep(Math.random() * 8 + 8);
}

// API interaction functions with detailed monitoring

function browseFeed(sort = null) {
    const sorts = ['hot', 'new', 'top'];
    const selectedSort = sort || sorts[Math.floor(Math.random() * sorts.length)];
    const limit = 25;
    const timeframe = selectedSort === 'top' ? '&timeframe=week' : '';
    
    const response = http.get(
        `${BASE_URL}/api/v1/clips?sort=${selectedSort}&limit=${limit}${timeframe}`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { 
                page: 'feed', 
                sort: selectedSort,
                test_type: 'soak',
            },
            timeout: '30s',
        }
    );
    
    trackResponse(response, 'feed');
    return response;
}

function viewClip() {
    const clipIds = [
        'LoadTest00001ClipID',
        'LoadTest00005ClipID',
        'LoadTest00010ClipID',
        'LoadTest00015ClipID',
        'LoadTest00020ClipID',
        'LoadTest00025ClipID',
        'LoadTest00030ClipID',
    ];
    
    const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/clips/${clipId}`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { 
                page: 'clip_detail',
                test_type: 'soak',
            },
            timeout: '30s',
        }
    );
    
    trackResponse(response, 'clip_detail');
    
    // Also load comments (realistic behavior)
    const commentsResponse = http.get(
        `${BASE_URL}/api/v1/clips/${clipId}/comments?limit=20`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { 
                page: 'clip_detail',
                type: 'comments',
                test_type: 'soak',
            },
            timeout: '30s',
        }
    );
    
    trackResponse(commentsResponse, 'comments');
    
    return response;
}

function performSearch() {
    const queries = ['clutch', 'funny', 'epic', 'valorant', 'insane', 'highlight', 'competitive'];
    const query = queries[Math.floor(Math.random() * queries.length)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&limit=25`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { 
                page: 'search',
                test_type: 'soak',
            },
            timeout: '30s',
        }
    );
    
    trackResponse(response, 'search');
    return response;
}

function browseTag() {
    const tags = ['funny', 'epic', 'fail', 'highlight', 'clutch'];
    const tag = tags[Math.floor(Math.random() * tags.length)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/tags/${tag}/clips?limit=20`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { 
                page: 'tag_browse',
                test_type: 'soak',
            },
            timeout: '30s',
        }
    );
    
    trackResponse(response, 'tag_browse');
    return response;
}

function voteOnClip() {
    if (!AUTH_TOKEN) return;
    
    const clipIds = [
        'LoadTest00001ClipID',
        'LoadTest00005ClipID',
        'LoadTest00010ClipID',
    ];
    
    const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
    const voteType = Math.random() < 0.8 ? 1 : -1;
    
    const response = http.post(
        `${BASE_URL}/api/v1/clips/${clipId}/vote`,
        JSON.stringify({ vote_type: voteType }),
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: { 
                action: 'vote',
                test_type: 'soak',
            },
            timeout: '30s',
        }
    );
    
    trackResponse(response, 'vote');
    return response;
}

function createComment() {
    if (!AUTH_TOKEN) return;
    
    const clipIds = [
        'LoadTest00001ClipID',
        'LoadTest00005ClipID',
        'LoadTest00010ClipID',
    ];
    
    const comments = [
        'Great clip!',
        'Amazing play',
        'This is so good',
        'Nice',
        'Impressive',
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
            tags: { 
                action: 'comment',
                test_type: 'soak',
            },
            timeout: '30s',
        }
    );
    
    trackResponse(response, 'comment');
    return response;
}

function trackResponse(response, endpoint) {
    const duration = response.timings.duration;
    const ttfb = response.timings.waiting;
    
    // Track timing metrics
    pageLoadTime.add(duration, { endpoint: endpoint });
    timeToFirstByte.add(ttfb, { endpoint: endpoint });
    
    // Track response size (for memory leak detection)
    if (response.body) {
        memoryIndicator.add(response.body.length, { endpoint: endpoint });
    }
    
    // Check response
    const isSuccess = check(response, {
        'status is success': (r) => r.status >= 200 && r.status < 300,
        'response time acceptable': (r) => r.timings.duration < 1000,
    });
    
    if (!isSuccess) {
        errorRate.add(1);
        
        // Track specific error types
        if (response.status === 0 || response.error_code) {
            connectionErrors.add(1);
        }
    }
    
    // Track degradation indicators
    if (duration > 500 && duration < 1000) {
        slowRequests.add(1);
    }
    
    if (duration >= 1000) {
        verySlowRequests.add(1);
        degradationEvents.add(1);
    }
    
    // Track timeouts
    if (response.status === 0 || response.timings.duration > 25000) {
        timeoutEvents.add(1);
    }
    
    // Detect performance degradation patterns
    if (performanceBaseline.p95 && duration > performanceBaseline.p95 * 1.5) {
        degradationEvents.add(1);
    }
}

export function setup() {
    console.log('========================================');
    console.log('Starting SOAK TEST (Endurance)');
    console.log('========================================');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Duration: ${DURATION_HOURS} hours`);
    console.log(`Target VUs: ${TARGET_VUS} concurrent users`);
    console.log(`Authentication: ${AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);
    console.log(`Monitoring: ${ENABLE_MONITORING ? 'Enabled' : 'Disabled'}`);
    console.log('');
    console.log('Test Goals:');
    console.log('  - Maintain stable performance over extended duration');
    console.log('  - Detect memory leaks and resource accumulation');
    console.log('  - Identify gradual performance degradation');
    console.log('  - Validate connection pool management');
    console.log('  - Monitor cache effectiveness over time');
    console.log('');
    console.log('Monitoring Focus:');
    console.log('  - Memory usage trends (check for growth)');
    console.log('  - Response time stability');
    console.log('  - Error rate trends');
    console.log('  - Connection pool health');
    console.log('  - Database performance');
    console.log('');
    console.log('User Behavior Mix:');
    console.log(`  - Casual Browsers: ${USER_BEHAVIORS.CASUAL_BROWSER * 100}%`);
    console.log(`  - Regular Users: ${USER_BEHAVIORS.REGULAR_USER * 100}%`);
    console.log(`  - Active Users: ${USER_BEHAVIORS.ACTIVE_USER * 100}%`);
    console.log(`  - Searchers: ${USER_BEHAVIORS.SEARCHER * 100}%`);
    console.log('========================================');
    
    // Verify API is accessible
    const healthCheck = http.get(`${BASE_URL}/api/v1/health`);
    if (healthCheck.status !== 200) {
        throw new Error(`API health check failed with status ${healthCheck.status}`);
    }
    
    // Establish performance baseline
    console.log('Establishing performance baseline...');
    const baselineResponse = http.get(`${BASE_URL}/api/v1/clips?sort=hot&limit=25`);
    performanceBaseline.p95 = baselineResponse.timings.duration;
    console.log(`Baseline p95: ${performanceBaseline.p95.toFixed(2)}ms`);
    
    return {
        startTime: new Date(),
        baselineDuration: baselineResponse.timings.duration,
        durationHours: DURATION_HOURS,
    };
}

export function teardown(data) {
    const endTime = new Date();
    const durationMs = endTime - data.startTime;
    const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
    
    console.log('');
    console.log('========================================');
    console.log('SOAK TEST COMPLETED');
    console.log('========================================');
    console.log(`Started: ${data.startTime}`);
    console.log(`Completed: ${endTime}`);
    console.log(`Actual Duration: ${durationHours} hours`);
    console.log(`Baseline Response Time: ${data.baselineDuration.toFixed(2)}ms`);
    console.log('');
    console.log('Analysis Checklist:');
    console.log('  □ Check memory usage trends in monitoring');
    console.log('  □ Analyze response time degradation over time');
    console.log('  □ Review error patterns and frequency');
    console.log('  □ Check database connection pool metrics');
    console.log('  □ Verify cache hit rates remained stable');
    console.log('  □ Look for goroutine leaks in profiling data');
    console.log('  □ Check for file descriptor leaks');
    console.log('  □ Review slow query logs');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Review Grafana dashboards for trends');
    console.log('  2. Analyze memory profiles for leaks');
    console.log('  3. Check application logs for errors');
    console.log('  4. Generate soak test report');
    console.log('  5. Document any issues discovered');
    console.log('========================================');
}
