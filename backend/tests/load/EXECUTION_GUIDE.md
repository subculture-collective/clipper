# Load Testing Execution Guide

## Quick Start

This guide provides step-by-step instructions for executing the complete load and performance testing suite for Clipper.

---

## Prerequisites

### 1. Install k6

**macOS:**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6:latest
```

### 2. Start the Backend Services

```bash
# Terminal 1: Start Docker services (PostgreSQL + Redis)
make docker-up

# Wait for services to be ready (~10 seconds)

# Run database migrations
make migrate-up

# Seed database with load test data
make migrate-seed-load-test
```

### 3. Start the Backend Server

```bash
# Terminal 2: Start the backend API
make backend-dev
```

The backend should now be running at `http://localhost:8080`

---

## Execution Options

### Option 1: Generate Comprehensive Report (Recommended)

Run all load test scenarios and generate a detailed report:

```bash
# Terminal 3
make test-load-report
```

**Output:**
- Console summary of all test results
- Detailed report saved to `backend/tests/load/reports/load_test_report_TIMESTAMP.md`
- Individual test outputs for analysis

**Time:** ~15-20 minutes for all scenarios

---

### Option 2: Run Individual Test Scenarios

Execute specific load tests:

```bash
# Homepage browsing (50 concurrent users)
make test-load-feed

# Search queries (100 queries/second)
make test-load-search

# Authentication flows (20 logins/minute)
make test-load-auth

# Submission creation (10 submissions/minute)
# Requires authentication token
make test-load-submit AUTH_TOKEN=your_token

# Comments testing
make test-load-comments

# Clip detail viewing
make test-load-clip

# Mixed realistic user behavior (recommended for overall performance)
make test-load-mixed
```

---

### Option 3: Run All Tests Sequentially

```bash
make test-load
```

Note: This runs all scenarios but doesn't generate a consolidated report.

---

## Authentication Token (Optional)

Some tests can run in authenticated mode for more comprehensive coverage:

### Generate a Token

1. **Via API:**
   ```bash
   # Start the backend and navigate to the auth flow
   # Login via Twitch OAuth
   # Extract JWT token from response/cookies
   ```

2. **For Testing:**
   ```bash
   export AUTH_TOKEN="your_jwt_token_here"
   
   # Run authenticated tests
   k6 run -e AUTH_TOKEN=$AUTH_TOKEN backend/tests/load/scenarios/submit.js
   k6 run -e AUTH_TOKEN=$AUTH_TOKEN backend/tests/load/scenarios/authentication.js
   ```

---

## Expected Results

### Performance Targets

All tests validate against these thresholds:

| Scenario | Target p95 | Target p99 | Error Rate |
|----------|-----------|-----------|------------|
| Feed browsing | <100ms | <200ms | <5% |
| Clip detail | <50ms | <100ms | <5% |
| Search | <100ms | <200ms | <2% |
| Authentication | <50ms | <100ms | <5% |
| Submissions | <200ms | <500ms | <5% |
| Comments | <50ms | <100ms | <5% |
| Mixed behavior | <100ms | <200ms | <2% |

### What Success Looks Like

```
✓ checks.........................: 99.50% ✓ 5973  ✗ 30
✓ http_req_duration..............: avg=44.66ms  p(95)=91.5ms p(99)=142.8ms
✓ http_req_failed................: 0.50%  ✓ 30    ✗ 5943
✓ http_reqs......................: 5973   34.4/s
```

---

## Troubleshooting

### Backend Not Responding

```bash
# Check if backend is running
curl http://localhost:8080/health

# If not, restart backend
make backend-dev
```

### Database Connection Issues

```bash
# Restart Docker services
make docker-down
make docker-up

# Re-run migrations
make migrate-up
make migrate-seed-load-test
```

### Port Already in Use

```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>
```

### Tests Timing Out

- Increase timeout in test configuration
- Check database has been seeded: `make migrate-seed-load-test`
- Verify no other resource-intensive processes are running

---

## Interpreting Results

### Key Metrics

1. **http_req_duration (p95)**: 95% of requests completed within this time
2. **http_req_failed**: Percentage of failed requests
3. **checks**: Percentage of assertions that passed
4. **http_reqs**: Total requests per second

### Red Flags

- ⚠️ p95 > 200ms: Performance below target
- ⚠️ Error rate > 2%: System stability issues
- ⚠️ Checks < 95%: Functional issues detected

### What to Do If Tests Fail

1. **High Latency:**
   - Review database query performance
   - Check for N+1 query patterns
   - Verify indexes are in place (migration 000020)
   - Monitor CPU and memory usage

2. **High Error Rate:**
   - Check backend logs for errors
   - Verify database connections aren't exhausted
   - Review rate limiting configuration

3. **Failed Checks:**
   - Review specific check failures in output
   - Verify API responses match expected format
   - Check for breaking changes in API

---

## Advanced Usage

### Custom Load Levels

Modify test files to adjust load:

```javascript
// In any scenario file
export const options = {
    stages: [
        { duration: '1m', target: 200 },   // Higher load
        { duration: '5m', target: 200 },   // Longer duration
        { duration: '1m', target: 0 },
    ],
};
```

### Output to Different Formats

```bash
# JSON output
k6 run --out json=results.json scenario.js

# CSV output
k6 run --out csv=results.csv scenario.js

# InfluxDB (for Grafana dashboards)
k6 run --out influxdb=http://localhost:8086/k6 scenario.js
```

### Cloud Testing

For distributed load testing:

```bash
k6 cloud backend/tests/load/scenarios/mixed_behavior.js
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Tests

on:
  workflow_dispatch:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Start services
        run: |
          make docker-up
          make migrate-up
          make migrate-seed-load-test
      
      - name: Start backend
        run: make backend-dev &
        
      - name: Wait for backend
        run: sleep 10
      
      - name: Run load tests
        run: make test-load-report
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: load-test-report
          path: backend/tests/load/reports/
```

---

## Next Steps After Testing

### 1. Review Results

- Check generated report in `backend/tests/load/reports/`
- Identify performance bottlenecks
- Document any issues found

### 2. Implement Optimizations

Based on findings:
- Apply database optimizations (see `PERFORMANCE_SUMMARY.md`)
- Implement N+1 query fixes
- Optimize caching strategies

### 3. Re-test

After optimizations:
```bash
make test-load-report
```

Compare results to baseline.

### 4. Production Monitoring

Set up monitoring:
- Prometheus metrics at `/debug/metrics`
- Alerts for p95 > thresholds
- Error rate monitoring

---

## Support and Resources

- **Load Test README**: `backend/tests/load/README.md`
- **Implementation Report**: `backend/tests/load/LOAD_TEST_REPORT.md`
- **Performance Summary**: `backend/tests/load/PERFORMANCE_SUMMARY.md`
- **K6 Documentation**: https://k6.io/docs/

---

## Summary Checklist

Before running tests:
- [ ] k6 installed
- [ ] Docker services running (`make docker-up`)
- [ ] Database migrated (`make migrate-up`)
- [ ] Test data seeded (`make migrate-seed-load-test`)
- [ ] Backend running (`make backend-dev`)

To execute:
- [ ] Run: `make test-load-report`
- [ ] Review: `backend/tests/load/reports/load_test_report_*.md`
- [ ] Document: Any issues or bottlenecks found

---

**Last Updated**: 2024-12-16  
**Status**: Ready for execution
