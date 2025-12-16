# Load Testing with K6

This directory contains K6 load testing scenarios for the Clipper API. These tests help establish performance baselines and identify bottlenecks under various load conditions.

## Prerequisites

Install K6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6

# Docker
docker pull grafana/k6:latest
```

See [K6 Installation Guide](https://k6.io/docs/getting-started/installation/) for more options.

## Quick Start

### 1. Set up test data

First, ensure your database is migrated and seeded with test data:

```bash
# Start Docker services
make docker-up

# Run migrations
make migrate-up

# Seed with load test data (includes 60+ clips, multiple users, votes, comments, etc.)
make migrate-seed-load-test
```

### 2. Start the backend server

```bash
make backend-dev
```

### 3. Run load tests

Run all load tests:

```bash
make test-load
```

Or run specific scenarios:

```bash
make test-load-feed          # Feed browsing
make test-load-clip          # Clip detail views
make test-load-search        # Search functionality
make test-load-comments      # Comments (read-only without auth)
make test-load-mixed         # Mixed user behavior (recommended)
```

## Quick Start: Generate Full Report

For a comprehensive load test report covering all scenarios:

```bash
# Ensure backend is running
make backend-dev

# In another terminal, generate report
cd backend/tests/load
./generate_report.sh
```

This will run all load test scenarios and generate a comprehensive report in `backend/tests/load/reports/`.

## Test Scenarios

### 1. Feed Browsing (`scenarios/feed_browsing.js`)

Tests feed endpoint performance with different sorting options (hot, new, top).

**Load Pattern:**
- Ramp up: 30s to 50 users, 1m to 100 users
- Sustain: 2m at 100 users
- Ramp down: 30s to 0 users

**Thresholds:**
- p95 response time: <100ms
- Error rate: <5%

**Run:**
```bash
make test-load-feed
# or
k6 run backend/tests/load/scenarios/feed_browsing.js
```

### 2. Clip Detail View (`scenarios/clip_detail.js`)

Tests individual clip viewing including related clips, comments, and analytics tracking.

**Load Pattern:**
- Ramp up: 30s to 20 users, 1m to 50 users
- Sustain: 2m at 50 users
- Ramp down: 30s to 0 users

**Thresholds:**
- Clip detail p95: <50ms
- Related clips p95: <75ms
- Comments p95: <50ms
- View tracking p95: <30ms

**Run:**
```bash
make test-load-clip
# or
k6 run backend/tests/load/scenarios/clip_detail.js
```

### 3. Search (`scenarios/search.js`)

Tests search functionality with various query types and filters.

**Load Pattern:**
- Ramp up: 30s to 15 users, 1m to 40 users
- Sustain: 2m at 40 users
- Ramp down: 30s to 0 users

**Thresholds:**
- Search p95: <100ms
- Suggestions p95: <50ms
- Error rate: <2%

**Run:**
```bash
make test-load-search
# or
k6 run backend/tests/load/scenarios/search.js
```

### 4. Comments (`scenarios/comments.js`)

Tests comment listing, creation, and voting.

**Load Pattern:**
- Ramp up: 30s to 10 users, 1m to 25 users
- Sustain: 2m at 25 users
- Ramp down: 30s to 0 users

**Thresholds:**
- List comments p95: <50ms
- Create comment p95: <100ms (requires auth)
- Vote on comment p95: <50ms (requires auth)

**Run (read-only):**
```bash
make test-load-comments
# or
k6 run backend/tests/load/scenarios/comments.js
```

**Run (with authentication):**
```bash
k6 run -e AUTH_TOKEN=your_jwt_token backend/tests/load/scenarios/comments.js
```

### 5. Authentication (`scenarios/authentication.js`)

Tests authentication workflow performance including user profile fetching, token refresh simulation, and logout operations.

**Load Pattern:**
- Ramp up: 30s to 5 users, 1m to 10 users, 2m to 20 users
- Sustain: 2m at 20 users (20 auth flows/minute)
- Ramp down: 30s to 0 users

**Thresholds:**
- User profile fetch p95: <50ms
- Token refresh p95: <100ms
- Logout p95: <30ms

**Run:**
```bash
make test-load-auth
# or
k6 run backend/tests/load/scenarios/authentication.js
```

**Run (with authentication):**
```bash
k6 run -e AUTH_TOKEN=your_jwt_token backend/tests/load/scenarios/authentication.js
```

### 6. Clip Submission (`scenarios/submit.js`)

Tests clip submission workflow (requires authentication).

**Load Pattern:**
- Ramp up: 30s to 5 users, 1m to 10 users
- Sustain: 2m at 10 users
- Ramp down: 30s to 0 users

**Thresholds:**
- Submit clip p95: <200ms
- List submissions p95: <50ms
- Submission stats p95: <30ms

**Run:**
```bash
k6 run -e AUTH_TOKEN=your_jwt_token backend/tests/load/scenarios/submit.js
# or
make test-load-submit AUTH_TOKEN=your_jwt_token
```

### 7. Mixed User Behavior (`scenarios/mixed_behavior.js`) **[Recommended]**

Simulates realistic user behavior with mixed activity patterns:
- 40% Casual browsers (feed browsing)
- 30% Active viewers (clip viewing + voting)
- 15% Searchers (search-focused)
- 15% Engaged users (comments + votes)

**Load Pattern:**
- Ramp up: 1m to 30 users, 3m to 75 users, 5m to 100 users
- Sustain: 5m at 100 users
- Ramp down: 2m to 50 users, 1m to 0 users

**Thresholds:**
- Overall p95: <100ms
- Feed p95: <75ms
- Clip detail p95: <100ms
- Search p95: <100ms
- Error rate: <2%

**Run:**
```bash
make test-load-mixed
# or
k6 run backend/tests/load/scenarios/mixed_behavior.js
```

## Environment Variables

Configure tests using environment variables:

```bash
# Base URL (default: http://localhost:8080)
k6 run -e BASE_URL=https://api.example.com scenario.js

# Authentication token (for authenticated requests)
k6 run -e AUTH_TOKEN=your_jwt_token scenario.js

# Combine multiple variables
k6 run -e BASE_URL=https://api.example.com -e AUTH_TOKEN=token scenario.js
```

## Performance Targets

Based on our testing, here are the performance targets:

| Endpoint Type | p95 Target | p99 Target | Notes |
|--------------|------------|------------|-------|
| Feed listing | <100ms | <150ms | Various sort options |
| Clip detail | <50ms | <100ms | Single clip metadata |
| Related clips | <75ms | <150ms | Algorithm-based |
| Comments list | <50ms | <100ms | Paginated |
| Search | <100ms | <200ms | Full-text + filters |
| Suggestions | <50ms | <100ms | Autocomplete |
| View tracking | <30ms | <75ms | Analytics |
| Create comment | <100ms | <200ms | Write operation |
| Vote | <50ms | <100ms | Write operation |
| Submit clip | <200ms | <500ms | External API call |

## Baseline Metrics

After running the initial load tests with seeded data, document your baseline metrics:

### Feed Browsing
- **Concurrent Users:** 100
- **Requests/Second:** ~33
- **p95 Response Time:** TBD
- **p99 Response Time:** TBD
- **Error Rate:** TBD

### Clip Detail
- **Concurrent Users:** 50
- **Requests/Second:** ~12
- **p95 Response Time:** TBD
- **p99 Response Time:** TBD
- **Error Rate:** TBD

### Search
- **Concurrent Users:** 40
- **Requests/Second:** ~13
- **p95 Response Time:** TBD
- **p99 Response Time:** TBD
- **Error Rate:** TBD

### Mixed Behavior
- **Concurrent Users:** 100
- **Requests/Second:** ~25
- **p95 Response Time:** TBD
- **p99 Response Time:** TBD
- **Error Rate:** TBD

**Note:** Fill in actual metrics after running tests against your environment.

## Understanding K6 Output

K6 provides detailed metrics after each test run:

```
checks.........................: 99.50% ✓ 5973  ✗ 30
data_received..................: 15 MB  86 kB/s
data_sent......................: 1.2 MB 6.9 kB/s
http_req_blocked...............: avg=1.45ms   min=1µs   med=4µs    max=247.12ms p(95)=6µs    p(99)=12µs
http_req_connecting............: avg=716µs    min=0s    med=0s     max=122.71ms p(95)=0s     p(99)=0s
http_req_duration..............: avg=44.66ms  min=2.1ms med=38.8ms max=456.32ms p(95)=91.5ms p(99)=142.8ms
http_req_failed................: 0.50%  ✓ 30    ✗ 5943
http_req_receiving.............: avg=101.71µs min=14µs  med=74µs   max=4.65ms   p(95)=193µs  p(99)=423µs
http_req_sending...............: avg=23.51µs  min=4µs   med=18µs   max=1.99ms   p(95)=44µs   p(99)=89µs
http_req_tls_handshaking.......: avg=0s       min=0s    med=0s     max=0s       p(95)=0s     p(99)=0s
http_req_waiting...............: avg=44.54ms  min=2.05ms med=38.7ms max=456.24ms p(95)=91.4ms p(99)=142.7ms
http_reqs......................: 5973   34.4/s
iteration_duration.............: avg=2.89s    min=1.01s med=2.49s  max=11.76s   p(95)=5.48s  p(99)=7.82s
iterations.....................: 2006   11.55/s
vus............................: 1      min=1   max=100
vus_max........................: 100    min=100 max=100
```

Key metrics to monitor:
- **http_req_duration p(95):** 95% of requests should be below threshold
- **http_req_failed:** Error rate percentage
- **http_reqs:** Total requests per second
- **checks:** Success rate of assertions

## CI/CD Integration

Add load tests to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Load Tests
  run: |
    make docker-up
    make migrate-up
    make migrate-seed-load-test
    make backend-dev &
    sleep 10
    make test-load-mixed
```

## Troubleshooting

### Test fails with connection errors

Ensure the backend server is running:
```bash
curl http://localhost:8080/health
```

### Authentication required errors

Some tests require authentication. Generate a JWT token:
```bash
# Use your auth endpoint or generate a test token
export AUTH_TOKEN="your_jwt_token"
k6 run -e AUTH_TOKEN=$AUTH_TOKEN scenario.js
```

### Database seed data missing

Re-run the seed script:
```bash
make migrate-seed-load-test
```

### K6 not installed

Install K6 following the prerequisites section above.

## Generating Reports

### Comprehensive Load Test Report

Generate a full report covering all load test scenarios:

```bash
# Start backend server
make backend-dev

# In another terminal, generate report
cd backend/tests/load
./generate_report.sh
```

The script will:
1. Execute all load test scenarios
2. Collect performance metrics
3. Generate a comprehensive Markdown report
4. Save detailed results for each scenario

Reports are saved to `backend/tests/load/reports/load_test_report_TIMESTAMP.md`

### Manual Report Generation

For individual test reports:

```bash
# Run test and save output
k6 run scenario.js > results.txt

# Generate custom report
# (see PROFILING_REPORT_TEMPLATE.md for structure)
```

## Advanced Usage

### Custom Load Patterns

Modify the `options.stages` in any test file:

```javascript
export const options = {
    stages: [
        { duration: '2m', target: 100 },   // Fast ramp-up
        { duration: '10m', target: 100 },  // Long sustain
        { duration: '1m', target: 0 },     // Fast ramp-down
    ],
};
```

### Cloud Testing

Run tests in K6 Cloud for distributed load testing:

```bash
k6 cloud backend/tests/load/scenarios/mixed_behavior.js
```

### Generating Reports

Output results to various formats:

```bash
# JSON output
k6 run --out json=results.json scenario.js

# CSV output
k6 run --out csv=results.csv scenario.js

# InfluxDB (for Grafana dashboards)
k6 run --out influxdb=http://localhost:8086/k6 scenario.js
```

## Contributing

When adding new load test scenarios:

1. Follow the existing file structure
2. Use descriptive names for metrics
3. Set realistic thresholds
4. Document the scenario in this README
5. Update the Makefile with a new target

## Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [K6 Metrics](https://k6.io/docs/using-k6/metrics/)
