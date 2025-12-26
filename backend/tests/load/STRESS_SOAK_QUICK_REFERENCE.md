# Stress & Soak Testing Quick Reference

Quick commands and cheat sheet for stress and soak testing.

## Quick Commands

### Stress Testing

```bash
# Full stress test (~20 minutes)
make test-stress

# Lite version for CI (~5 minutes)
make test-stress-lite

# With chaos mode (random failures)
k6 run -e ENABLE_CHAOS=true backend/tests/load/scenarios/stress.js

# Custom duration (50% = 10 min)
k6 run -e DURATION_MULTIPLIER=0.5 backend/tests/load/scenarios/stress.js
```

### Soak Testing

```bash
# Full 24-hour soak test
make test-soak

# 1-hour short version
make test-soak-short

# 4-hour custom duration
k6 run -e DURATION_HOURS=4 backend/tests/load/scenarios/soak.js

# With monitoring enabled
k6 run -e ENABLE_MONITORING=true backend/tests/load/scenarios/soak.js

# Custom load (100 users)
k6 run -e TARGET_VUS=100 backend/tests/load/scenarios/soak.js
```

### Monitoring

```bash
# Monitor soak test with automatic profiling
cd backend/tests/load
./monitor_soak.sh

# Custom monitoring interval (30 min)
INTERVAL_MINUTES=30 ./monitor_soak.sh

# Collect single memory profile
curl http://localhost:8080/debug/pprof/heap > heap.profile
go tool pprof -http=:8081 heap.profile
```

## Test Phases

### Stress Test Phases

| Phase | VUs | Duration | Purpose |
|-------|-----|----------|---------|
| Baseline | 50 | 2m | Normal performance |
| Increased | 100 | 2m | Approach capacity |
| High | 150 | 3m | At capacity |
| Stress | 200 | 3m | Beyond capacity |
| Extreme | 300 | 3m | Heavy stress |
| Peak | 400 | 2m | Maximum stress |
| Recovery | 150 | 2m | Test recovery |
| Normalize | 50 | 2m | Return to baseline |

**Total**: ~20 minutes (full), ~5 minutes (lite)

### Soak Test Phases

| Phase | VUs | Duration | Purpose |
|-------|-----|----------|---------|
| Ramp Up | 0→75 | 15m | Gradual increase |
| Sustained | 75 | 24h | Endurance testing |
| Ramp Down | 75→0 | 5m | Graceful shutdown |

**Total**: ~24 hours (configurable)

## Key Metrics

### Stress Test Metrics

- `errors` - Error rate (threshold: <25%)
- `degraded_responses` - Degraded performance events
- `resource_exhaustion_events` - 429/503/504 errors
- `http_req_duration` - Response times (p95 <2s, p99 <5s)

### Soak Test Metrics

- `page_load_time` - Response time trends
- `time_to_first_byte` - Backend processing time
- `memory_indicator` - Response size (leak detection)
- `slow_requests` - Requests 500-1000ms
- `very_slow_requests` - Requests >1000ms
- `degradation_events` - Performance degradation
- `connection_errors` - Connection issues
- `current_test_hour` - Test progress

## Expected Behavior

### Stress Test

**✅ Success Indicators:**
- System degrades gracefully (no crashes)
- Recovery completes within 2 minutes
- Rate limiting prevents total failure
- Error messages are clear

**⚠️ Warning Signs:**
- Sudden spikes in errors
- No recovery after load reduction
- Database connection exhaustion
- Unhandled panics

### Soak Test

**✅ Success Indicators:**
- Response times stable (±10%)
- Memory usage flat
- Error rate <0.5%
- Goroutine count stable

**⚠️ Warning Signs:**
- Memory continuously growing
- Response times degrading
- Error rate climbing
- Connection leaks

## Troubleshooting

### Common Issues

**Stress test fails immediately:**
```bash
# Check backend is running
curl http://localhost:8080/api/v1/health

# Check seed data exists
psql -U clipper -d clipper_load_test -c "SELECT COUNT(*) FROM clips;"
```

**Soak test shows memory growth:**
```bash
# Collect heap profiles
curl http://localhost:8080/debug/pprof/heap > heap_start.profile
# Wait 1 hour
curl http://localhost:8080/debug/pprof/heap > heap_1h.profile

# Compare
go tool pprof -base heap_start.profile heap_1h.profile
```

**K6 connection errors:**
```bash
# Increase file descriptor limit
ulimit -n 65536

# Check backend connection pool
curl http://localhost:8080/api/v1/health | jq '.database'
```

## CI/CD Integration

### GitHub Actions

```bash
# Manual trigger from UI
# 1. Go to Actions tab
# 2. Select "Load Tests" workflow
# 3. Click "Run workflow"
# 4. Select test type: stress-lite or soak-short
```

### Nightly Runs

Stress-lite tests run automatically:
- **Schedule**: Nightly at 2 AM UTC
- **Duration**: ~5 minutes
- **Results**: Artifacts available for 90 days

## Analysis Checklist

### After Stress Test

- [ ] Maximum sustainable load documented
- [ ] Breaking point identified
- [ ] Recovery time measured
- [ ] Error patterns analyzed
- [ ] Rate limiting validated
- [ ] Resource leaks checked

### After Soak Test

- [ ] Memory trends reviewed (flat?)
- [ ] Response time stability confirmed
- [ ] Error rate remained low
- [ ] Goroutine count stable
- [ ] Connection pools healthy
- [ ] No resource leaks found
- [ ] Profiles collected and analyzed

## Profile Analysis

### Heap Profile

```bash
# View top memory consumers
go tool pprof -top heap.profile | head -20

# Interactive web UI
go tool pprof -http=:8081 heap.profile

# Compare two profiles
go tool pprof -base heap_start.profile heap_end.profile
```

### Goroutine Profile

```bash
# Check goroutine count
curl http://localhost:8080/debug/pprof/goroutine?debug=1 | head -20

# Analyze in web UI
curl http://localhost:8080/debug/pprof/goroutine > goroutine.profile
go tool pprof -http=:8081 goroutine.profile
```

### CPU Profile

```bash
# Collect during test (60 seconds)
curl http://localhost:8080/debug/pprof/profile?seconds=60 > cpu.profile

# Analyze
go tool pprof -http=:8081 cpu.profile
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8080` | Target API URL |
| `AUTH_TOKEN` | - | JWT for authenticated tests |
| `DURATION_MULTIPLIER` | `1.0` | Stress test duration multiplier |
| `DURATION_HOURS` | `24` | Soak test duration |
| `TARGET_VUS` | `75` | Soak test concurrent users |
| `ENABLE_CHAOS` | `false` | Enable chaos mode (stress) |
| `ENABLE_MONITORING` | `false` | Enable health checks (soak) |
| `INTERVAL_MINUTES` | `15` | Monitoring interval |

## Resources

- **Full Guide**: [STRESS_SOAK_GUIDE.md](STRESS_SOAK_GUIDE.md)
- **Load Testing**: [README.md](README.md)
- **Execution Guide**: [EXECUTION_GUIDE.md](EXECUTION_GUIDE.md)
- **Dashboard**: [Load Test Dashboard](../../monitoring/dashboards/LOAD_TEST_DASHBOARD.md)

## Tips

### Stress Testing Tips

1. Start with stress-lite before running full test
2. Monitor Grafana dashboard during test
3. Document maximum load before deployment
4. Test recovery behavior thoroughly
5. Run in staging before production

### Soak Testing Tips

1. Start with 1-hour test before 24-hour
2. Use dedicated VM (not laptop)
3. Collect profiles every 2-4 hours
4. Monitor memory trends actively
5. Compare baseline vs. end-state
6. Run monthly in staging environment

### Memory Leak Detection Tips

1. Collect heap profile at start and end
2. Compare with `go tool pprof -base`
3. Look for continuously growing allocations
4. Check goroutine count trends
5. Monitor database connections
6. Review cache eviction policies

## Exit Criteria

### Stress Test

**Pass if:**
- System survives all phases
- Recovery completes successfully
- No unhandled crashes
- Error rate <25% during peak
- Rate limiting works

**Fail if:**
- System crashes
- No recovery after load reduction
- Error rate >25% sustained
- Unhandled panics

### Soak Test

**Pass if:**
- Memory usage stable
- Response times stable (±10%)
- Error rate <1%
- No resource leaks
- System healthy after test

**Fail if:**
- Memory continuously growing
- Response times doubling
- Error rate climbing
- Connection leaks
- System unstable after test
