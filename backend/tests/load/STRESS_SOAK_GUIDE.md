# Stress & Soak Testing Guide

## Overview

This guide covers stress testing and soak testing (endurance testing) for the Clipper API. These tests complement regular load testing by pushing the system beyond normal capacity and running for extended periods to identify issues that only appear under extreme conditions or over time.

## Table of Contents

- [Stress Testing](#stress-testing)
- [Soak Testing](#soak-testing)
- [Prerequisites](#prerequisites)
- [Running Tests](#running-tests)
- [Monitoring & Analysis](#monitoring--analysis)
- [Memory Leak Detection](#memory-leak-detection)
- [Recovery Behavior](#recovery-behavior)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Stress Testing

### Purpose

Stress tests push the system **beyond its normal operating capacity** to:

- Identify maximum sustainable load (breaking point)
- Observe system behavior under resource exhaustion
- Validate error handling under extreme conditions
- Test recovery and backoff mechanisms
- Identify resource leaks that only appear under stress

### Test Characteristics

**File**: `backend/tests/load/scenarios/stress.js`

**Load Pattern**:
```
Phase 1: Baseline (50 users, 2 min)      - Establish normal performance
Phase 2: Increased (100 users, 2 min)    - Approach capacity
Phase 3: High (150 users, 3 min)         - At capacity
Phase 4: Stress (200 users, 3 min)       - Beyond capacity
Phase 5: Extreme (300 users, 3 min)      - Heavy stress
Phase 6: Peak (400 users, 2 min)         - Maximum stress
Phase 7: Recovery (150 users, 2 min)     - Validate recovery
Phase 8: Normalize (50 users, 2 min)     - Return to baseline
Phase 9: Cool down (0 users, 1 min)
```

**Total Duration**: ~20 minutes (full), ~5 minutes (lite)

**Exit Criteria**:
- Error rate exceeds 25%
- p99 response time exceeds 5000ms
- All stages complete

**Key Metrics**:
- `errors` - Overall error rate
- `degraded_responses` - Requests with degraded performance
- `resource_exhaustion_events` - 429, 503, 504 errors
- `recovery_successful` - Successful recovery after stress

### Running Stress Tests

**Full Stress Test** (~20 minutes):
```bash
# Start backend first
make backend-dev

# In another terminal
make test-stress
```

**Lite Version** (~5 minutes, for CI):
```bash
make test-stress-lite
```

**With Chaos Mode** (adds random delays):
```bash
k6 run -e ENABLE_CHAOS=true backend/tests/load/scenarios/stress.js
```

**Custom Duration**:
```bash
# 50% duration (10 minutes)
k6 run -e DURATION_MULTIPLIER=0.5 backend/tests/load/scenarios/stress.js
```

### Expected Behavior

**Normal Phases (50-150 users)**:
- ✅ Response times stable (<100ms p95)
- ✅ Error rate near 0%
- ✅ No resource exhaustion

**Stress Phases (200-300 users)**:
- ⚠️ Response times may increase (100-500ms p95)
- ⚠️ Some errors acceptable (1-5%)
- ⚠️ Occasional 429 rate limiting

**Peak Stress (400 users)**:
- 🚨 Response times degraded (500-2000ms p95)
- 🚨 Error rate may reach 10-25%
- 🚨 Resource exhaustion events (503, 504)

**Recovery Phase**:
- ✅ Response times should improve quickly
- ✅ Error rate should drop below 5%
- ✅ System should stabilize

### Stress Test Checklist

After running stress tests:

- [ ] Document maximum sustainable load (users before errors increase)
- [ ] Note breaking point (users when system fails)
- [ ] Verify recovery time (how long to stabilize after stress)
- [ ] Check for resource leaks (memory, connections, goroutines)
- [ ] Review error patterns (what fails first?)
- [ ] Validate rate limiting behavior
- [ ] Test circuit breakers and backoff mechanisms
- [ ] Document any configuration changes needed

---

## Soak Testing

### Purpose

Soak tests run for **extended periods** (default 24 hours) with moderate, realistic load to:

- Detect memory leaks and gradual resource accumulation
- Identify performance degradation over time
- Validate connection pool management
- Test cache effectiveness over long periods
- Find issues that only appear after hours of operation

### Test Characteristics

**File**: `backend/tests/load/scenarios/soak.js`

**Load Pattern**:
```
Phase 1: Ramp up (5 min)     - 0 → 37 → 75 users
Phase 2: Soak (24 hours)     - Constant 75 users
Phase 3: Ramp down (5 min)   - 75 → 0 users
```

**Total Duration**: 24 hours (full), 1 hour (short)

**Target Load**: 75 concurrent users (configurable)

**Key Metrics**:
- `page_load_time` - Response time trends over time
- `time_to_first_byte` - Backend processing time trends
- `memory_indicator` - Response size trends (leak detection)
- `slow_requests` - Requests taking 500-1000ms
- `very_slow_requests` - Requests taking >1000ms
- `degradation_events` - Performance degradation occurrences
- `connection_errors` - Connection pool issues
- `current_test_hour` - Test progress tracker

### Running Soak Tests

**24-Hour Soak Test** (production-like):
```bash
# Start backend with profiling enabled
make backend-dev

# In another terminal, run soak test
make test-soak

# Monitor in real-time (optional)
k6 run -e ENABLE_MONITORING=true backend/tests/load/scenarios/soak.js
```

**1-Hour Short Version** (for testing):
```bash
make test-soak-short
```

**Custom Duration**:
```bash
# 4-hour soak test
k6 run -e DURATION_HOURS=4 backend/tests/load/scenarios/soak.js

# 30-minute quick soak
k6 run -e DURATION_HOURS=0.5 backend/tests/load/scenarios/soak.js
```

**Custom Load**:
```bash
# 100 concurrent users
k6 run -e TARGET_VUS=100 backend/tests/load/scenarios/soak.js
```

**With Backend Profiling**:
```bash
# Terminal 1: Start backend
make backend-dev

# Terminal 2: Collect profiles during soak
cd backend/tests/load
./collect_profile.sh

# Terminal 3: Run soak test
make test-soak-short
```

### Expected Behavior

**Healthy System**:
- ✅ Response times remain stable throughout duration
- ✅ Error rate stays below 1%
- ✅ Memory usage is stable (no continuous growth)
- ✅ No increase in slow requests over time
- ✅ Connection pool remains healthy

**Warning Signs** (investigate if observed):
- ⚠️ Response times gradually increasing
- ⚠️ Memory usage trending upward
- ⚠️ Error rate slowly climbing
- ⚠️ Increase in timeout events
- ⚠️ Growing number of slow requests

**Critical Issues** (requires immediate action):
- 🚨 Response times doubling after several hours
- 🚨 Continuous memory growth (leak)
- 🚨 Connection pool exhaustion
- 🚨 Database connection leaks
- 🚨 Goroutine count continuously increasing

### Soak Test Checklist

During and after soak tests:

- [ ] Monitor memory usage every 2-4 hours
- [ ] Check CPU utilization trends
- [ ] Verify database connection pool stability
- [ ] Review cache hit rates over time
- [ ] Check for goroutine leaks (profile data)
- [ ] Analyze response time trends
- [ ] Review error patterns and frequency
- [ ] Check disk I/O and network patterns
- [ ] Document baseline vs. end-state metrics
- [ ] Generate memory profiles (heap, allocs)
- [ ] Review application logs for warnings
- [ ] Validate system recovery after test

---

## Prerequisites

### 1. Install K6

See [Load Testing README](README.md#prerequisites) for installation instructions.

### 2. System Requirements

**For Stress Tests**:
- Adequate CPU and memory on test machine
- Network bandwidth for high request rates
- Backend configured for high concurrency

**For Soak Tests**:
- Stable environment (avoid test on laptop that may sleep)
- Sufficient disk space for logs
- Monitoring/profiling tools available
- Consider cloud VM for 24-hour runs

### 3. Backend Configuration

**Recommended settings for stress/soak testing**:

```bash
# .env or environment variables
DB_MAX_CONNECTIONS=100
DB_MAX_IDLE_CONNECTIONS=25
DB_CONNECTION_MAX_LIFETIME=30m

REDIS_MAX_CONNECTIONS=50
REDIS_MAX_IDLE_CONNECTIONS=10

RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# Enable profiling endpoints
ENABLE_PPROF=true
```

### 4. Monitoring Setup

**Essential monitoring** (recommended for soak tests):
- Grafana dashboards (see `monitoring/dashboards/`)
- Prometheus metrics collection
- Application logs aggregation
- System metrics (CPU, memory, disk, network)

---

## Running Tests

### Quick Start: Stress Test

```bash
# 1. Start services
make docker-up
make migrate-up
make migrate-seed-load-test

# 2. Start backend
make backend-dev

# 3. Run stress test (in another terminal)
make test-stress-lite
```

### Quick Start: Soak Test (Short)

```bash
# 1. Start services (same as above)
make docker-up
make migrate-up
make migrate-seed-load-test

# 2. Start backend with profiling
make backend-dev

# 3. Run 1-hour soak test
make test-soak-short
```

### Production Soak Test Setup

For running 24-hour soak tests in staging:

```bash
# Use staging environment
export BASE_URL=https://staging-api.clpr.tv

# Optional: Use auth for write operations
export AUTH_TOKEN=your_staging_token

# Run full soak test
make test-soak

# Or with k6 directly for more control
k6 run \
  -e BASE_URL=https://staging-api.clpr.tv \
  -e DURATION_HOURS=24 \
  -e TARGET_VUS=75 \
  -e ENABLE_MONITORING=true \
  --out json=soak_results.json \
  backend/tests/load/scenarios/soak.js
```

---

## Monitoring & Analysis

### Real-Time Monitoring

**During stress tests**, watch for:
- Response time increases in each phase
- Error rate spikes during peak stress
- Resource exhaustion events (429, 503, 504)
- Recovery speed after load reduction

**During soak tests**, watch for:
- Memory usage trends (should be flat)
- Response time stability (should not increase)
- Error rate consistency (should stay low)
- Connection pool metrics

### Grafana Dashboards

See existing dashboards in `monitoring/dashboards/`:

**Load Test Trends Dashboard**:
- Response time trends by phase
- Error rates by scenario
- Throughput over time
- Virtual user patterns

**System Health Dashboard**:
- CPU and memory usage
- Database connection pool
- Redis cache performance
- Goroutine counts

### Command-Line Monitoring

**Watch K6 output**:
```bash
# K6 prints progress every 10 seconds
# Look for these metrics:
# - http_req_duration (p95, p99)
# - http_req_failed (error rate)
# - http_reqs (throughput)
# - checks (assertion success rate)
```

**Monitor backend resources**:
```bash
# CPU and memory
top -p $(pgrep -f clipper-backend)

# Goroutine count (during test)
curl http://localhost:8080/debug/pprof/goroutine?debug=1 | head -20

# Heap profile
curl http://localhost:8080/debug/pprof/heap > heap.profile
go tool pprof -http=:8081 heap.profile
```

**Monitor database connections**:
```bash
# PostgreSQL active connections
psql -U clipper -d clipper_load_test -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname='clipper_load_test';"
```

---

## Memory Leak Detection

### Overview

Memory leaks in Go services often manifest as:
- Gradual increase in heap size
- Growing goroutine count
- Accumulation of unclosed resources
- Increased GC pressure over time

### Detection Methods

#### 1. Heap Profiling During Soak

```bash
# Start soak test
make test-soak-short

# Collect heap profile every hour
# Hour 0 (baseline)
curl http://localhost:8080/debug/pprof/heap > heap_0h.profile

# Hour 1
curl http://localhost:8080/debug/pprof/heap > heap_1h.profile

# Compare profiles
go tool pprof -base heap_0h.profile heap_1h.profile
```

#### 2. Continuous Memory Monitoring

```bash
# Script to monitor memory every 5 minutes during soak
#!/bin/bash
while true; do
  timestamp=$(date +%Y%m%d_%H%M%S)
  curl -s http://localhost:8080/debug/pprof/heap > "profiles/heap_${timestamp}.profile"
  curl -s http://localhost:8080/api/v1/health > "profiles/health_${timestamp}.json"
  echo "Collected profile at $timestamp"
  sleep 300  # 5 minutes
done
```

#### 3. Goroutine Leak Detection

```bash
# Check goroutine count trend
curl http://localhost:8080/debug/pprof/goroutine?debug=1 | head -20

# Detailed goroutine profile
curl http://localhost:8080/debug/pprof/goroutine > goroutine.profile
go tool pprof -http=:8081 goroutine.profile
```

### Analysis

**Look for**:
- Functions with increasing memory allocations
- Goroutines that never terminate
- Unclosed database connections
- Growing caches without eviction
- HTTP clients with connection leaks

**Example analysis**:
```bash
# View top memory consumers
go tool pprof -top heap_24h.profile | head -20

# Compare baseline vs. end-state
go tool pprof -base heap_0h.profile -top heap_24h.profile

# Interactive analysis
go tool pprof -http=:8081 heap_24h.profile
```

### Automated Leak Detection

Add to monitoring dashboards:

**Alerts to configure**:
- Memory usage increased by >20% over 6 hours
- Goroutine count increased by >50% over 4 hours
- Database connection count continuously growing
- Response times degrading over time

---

## Recovery Behavior

### Testing Recovery

Stress tests automatically include recovery phases to validate:
- System can recover from overload
- Error rates return to normal
- Response times stabilize
- Resources are properly released

### Recovery Validation Checklist

After stress test recovery phase:

- [ ] Error rate returned to <1%
- [ ] Response times returned to baseline (±20%)
- [ ] No lingering resource exhaustion
- [ ] Database connections back to normal pool size
- [ ] Cache hit rates recovered
- [ ] Goroutine count returned to baseline
- [ ] No memory not released

### Manual Recovery Testing

```bash
# 1. Run stress test
make test-stress

# 2. After test, check system state
curl http://localhost:8080/api/v1/health
curl http://localhost:8080/debug/pprof/goroutine?debug=1 | head

# 3. Run light load to verify recovery
k6 run --vus 10 --duration 2m backend/tests/load/scenarios/feed_browsing.js

# 4. Compare metrics to pre-stress baseline
```

---

## CI/CD Integration

### Nightly Stress Tests

The stress-lite version is suitable for CI/CD:

**GitHub Actions** (example):

```yaml
# .github/workflows/load-tests.yml
stress-lite:
  name: Stress Test (Lite)
  runs-on: ubuntu-latest
  # ... service setup ...
  
  steps:
    # ... checkout, setup ...
    
    - name: Run stress test
      run: make test-stress-lite
      
    - name: Check thresholds
      run: |
        # Fail if error rate too high
        # K6 will exit with non-zero if thresholds fail
```

### Scheduled Soak Tests

For staging environment soak tests:

```yaml
# .github/workflows/soak-tests.yml
name: Soak Tests (Staging)

on:
  schedule:
    # Run weekly on Saturday at 00:00 UTC
    - cron: '0 0 * * 6'
  workflow_dispatch:
    inputs:
      duration_hours:
        description: 'Test duration in hours'
        default: '24'

jobs:
  soak:
    name: 24h Soak Test
    runs-on: self-hosted  # Use self-hosted runner for long tests
    
    steps:
      - name: Run soak test
        env:
          BASE_URL: https://staging-api.clpr.tv
          DURATION_HOURS: ${{ github.event.inputs.duration_hours || '24' }}
        run: |
          k6 run \
            -e BASE_URL=$BASE_URL \
            -e DURATION_HOURS=$DURATION_HOURS \
            --out json=soak_results.json \
            backend/tests/load/scenarios/soak.js
      
      - name: Analyze results
        run: |
          # Check for memory leaks, degradation, etc.
          ./backend/tests/load/analyze_soak_results.sh
```

### Integration with Load Tests Workflow

Update existing `.github/workflows/load-tests.yml`:

```yaml
inputs:
  test_type:
    type: choice
    options:
      - all
      - stress-lite
      - soak-short
      # ... existing options ...
```

---

## Troubleshooting

### Stress Test Issues

**Problem**: Test fails immediately with high error rate

**Solution**:
- Check backend is running and healthy
- Verify database has seed data
- Check rate limiting configuration
- Review backend logs for errors

**Problem**: System doesn't recover after stress

**Solution**:
- Check for resource leaks (goroutines, connections)
- Verify connection pools configured correctly
- Check if caches are bounded
- Review cleanup logic in handlers

### Soak Test Issues

**Problem**: Response times gradually increasing

**Possible causes**:
- Memory leak (check heap profiles)
- Database query performance degradation
- Cache effectiveness declining
- Connection pool exhaustion

**Problem**: Error rate climbing during soak

**Possible causes**:
- Database connection leaks
- File descriptor exhaustion
- Goroutine leaks causing scheduler issues
- External service timeouts

**Problem**: Test machine runs out of resources

**Solution**:
- Use cloud VM for long tests
- Reduce TARGET_VUS for soak test
- Use shorter duration for initial testing
- Monitor test client resources too

### K6 Issues

**Problem**: K6 reports "too many open files"

**Solution**:
```bash
# Increase file descriptor limit
ulimit -n 65536
```

**Problem**: K6 uses too much memory

**Solution**:
- Reduce concurrent VUs
- Disable detailed metrics collection
- Use summary output instead of full metrics

---

## Best Practices

### General

1. **Start small**: Run short tests before long ones
2. **Monitor actively**: Watch dashboards during stress/soak
3. **Document baselines**: Record normal performance metrics
4. **Test in staging**: Use production-like environment
5. **Review regularly**: Schedule recurring stress/soak tests

### Stress Testing

1. Run stress-lite version frequently (daily/weekly)
2. Run full stress test before major releases
3. Document maximum sustainable load
4. Test recovery thoroughly
5. Verify rate limiting and circuit breakers

### Soak Testing

1. Start with 1-hour tests, then increase duration
2. Run on dedicated machines (not laptops)
3. Collect profiles at regular intervals
4. Monitor memory trends continuously
5. Run full 24h soak tests monthly in staging
6. Compare baseline vs. end-state metrics

---

## Success Metrics

### Stress Testing

**Success criteria**:
- ✅ Maximum sustainable load identified and documented
- ✅ System degrades gracefully (no crashes)
- ✅ Recovery completes within 2 minutes
- ✅ Rate limiting prevents resource exhaustion
- ✅ Error messages are meaningful
- ✅ Monitoring alerts trigger appropriately

### Soak Testing

**Success criteria**:
- ✅ Response times remain stable (±10% variance)
- ✅ Memory usage flat (no continuous growth)
- ✅ Error rate stays below 0.5%
- ✅ No resource leaks detected
- ✅ Connection pools remain healthy
- ✅ Cache performance consistent
- ✅ System recovers immediately after test

---

## Related Documentation

- [Load Testing README](README.md) - General load testing guide
- [Execution Guide](EXECUTION_GUIDE.md) - Step-by-step test execution
- [Load Test Dashboard](../../monitoring/dashboards/LOAD_TEST_DASHBOARD.md) - Grafana dashboard guide
- [Profiling Template](PROFILING_REPORT_TEMPLATE.md) - Performance analysis template

---

## Support

For questions or issues:
1. Review existing load test reports in `reports/`
2. Check monitoring dashboards
3. Review application logs
4. Consult team in #performance channel
5. Create issue with `testing` and `performance` labels
