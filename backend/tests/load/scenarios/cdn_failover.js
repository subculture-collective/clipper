/**
 * K6 Load Test: CDN Failover Scenario
 * 
 * Tests CDN system behavior under failures:
 * - Simulates CDN degradation/unavailability (5xx, DNS failure, timeout)
 * - Validates graceful fallback to origin for assets and HLS
 * - Monitors failover metrics and alerting thresholds
 * - Verifies response headers during failover
 * - Tests system stability during sustained failover
 * - Validates retry/backoff behavior
 * - Confirms no request storms are generated
 * 
 * This test requires backend configuration to inject CDN failures.
 * Set CDN_FAILOVER_MODE=true to enable failover testing.
 * 
 * Run with: k6 run backend/tests/load/scenarios/cdn_failover.js
 * 
 * Related: subculture-collective/clipper#689 (Watch Parties), #694 (Chat/WebSocket)
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const assetLoadTime = new Trend('asset_load_time');
const hlsLoadTime = new Trend('hls_load_time');
const fallbackRate = new Rate('fallback_rate');
const failoverLatency = new Trend('failover_latency');
const totalRequests = new Counter('total_requests');
const failoverCount = new Counter('failover_count');
const cdnFailoverEvents = new Counter('cdn_failover_events');
const requestStormRate = new Rate('request_storm_rate');
const retryCount = new Counter('retry_count');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Warm up
        { duration: '2m', target: 30 },   // Ramp up to 30 users
        { duration: '5m', target: 30 },   // Sustained load during failover
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        // During failover, we expect higher latency but system should remain stable
        'http_req_duration{endpoint:asset}': ['p(95)<1000', 'p(99)<2000'],
        'http_req_duration{endpoint:hls_playlist}': ['p(95)<1000', 'p(99)<2000'],
        'http_req_duration{endpoint:hls_segment}': ['p(95)<500', 'p(99)<1000'],
        // In this failover test scenario, we EXPECT high fallback rates when CDN fails
        'fallback_rate': ['rate>0.7'], // Most requests should fall back when CDN is down
        'errors': ['rate<0.05'], // Error rate should be below 5% during failover
        'http_req_failed': ['rate<0.05'], // Overall failure rate < 5%
        'request_storm_rate': ['rate<0.01'], // Should not generate request storms (< 1%)
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const FAILOVER_MODE = __ENV.CDN_FAILOVER_MODE === 'true';

// Test clip IDs (would be seeded in actual test environment)
const testClipIds = [
    'clip-001',
    'clip-002',
    'clip-003',
    'clip-004',
    'clip-005',
];

// Asset types to test
const assetTypes = [
    'thumbnail',
    'image',
    'avatar',
];

export default function () {
    const scenario = Math.random();
    
    if (scenario < 0.4) {
        // Static asset requests (40% of traffic)
        testStaticAssetFailover();
    } else if (scenario < 0.7) {
        // HLS playlist requests (30% of traffic)
        testHLSPlaylistFailover();
    } else if (scenario < 0.95) {
        // HLS segment requests (25% of traffic)
        testHLSSegmentFailover();
    } else {
        // Mixed asset requests (5% of traffic)
        testMixedAssets();
    }
    
    // Simulate user thinking time
    sleep(Math.random() * 3 + 1);
}

function testStaticAssetFailover() {
    const clipId = testClipIds[Math.floor(Math.random() * testClipIds.length)];
    const assetType = assetTypes[Math.floor(Math.random() * assetTypes.length)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/clips/${clipId}/${assetType}`,
        {
            headers: { 
                'Accept': 'image/jpeg,image/png,image/webp',
                'Cache-Control': 'no-cache', // Force fresh requests to test CDN
            },
            tags: { endpoint: 'asset', type: assetType },
        }
    );
    
    totalRequests.add(1);
    assetLoadTime.add(response.timings.duration);
    
    // Check for CDN failover headers
    const failoverHeader = response.headers['X-CDN-Failover'];
    const failoverReason = response.headers['X-CDN-Failover-Reason'];
    const failoverService = response.headers['X-CDN-Failover-Service'];
    
    if (failoverHeader === 'true') {
        fallbackRate.add(1);
        failoverCount.add(1);
        cdnFailoverEvents.add(1);
        failoverLatency.add(response.timings.duration);
        
        // Verify failover headers
        check(response, {
            'failover reason header present': (r) => failoverReason !== undefined,
            'failover service is origin': (r) => failoverService === 'origin',
        });
    } else {
        fallbackRate.add(0);
    }
    
    // Check for retry attempts
    const retryAttempts = response.headers['X-Retry-Count'];
    if (retryAttempts) {
        retryCount.add(parseInt(retryAttempts, 10));
        
        // Verify retries are reasonable (not a request storm)
        const isStorm = parseInt(retryAttempts, 10) > 3;
        requestStormRate.add(isStorm ? 1 : 0);
    }
    
    const success = check(response, {
        'asset status is 200': (r) => r.status === 200,
        'asset load time < 1s': (r) => r.timings.duration < 1000,
        'asset has content': (r) => r.body && r.body.length > 0,
        'cache-control header present': (r) => r.headers['Cache-Control'] !== undefined,
    });
    
    if (!success) {
        errorRate.add(1);
    } else {
        errorRate.add(0);
    }
}

function testHLSPlaylistFailover() {
    const clipId = testClipIds[Math.floor(Math.random() * testClipIds.length)];
    
    const response = http.get(
        `${BASE_URL}/api/v1/video/${clipId}/master.m3u8`,
        {
            headers: { 
                'Accept': 'application/vnd.apple.mpegurl',
            },
            tags: { endpoint: 'hls_playlist' },
        }
    );
    
    totalRequests.add(1);
    hlsLoadTime.add(response.timings.duration);
    
    // Check for CDN failover
    if (response.headers['X-CDN-Failover'] === 'true') {
        fallbackRate.add(1);
        failoverCount.add(1);
        cdnFailoverEvents.add(1);
        failoverLatency.add(response.timings.duration);
    } else {
        fallbackRate.add(0);
    }
    
    // Check for retry attempts
    const retryAttempts = response.headers['X-Retry-Count'];
    if (retryAttempts) {
        retryCount.add(parseInt(retryAttempts, 10));
        const isStorm = parseInt(retryAttempts, 10) > 3;
        requestStormRate.add(isStorm ? 1 : 0);
    }
    
    const success = check(response, {
        'HLS playlist status is 200': (r) => r.status === 200,
        'HLS playlist load time < 1s': (r) => r.timings.duration < 1000,
        'HLS content type correct': (r) => r.headers['Content-Type'] && 
            r.headers['Content-Type'].includes('mpegurl'),
        'HLS playlist has content': (r) => r.body && r.body.includes('#EXTM3U'),
    });
    
    if (!success) {
        errorRate.add(1);
    } else {
        errorRate.add(0);
    }
}

function testHLSSegmentFailover() {
    const clipId = testClipIds[Math.floor(Math.random() * testClipIds.length)];
    const quality = ['480p', '720p', '1080p'][Math.floor(Math.random() * 3)];
    const segmentNum = Math.floor(Math.random() * 10); // 0-9
    
    const response = http.get(
        `${BASE_URL}/api/v1/video/${clipId}/${quality}/segment-${segmentNum}.ts`,
        {
            headers: { 
                'Accept': 'video/MP2T',
            },
            tags: { endpoint: 'hls_segment', quality: quality },
        }
    );
    
    totalRequests.add(1);
    hlsLoadTime.add(response.timings.duration);
    
    // Check for CDN failover
    if (response.headers['X-CDN-Failover'] === 'true') {
        fallbackRate.add(1);
        failoverCount.add(1);
        cdnFailoverEvents.add(1);
        failoverLatency.add(response.timings.duration);
    } else {
        fallbackRate.add(0);
    }
    
    // Check for retry attempts
    const retryAttempts = response.headers['X-Retry-Count'];
    if (retryAttempts) {
        retryCount.add(parseInt(retryAttempts, 10));
        const isStorm = parseInt(retryAttempts, 10) > 3;
        requestStormRate.add(isStorm ? 1 : 0);
    }
    
    const success = check(response, {
        'HLS segment status is 200': (r) => r.status === 200,
        'HLS segment load time < 500ms': (r) => r.timings.duration < 500,
        'HLS segment content type correct': (r) => r.headers['Content-Type'] && 
            r.headers['Content-Type'].includes('MP2T'),
        'HLS segment has binary content': (r) => r.body && r.body.length > 0,
        'cache headers appropriate for segments': (r) => {
            const cacheControl = r.headers['Cache-Control'];
            // Segments should be cached longer than playlists
            return cacheControl && cacheControl.includes('max-age');
        },
    });
    
    if (!success) {
        errorRate.add(1);
    } else {
        errorRate.add(0);
    }
}

function testMixedAssets() {
    const clipId = testClipIds[Math.floor(Math.random() * testClipIds.length)];
    
    // Test multiple asset types in quick succession
    // This simulates a player loading all assets for a clip
    const assets = [
        { url: `/api/v1/clips/${clipId}/thumbnail`, type: 'thumbnail' },
        { url: `/api/v1/video/${clipId}/master.m3u8`, type: 'playlist' },
        { url: `/api/v1/video/${clipId}/720p/segment-0.ts`, type: 'segment' },
    ];
    
    assets.forEach((asset) => {
        const response = http.get(
            `${BASE_URL}${asset.url}`,
            {
                tags: { endpoint: 'mixed', type: asset.type },
            }
        );
        
        totalRequests.add(1);
        
        if (response.headers['X-CDN-Failover'] === 'true') {
            fallbackRate.add(1);
            failoverCount.add(1);
            cdnFailoverEvents.add(1);
        } else {
            fallbackRate.add(0);
        }
        
        // Brief pause between requests (realistic player behavior)
        sleep(0.1);
    });
}

export function setup() {
    console.log('Starting CDN failover load test');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Failover mode: ${FAILOVER_MODE}`);
    if (!FAILOVER_MODE) {
        console.warn('WARNING: CDN_FAILOVER_MODE not enabled. Set CDN_FAILOVER_MODE=true to test failover.');
    }
    console.log(`Testing ${testClipIds.length} different clips`);
    console.log(`Testing asset types: ${assetTypes.join(', ')}`);
}

export function teardown(data) {
    console.log('CDN failover load test completed');
    console.log(`Total requests: ${totalRequests.count}`);
    console.log(`Total failovers: ${failoverCount.count}`);
    console.log(`CDN failover events: ${cdnFailoverEvents.count}`);
    console.log(`Total retries: ${retryCount.count}`);
    
    // Calculate and log key metrics
    const failoverRate = failoverCount.count / totalRequests.count;
    console.log(`Failover rate: ${(failoverRate * 100).toFixed(2)}%`);
    
    // Validate alert thresholds
    if (failoverRate > 0.8 && FAILOVER_MODE) {
        console.log('✅ High failover rate detected - CDN failover working as expected');
    } else if (failoverRate > 0.05 && !FAILOVER_MODE) {
        console.warn('⚠️  Unexpected failover rate without FAILOVER_MODE enabled');
    }
}
