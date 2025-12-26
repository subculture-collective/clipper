/**
 * K6 Stress Test: Push System Beyond Capacity
 * 
 * This test progressively increases load beyond normal operating capacity
 * to identify system breaking points, resource exhaustion, and recovery behavior.
 * 
 * Goals:
 * - Identify maximum sustainable load
 * - Observe degradation patterns under stress
 * - Validate recovery after load reduction
 * - Detect resource leaks and exhaustion
 * 
 * Exit Criteria:
 * - Error rate exceeds 25%
 * - Response time p99 exceeds 5000ms
 * - Test completes all stages
 * 
 * Run with: k6 run backend/tests/load/scenarios/stress.js
 * Run lite version: k6 run -e DURATION_MULTIPLIER=0.25 backend/tests/load/scenarios/stress.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics for stress testing
const errorRate = new Rate('errors');
const degradationRate = new Rate('degraded_responses');
const recoveryRate = new Rate('recovery_successful');
const pageLoadTime = new Trend('page_load_time');
const totalRequests = new Counter('total_requests');
const concurrentUsers = new Gauge('concurrent_users');
const resourceExhaustion = new Counter('resource_exhaustion_events');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const DURATION_MULTIPLIER = parseFloat(__ENV.DURATION_MULTIPLIER || '1.0');
const ENABLE_CHAOS = __ENV.ENABLE_CHAOS === 'true';

// Stress test configuration
// This progressively increases load to push the system beyond capacity
export const options = {
    stages: [
        // Phase 1: Normal load baseline (establish baseline performance)
        { duration: `${Math.floor(2 * DURATION_MULTIPLIER)}m`, target: 50 },
        
        // Phase 2: Increased load (approach capacity)
        { duration: `${Math.floor(2 * DURATION_MULTIPLIER)}m`, target: 100 },
        
        // Phase 3: High load (at or near capacity)
        { duration: `${Math.floor(3 * DURATION_MULTIPLIER)}m`, target: 150 },
        
        // Phase 4: Stress load (beyond normal capacity)
        { duration: `${Math.floor(3 * DURATION_MULTIPLIER)}m`, target: 200 },
        
        // Phase 5: Extreme stress (push to breaking point)
        { duration: `${Math.floor(3 * DURATION_MULTIPLIER)}m`, target: 300 },
        
        // Phase 6: Peak stress (maximum pressure)
        { duration: `${Math.floor(2 * DURATION_MULTIPLIER)}m`, target: 400 },
        
        // Phase 7: Recovery phase (reduce to high load)
        { duration: `${Math.floor(2 * DURATION_MULTIPLIER)}m`, target: 150 },
        
        // Phase 8: Return to normal (validate recovery)
        { duration: `${Math.floor(2 * DURATION_MULTIPLIER)}m`, target: 50 },
        
        // Phase 9: Cool down
        { duration: `${Math.floor(1 * DURATION_MULTIPLIER)}m`, target: 0 },
    ],
    
    // Relaxed thresholds - we expect some failures during stress
    thresholds: {
        // Don't fail the test unless errors are catastrophic
        'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
        'errors': ['rate<0.25'], // Allow up to 25% errors during peak stress
        'http_req_failed': ['rate<0.25'],
        
        // Track degradation but don't fail on it
        'degraded_responses': ['rate<0.50'],
    },
    
    // Extended timeout for stress conditions
    httpDebug: 'full',
};

// Track phases for reporting
let currentPhase = 'baseline';

export default function () {
    concurrentUsers.add(1);
    totalRequests.add(1);
    
    // Determine which phase we're in based on VU count
    const vu = __VU;
    const vus = __ENV.K6_VUS || 1;
    updatePhase(vus);
    
    // Chaos mode: Occasionally inject delays or failures
    if (ENABLE_CHAOS && Math.random() < 0.05) {
        sleep(Math.random() * 2); // Random delay
    }
    
    // Execute mixed workload with stress patterns
    const scenario = selectStressScenario();
    
    switch (scenario) {
        case 'feed_heavy':
            stressFeedBrowsing();
            break;
        case 'search_intensive':
            stressSearch();
            break;
        case 'write_operations':
            stressWriteOps();
            break;
        case 'clip_viewing':
            stressClipViewing();
            break;
        default:
            stressMixedLoad();
    }
}

function updatePhase(vus) {
    if (vus < 75) {
        currentPhase = 'baseline';
    } else if (vus < 125) {
        currentPhase = 'increased';
    } else if (vus < 175) {
        currentPhase = 'high';
    } else if (vus < 250) {
        currentPhase = 'stress';
    } else if (vus < 350) {
        currentPhase = 'extreme';
    } else {
        currentPhase = 'peak';
    }
}

function selectStressScenario() {
    const scenarios = [
        'feed_heavy',
        'search_intensive',
        'write_operations',
        'clip_viewing',
        'mixed',
    ];
    
    // Weight scenarios based on stress patterns
    const weights = [0.3, 0.2, 0.15, 0.25, 0.1];
    const rand = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < scenarios.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) {
            return scenarios[i];
        }
    }
    
    return 'mixed';
}

function stressFeedBrowsing() {
    // Rapid-fire feed requests with various parameters
    const sorts = ['hot', 'new', 'top'];
    const limits = [25, 50, 100]; // Varying response sizes
    
    for (let i = 0; i < 3; i++) {
        const sort = sorts[Math.floor(Math.random() * sorts.length)];
        const limit = limits[Math.floor(Math.random() * limits.length)];
        const timeframe = sort === 'top' ? '&timeframe=week' : '';
        
        const response = http.get(
            `${BASE_URL}/api/v1/clips?sort=${sort}&limit=${limit}${timeframe}`,
            {
                headers: { 'Accept': 'application/json' },
                tags: { 
                    page: 'feed', 
                    sort: sort,
                    phase: currentPhase,
                    stress_pattern: 'feed_heavy',
                },
                timeout: '30s',
            }
        );
        
        totalRequests.add(1);
        pageLoadTime.add(response.timings.duration);
        
        const isSuccess = check(response, {
            'feed loaded': (r) => r.status === 200,
            'response time acceptable': (r) => r.timings.duration < 2000,
        });
        
        if (!isSuccess) {
            errorRate.add(1);
        }
        
        // Check for degraded performance
        if (response.timings.duration > 500 && response.timings.duration < 2000) {
            degradationRate.add(1);
        }
        
        // Check for resource exhaustion signs
        if (response.status === 429 || response.status === 503 || response.status === 504) {
            resourceExhaustion.add(1);
        }
        
        // Minimal think time under stress
        sleep(0.1);
    }
}

function stressSearch() {
    // Search with complex queries and various filters
    const queries = [
        'clutch', 'funny epic', 'valorant highlights', 
        'insane play', 'competitive', 'tournament'
    ];
    
    for (let i = 0; i < 2; i++) {
        const query = queries[Math.floor(Math.random() * queries.length)];
        
        const response = http.get(
            `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&limit=50`,
            {
                headers: { 'Accept': 'application/json' },
                tags: { 
                    page: 'search',
                    phase: currentPhase,
                    stress_pattern: 'search_intensive',
                },
                timeout: '30s',
            }
        );
        
        totalRequests.add(1);
        pageLoadTime.add(response.timings.duration);
        
        const isSuccess = check(response, {
            'search completed': (r) => r.status === 200,
            'response time acceptable': (r) => r.timings.duration < 2000,
        });
        
        if (!isSuccess) {
            errorRate.add(1);
        }
        
        if (response.timings.duration > 500 && response.timings.duration < 2000) {
            degradationRate.add(1);
        }
        
        if (response.status === 429 || response.status === 503 || response.status === 504) {
            resourceExhaustion.add(1);
        }
        
        sleep(0.1);
    }
}

function stressWriteOps() {
    if (!AUTH_TOKEN) {
        // Fall back to read operations if not authenticated
        stressFeedBrowsing();
        return;
    }
    
    // Stress write operations (votes, comments)
    const clipIds = [
        'LoadTest00001ClipID',
        'LoadTest00005ClipID',
        'LoadTest00010ClipID',
        'LoadTest00015ClipID',
        'LoadTest00020ClipID',
    ];
    
    for (let i = 0; i < 2; i++) {
        const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
        const voteType = Math.random() < 0.8 ? 1 : -1;
        
        // Vote on clip
        const voteResponse = http.post(
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
                    phase: currentPhase,
                    stress_pattern: 'write_heavy',
                },
                timeout: '30s',
            }
        );
        
        totalRequests.add(1);
        
        const isSuccess = check(voteResponse, {
            'vote recorded': (r) => r.status === 200 || r.status === 201,
        });
        
        if (!isSuccess) {
            errorRate.add(1);
        }
        
        if (voteResponse.status === 429 || voteResponse.status === 503 || voteResponse.status === 504) {
            resourceExhaustion.add(1);
        }
        
        sleep(0.1);
    }
}

function stressClipViewing() {
    // Rapid clip viewing with related content
    const clipIds = [
        'LoadTest00001ClipID',
        'LoadTest00005ClipID',
        'LoadTest00010ClipID',
        'LoadTest00015ClipID',
        'LoadTest00020ClipID',
        'LoadTest00025ClipID',
        'LoadTest00030ClipID',
    ];
    
    for (let i = 0; i < 4; i++) {
        const clipId = clipIds[Math.floor(Math.random() * clipIds.length)];
        
        // View clip detail
        const clipResponse = http.get(
            `${BASE_URL}/api/v1/clips/${clipId}`,
            {
                headers: { 'Accept': 'application/json' },
                tags: { 
                    page: 'clip_detail',
                    phase: currentPhase,
                    stress_pattern: 'clip_viewing',
                },
                timeout: '30s',
            }
        );
        
        totalRequests.add(1);
        pageLoadTime.add(clipResponse.timings.duration);
        
        const isSuccess = check(clipResponse, {
            'clip loaded': (r) => r.status === 200,
        });
        
        if (!isSuccess) {
            errorRate.add(1);
        }
        
        if (clipResponse.timings.duration > 500 && clipResponse.timings.duration < 2000) {
            degradationRate.add(1);
        }
        
        if (clipResponse.status === 429 || clipResponse.status === 503 || clipResponse.status === 504) {
            resourceExhaustion.add(1);
        }
        
        // Rapid-fire related content (no sleep between requests)
        http.get(
            `${BASE_URL}/api/v1/clips/${clipId}/comments?limit=10`,
            {
                headers: { 'Accept': 'application/json' },
                tags: { 
                    page: 'clip_detail',
                    type: 'comments',
                    phase: currentPhase,
                },
                timeout: '30s',
            }
        );
        
        totalRequests.add(1);
        
        sleep(0.05);
    }
}

function stressMixedLoad() {
    // Quick mixed operations
    stressFeedBrowsing();
    sleep(0.1);
    stressClipViewing();
}

export function setup() {
    console.log('========================================');
    console.log('Starting STRESS TEST');
    console.log('========================================');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Authentication: ${AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);
    console.log(`Duration Multiplier: ${DURATION_MULTIPLIER}x`);
    console.log(`Chaos Mode: ${ENABLE_CHAOS ? 'Enabled' : 'Disabled'}`);
    console.log('');
    console.log('Test Phases:');
    console.log('  1. Baseline (50 users) - Establish normal performance');
    console.log('  2. Increased (100 users) - Approach capacity');
    console.log('  3. High Load (150 users) - At capacity');
    console.log('  4. Stress (200 users) - Beyond capacity');
    console.log('  5. Extreme (300 users) - Heavy stress');
    console.log('  6. Peak (400 users) - Maximum stress');
    console.log('  7. Recovery (150 users) - Validate recovery');
    console.log('  8. Normalize (50 users) - Return to baseline');
    console.log('');
    console.log('Exit Criteria:');
    console.log('  - Error rate > 25%');
    console.log('  - p99 response time > 5000ms');
    console.log('  - All stages complete');
    console.log('========================================');
    
    // Verify API is accessible
    const healthCheck = http.get(`${BASE_URL}/api/v1/health`);
    if (healthCheck.status !== 200) {
        throw new Error(`API health check failed with status ${healthCheck.status}`);
    }
    
    return {
        startTime: new Date(),
        baselineVUs: 50,
    };
}

export function teardown(data) {
    console.log('');
    console.log('========================================');
    console.log('STRESS TEST COMPLETED');
    console.log('========================================');
    console.log(`Started: ${data.startTime}`);
    console.log(`Completed: ${new Date()}`);
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Review error patterns during peak stress');
    console.log('  2. Analyze resource exhaustion events');
    console.log('  3. Validate recovery behavior');
    console.log('  4. Check for memory leaks or resource issues');
    console.log('  5. Document maximum sustainable load');
    console.log('========================================');
}
