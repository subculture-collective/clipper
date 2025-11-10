/**
 * K6 Load Test Template
 * 
 * Use this template to create custom load test scenarios for Clipper API.
 * 
 * Run with: k6 run backend/tests/load/scenarios/your_scenario.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics - Define what you want to measure
const errorRate = new Rate('errors');
const customMetric = new Trend('custom_metric_name');
const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
    // Define load pattern stages
    stages: [
        { duration: '30s', target: 10 },  // Ramp up to 10 users over 30 seconds
        { duration: '1m', target: 20 },   // Ramp up to 20 users over 1 minute
        { duration: '2m', target: 20 },   // Maintain 20 users for 2 minutes
        { duration: '30s', target: 0 },   // Ramp down to 0 users over 30 seconds
    ],
    
    // Define performance thresholds
    thresholds: {
        // Overall HTTP request duration
        'http_req_duration': ['p(95)<100', 'p(99)<200'],
        
        // Tagged HTTP request duration (see tags below)
        'http_req_duration{endpoint:your_endpoint}': ['p(95)<50'],
        
        // Error rate threshold
        'errors': ['rate<0.01'], // Less than 1% errors
        
        // Failed HTTP requests
        'http_req_failed': ['rate<0.01'],
    },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Test data - Replace with your test data
const testData = [
    'data1',
    'data2',
    'data3',
];

/**
 * Main test function - Runs for each virtual user iteration
 */
export default function () {
    // Select random test data
    const data = testData[Math.floor(Math.random() * testData.length)];
    
    // Example: GET request
    let response = http.get(
        `${BASE_URL}/api/v1/your-endpoint/${data}`,
        {
            headers: {
                'Accept': 'application/json',
                // Add auth if needed
                // 'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: {
                // Tags help organize metrics
                endpoint: 'your_endpoint',
                type: 'read',
            },
        }
    );
    
    // Track metrics
    totalRequests.add(1);
    customMetric.add(response.timings.duration);
    
    // Check response
    const success = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time is acceptable': (r) => r.timings.duration < 100,
        'has valid response body': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true && body.data !== null;
            } catch (e) {
                return false;
            }
        },
    });
    
    // Track errors
    if (!success) {
        errorRate.add(1);
    }
    
    // Example: POST request
    const payload = JSON.stringify({
        key: 'value',
    });
    
    response = http.post(
        `${BASE_URL}/api/v1/your-endpoint`,
        payload,
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                // 'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            tags: {
                endpoint: 'your_endpoint',
                type: 'write',
            },
        }
    );
    
    totalRequests.add(1);
    
    check(response, {
        'POST status is 201': (r) => r.status === 201,
    }) || errorRate.add(1);
    
    // Simulate user "think time" - time between actions
    sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

/**
 * Setup function - Runs once before the test starts
 * Use this to prepare test data or verify prerequisites
 */
export function setup() {
    console.log('Starting custom load test');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Auth: ${AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);
    
    // Optional: Verify API is accessible
    const response = http.get(`${BASE_URL}/health`);
    if (response.status !== 200) {
        throw new Error('API health check failed');
    }
    
    // Return data that will be passed to default() and teardown()
    return {
        startTime: new Date(),
    };
}

/**
 * Teardown function - Runs once after the test completes
 * Use this for cleanup or final reporting
 */
export function teardown(data) {
    console.log('Custom load test completed');
    console.log(`Started at: ${data.startTime}`);
    console.log(`Completed at: ${new Date()}`);
}

/**
 * Helper Functions (Examples - uncomment and use as needed)
 */

// Example: Random selection from array
// function randomChoice(array) {
//     return array[Math.floor(Math.random() * array.length)];
// }

// Example: Random integer between min and max (inclusive)
// function randomInt(min, max) {
//     return Math.floor(Math.random() * (max - min + 1)) + min;
// }

// Example: Weighted random selection
// function weightedRandomChoice(choices, weights) {
//     const totalWeight = weights.reduce((a, b) => a + b, 0);
//     let random = Math.random() * totalWeight;
//     
//     for (let i = 0; i < choices.length; i++) {
//         if (random < weights[i]) {
//             return choices[i];
//         }
//         random -= weights[i];
//     }
//     
//     return choices[choices.length - 1];
// }
