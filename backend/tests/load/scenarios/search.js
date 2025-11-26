/**
 * K6 Load Test: Search Scenario
 * 
 * Tests search functionality performance including:
 * - Basic keyword search
 * - Tag filtering
 * - Game filtering
 * - Search suggestions
 * - Pagination
 * 
 * Target: Search response time <100ms (p95)
 * 
 * Run with: k6 run backend/tests/load/scenarios/search.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const searchLoadTime = new Trend('search_load_time');
const suggestionsLoadTime = new Trend('suggestions_load_time');
const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 15 },  // Ramp up to 15 users
        { duration: '1m', target: 40 },   // Ramp up to 40 users
        { duration: '2m', target: 40 },   // Stay at 40 users
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        'http_req_duration{endpoint:search}': ['p(95)<100', 'p(99)<200'],
        'http_req_duration{endpoint:suggestions}': ['p(95)<50', 'p(99)<100'],
        'errors': ['rate<0.02'], // Error rate should be below 2%
        'http_req_failed': ['rate<0.02'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Search queries (varied complexity)
const searchQueries = [
    'clutch',
    'funny',
    'epic fail',
    'insane',
    'speedrun',
    'valorant',
    'cs2',
    'league',
    'amazing play',
    'highlight',
    'tournament',
    'pro',
    'best',
    'moment',
    'rage',
];

// Tag filters
const tags = [
    'funny',
    'epic',
    'fail',
    'highlight',
    'clutch',
    'skill',
];

// Game names for filtering
const games = [
    'Valorant',
    'Counter-Strike 2',
    'League of Legends',
    'Minecraft',
    'Fortnite',
];

export default function () {
    const scenario = Math.random();
    
    if (scenario < 0.5) {
        // Basic search query (50% of requests)
        performBasicSearch();
    } else if (scenario < 0.75) {
        // Search with tag filter (25% of requests)
        performTagSearch();
    } else if (scenario < 0.9) {
        // Search with game filter (15% of requests)
        performGameSearch();
    } else {
        // Get search suggestions (10% of requests)
        performSuggestions();
    }
    
    // Simulate user typing and thinking
    sleep(Math.random() * 3 + 1);
}

function performBasicSearch() {
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    const limit = 25;
    const page = Math.floor(Math.random() * 3) + 1; // Pages 1-3
    
    const response = http.get(
        `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { endpoint: 'search', type: 'basic' },
        }
    );
    
    totalRequests.add(1);
    searchLoadTime.add(response.timings.duration);
    
    const success = check(response, {
        'search status is 200': (r) => r.status === 200,
        'search response time < 100ms': (r) => r.timings.duration < 100,
        'search response time < 50ms': (r) => r.timings.duration < 50,
        'has results': (r) => {
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

function performTagSearch() {
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    const tag = tags[Math.floor(Math.random() * tags.length)];
    const limit = 20;
    
    const response = http.get(
        `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&tags=${tag}&limit=${limit}`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { endpoint: 'search', type: 'tag_filter' },
        }
    );
    
    totalRequests.add(1);
    searchLoadTime.add(response.timings.duration);
    
    const success = check(response, {
        'tag search status is 200': (r) => r.status === 200,
        'tag search response time < 100ms': (r) => r.timings.duration < 100,
        'has results': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

function performGameSearch() {
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    const game = games[Math.floor(Math.random() * games.length)];
    const limit = 20;
    
    const response = http.get(
        `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&game=${encodeURIComponent(game)}&limit=${limit}`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { endpoint: 'search', type: 'game_filter' },
        }
    );
    
    totalRequests.add(1);
    searchLoadTime.add(response.timings.duration);
    
    const success = check(response, {
        'game search status is 200': (r) => r.status === 200,
        'game search response time < 100ms': (r) => r.timings.duration < 100,
        'has results': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
            } catch (e) {
                return false;
            }
        },
    });
    
    if (!success) {
        errorRate.add(1);
    }
}

function performSuggestions() {
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    const prefix = query.substring(0, Math.floor(query.length * 0.6)); // Partial query
    
    const response = http.get(
        `${BASE_URL}/api/v1/search/suggestions?q=${encodeURIComponent(prefix)}&limit=10`,
        {
            headers: { 'Accept': 'application/json' },
            tags: { endpoint: 'suggestions' },
        }
    );
    
    totalRequests.add(1);
    suggestionsLoadTime.add(response.timings.duration);
    
    const success = check(response, {
        'suggestions status is 200': (r) => r.status === 200,
        'suggestions response time < 50ms': (r) => r.timings.duration < 50,
        'has suggestions': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && Array.isArray(body.data);
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
    console.log('Starting search load test');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Testing ${searchQueries.length} different queries`);
}

export function teardown(data) {
    console.log('Search load test completed');
}
