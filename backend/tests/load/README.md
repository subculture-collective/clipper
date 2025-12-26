# Load Testing with K6

This directory contains K6 load testing scenarios for the Clipper API. These tests help establish performance baselines and identify bottlenecks under various load conditions.

**Test Types**:
- **Load Tests**: Standard performance testing with realistic user loads
- **Stress Tests**: Push system beyond capacity to find breaking points
- **Soak Tests**: Extended duration (24h) testing for memory leaks and stability

## Quick Links

- **[Stress & Soak Testing Guide](STRESS_SOAK_GUIDE.md)** - Comprehensive guide for stress and endurance testing
- **[Execution Guide](EXECUTION_GUIDE.md)** - Step-by-step test execution instructions
- **[Performance Summary](PERFORMANCE_SUMMARY.md)** - Performance targets and baselines
- **[Dashboard Guide](../../monitoring/dashboards/LOAD_TEST_DASHBOARD.md)** - Grafana dashboard documentation
- **[Baseline Management](baselines/README.md)** - Guide to baseline storage and regression detection

## New Features

### 🎨 HTML Report Generation
Generate beautiful, interactive HTML reports for your load tests:
```bash
# Generate HTML reports for all scenarios
make test-load-html

# Or generate for a specific scenario
./backend/tests/load/scripts/generate_html_report.sh feed_browsing
```

### 📊 Baseline Storage & Regression Detection
Capture and compare performance baselines across versions:
```bash
# Capture baseline for a version
make test-load-baseline-capture VERSION=v1.0.0

# Compare current performance against baseline
make test-load-baseline-compare VERSION=v1.0.0

# Compare against the latest baseline
make test-load-baseline-compare VERSION=current
```

Baselines are stored in `baselines/` organized by version, enabling:
- Automatic regression detection (>10% p95 latency increase)
- Performance trend tracking across releases
- SLO validation gates in CI/CD

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

### GitHub Actions Workflow

Load tests are fully integrated into CI/CD with a dedicated workflow:

**Workflow File**: `.github/workflows/load-tests.yml`

#### Available Test Types

- `all` - Run all standard load tests
- `feed` - Feed browsing test
- `clip` - Clip detail test
- `search` - Search functionality test
- `comments` - Comments test
- `auth` - Authentication test
- `submit` - Submission test
- `mixed` - Mixed behavior test (recommended)
- `stress-lite` - Stress test (5 min, suitable for CI)
- `soak-short` - Soak test (1 hour version)

#### Automated Nightly Runs

Load tests run automatically every night at 2 AM UTC. Results are available as artifacts in the GitHub Actions workflow runs.

#### Manual Trigger

You can manually trigger load tests from the GitHub Actions UI:

1. Go to **Actions** tab in GitHub
2. Select **Load Tests** workflow
3. Click **Run workflow**
4. Select test type (all, feed, clip, search, comments, auth, submit, mixed)
5. Click **Run workflow**

#### What the Workflow Does

1. **Sets up environment**: PostgreSQL, Redis, Go, K6
2. **Prepares data**: Runs migrations and seeds load test data
3. **Starts backend**: Launches API server
4. **Runs tests**: Executes selected load test scenarios
5. **Generates reports**: Creates comprehensive markdown and HTML reports
6. **Baseline comparison**: Compares results against stored baselines (if available)
7. **Regression detection**: Fails build if performance regressions detected
8. **Uploads artifacts**: Stores reports, metrics, and HTML visualizations

#### Accessing Results

**From GitHub Actions:**

1. Go to workflow run in Actions tab
2. View summary in the run page
3. Download artifacts:
   - `load-test-reports-*` - Markdown reports, HTML visualizations, and detailed outputs
   - `load-test-metrics-*` - JSON metrics for trend analysis
   - `load-test-baselines-*` - Baseline files (365-day retention)

**In Grafana Dashboard:**

- View real-time metrics at `https://clpr.tv/grafana`
- Dashboard: "K6 Load Test Trends" (UID: `k6-load-test-trends`)
- See `monitoring/dashboards/LOAD_TEST_DASHBOARD.md` for details

#### Baseline Management in CI

The CI workflow automatically:
- Stores baseline files as artifacts (retained for 365 days)
- Compares test results against baselines when available
- Fails the build if performance regressions exceed thresholds
- Generates comparison reports showing changes

To update baselines after performance improvements:
1. Run tests locally and capture new baseline
2. Commit baseline files to `backend/tests/load/baselines/`
3. CI will use new baselines for future comparisons

#### Example: Adding to Your Workflow

To add load tests to your own workflow:

```yaml
- name: Run Load Tests
  run: |
    make docker-up
    make migrate-up
    make migrate-seed-load-test
    make backend-dev &
    sleep 10
    make test-load-mixed
```

Or trigger the dedicated workflow:

```yaml
- name: Trigger Load Tests
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.actions.createWorkflowDispatch({
        owner: context.repo.owner,
        repo: context.repo.repo,
        workflow_id: 'load-tests.yml',
        ref: 'main',
        inputs: {
          test_type: 'all'
        }
      })
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

### Viewing Historical Trends

**GitHub Actions Artifacts:**

All nightly and manual load test runs store their results as artifacts:

1. Navigate to **Actions** → **Load Tests** in GitHub
2. Browse historical workflow runs
3. Download artifacts to compare results over time
4. Artifacts are retained for 90 days

**Grafana Dashboard:**

For real-time monitoring and trend visualization:

1. Access Grafana at `https://clpr.tv/grafana`
2. Open "K6 Load Test Trends" dashboard
3. View metrics:
   - Response time trends (p95, p99) over time
   - Error rates by scenario
   - Throughput patterns
   - Check success rates
4. Adjust time range to view historical data

See `monitoring/dashboards/LOAD_TEST_DASHBOARD.md` for dashboard details.

**Trend Analysis Script:**

For offline analysis of historical results:

```bash
# Download multiple test artifacts from GitHub Actions
# Extract JSON files to a directory
# Run the analysis script
./backend/tests/load/analyze_trends.sh ./path/to/json/files
```

The script will:
- Analyze multiple K6 JSON outputs
- Calculate statistics (average, min, max) for key metrics
- Show trends comparing earliest vs. latest results
- Identify performance improvements or regressions

Example output:
```
Response Time Statistics (ms):
  p95: Average: 45.2, Min: 38.1, Max: 52.3
  p99: Average: 89.5, Min: 76.2, Max: 98.1

p95 Response Time Change:
  ↓ Decreased by 7.2ms (-13.7%)
```

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

1. Follow the existing file structure in `scenarios/`
2. Use descriptive names for metrics
3. Set realistic thresholds
4. Document the scenario in this README
5. Update the Makefile with a new target
6. Consider CI/CD integration (duration, resources)

**For Stress/Soak Tests:**
- See [Stress & Soak Testing Guide](STRESS_SOAK_GUIDE.md)
- Use template from existing stress.js or soak.js
- Document expected behavior and exit criteria
- Include memory leak detection metrics
- Plan for extended monitoring

## Resources

- [K6 Documentation](https://k6.io/docs/) - Official K6 docs
- [K6 Examples](https://k6.io/docs/examples/) - Example test scripts
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/test-types/) - Test types and patterns
- [K6 Metrics](https://k6.io/docs/using-k6/metrics/) - Understanding metrics
- [Stress & Soak Testing Guide](STRESS_SOAK_GUIDE.md) - Comprehensive stress/soak guide
- [Quick Reference](STRESS_SOAK_QUICK_REFERENCE.md) - Commands and cheat sheet
- [Execution Guide](EXECUTION_GUIDE.md) - Step-by-step instructions
- [Performance Summary](PERFORMANCE_SUMMARY.md) - Performance baselines and targets
- [Load Test Dashboard](../../monitoring/dashboards/LOAD_TEST_DASHBOARD.md) - Grafana dashboard guide
