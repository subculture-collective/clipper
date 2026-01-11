# Moderation Performance Testing Guide

This guide covers performance and load testing for the Clipper moderation system.

## Overview

The moderation performance test suite validates that the moderation system can handle large-scale operations efficiently:

- **Ban Sync**: Handle 10,000+ ban records
- **Audit Logs**: Query 50,000+ audit log entries
- **Permissions**: Check permissions for 100+ concurrent users
- **Stress Testing**: Test all endpoints under high load

## Prerequisites

1. **K6 Load Testing Tool**
   ```bash
   # macOS
   brew install k6
   
   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **PostgreSQL Client** (for seeding)
   ```bash
   # macOS
   brew install postgresql
   
   # Linux
   sudo apt-get install postgresql-client
   ```

3. **Running Backend Server**
   ```bash
   make backend-dev
   ```

## Quick Start

### 1. Set Up Test Data

First, seed the database with performance test data:

```bash
# Start Docker services
make docker-up

# Run migrations
make migrate-up

# Seed standard load test data
make migrate-seed-load-test

# Seed moderation-specific performance test data
make migrate-seed-moderation-perf-test
```

This creates:
- 12,000+ ban records across multiple channels
- 55,000+ audit log entries
- 5,000+ moderation queue items
- 100+ community moderators
- Required users and auth tokens

### 2. Run Individual Tests

Test specific moderation features:

```bash
# Ban sync performance (10,000+ bans)
make test-load-moderation-ban-sync

# Audit log query performance (50,000+ entries)
make test-load-moderation-audit-logs

# Permission check performance (100+ concurrent users)
make test-load-moderation-permissions

# Comprehensive stress test (all endpoints)
make test-load-moderation-stress
```

### 3. Run All Moderation Tests

Run the complete moderation performance suite:

```bash
make test-load-moderation-all
```

## Test Scenarios

### Ban Sync Performance Test

**File**: `backend/tests/load/scenarios/moderation_ban_sync.js`

**What it tests**:
- Syncing large ban lists from Twitch (10,000+ bans)
- Batch processing performance
- Database insert/update efficiency
- API response times for ban operations

**Load Pattern**:
- Ramp up: 5 → 10 concurrent syncs
- Stress: 20 concurrent syncs
- Duration: ~7 minutes

**Thresholds**:
- p95 response time: < 200ms (list operations)
- p99 response time: < 500ms (API endpoints)
- p95 sync duration: < 2000ms (full sync)
- Error rate: < 1%

**Run**:
```bash
make test-load-moderation-ban-sync
```

### Audit Log Query Performance Test

**File**: `backend/tests/load/scenarios/moderation_audit_logs.js`

**What it tests**:
- Query performance with 50,000+ audit logs
- Complex filtering (moderator, action, date range)
- Pagination efficiency (including deep pagination)
- Database index utilization

**Load Pattern**:
- Ramp up: 20 → 50 users
- Stress: 100 concurrent users
- Duration: ~7 minutes

**Query Types**:
- 30% Simple queries (no filters)
- 30% Filtered queries (single filter)
- 25% Complex queries (multiple filters)
- 15% Deep pagination (pages 1-100)

**Thresholds**:
- p95 response time: < 200ms (simple queries)
- p99 response time: < 500ms (all queries)
- Error rate: < 1%

**Run**:
```bash
make test-load-moderation-audit-logs
```

### Permission Check Performance Test

**File**: `backend/tests/load/scenarios/moderation_permissions.js`

**What it tests**:
- Permission checking under load
- No N+1 query issues
- Role-based access control efficiency
- Cache utilization

**Load Pattern**:
- Ramp up: 30 → 60 → 100 users
- Peak: 150 concurrent users
- Duration: ~7 minutes

**Operations**:
- 40% Individual permission checks
- 30% List moderators (with permission validation)
- 20% Community permission checks
- 10% Batch permission checks

**Thresholds**:
- p95 response time: < 200ms (most operations)
- p99 response time: < 500ms (all operations)
- No N+1 queries (response time should not scale with result count)
- Error rate: < 1%

**Run**:
```bash
make test-load-moderation-permissions
```

### Moderation Stress Test

**File**: `backend/tests/load/scenarios/moderation_stress.js`

**What it tests**:
- All moderation endpoints under stress
- System stability under high load
- Database performance degradation
- Resource utilization and recovery

**Load Pattern**:
- Baseline: 50 users
- Normal capacity: 100 users
- Stress: 200 users
- Peak stress: 300 users
- Recovery: 150 users
- Duration: ~10 minutes

**Operations** (weighted by usage):
- 35% Moderation queue queries
- 25% Audit log queries
- 15% Moderator management
- 13% Ban operations
- 7% Content moderation (approve/reject)
- 5% Analytics queries

**Thresholds**:
- p95 response time: < 500ms
- p99 response time: < 1000ms
- Error rate: < 5% (during peak stress)
- System should recover after stress reduction

**Run**:
```bash
make test-load-moderation-stress
```

## Performance Baselines

### Target Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| p95 Response Time | < 200ms | > 500ms |
| p99 Response Time | < 500ms | > 1000ms |
| Error Rate | < 1% | > 5% |
| Ban Sync (10K records) | < 2s | > 5s |
| Audit Log Query (with filters) | < 300ms | > 600ms |
| Permission Check | < 100ms | > 300ms |

### Database Performance

**Expected Query Performance**:
- Simple SELECT queries: < 10ms
- Filtered queries with indexes: < 50ms
- Complex joins: < 100ms
- Batch inserts (1000 records): < 200ms

**Index Coverage**:
- Ban lookups by channel: Indexed
- Audit logs by moderator/action/date: Indexed
- Permission checks: Indexed
- Pagination: Efficient (no table scans)

### Concurrent User Capacity

- **Normal Load**: 100 concurrent users
- **Peak Load**: 200 concurrent users
- **Stress Test**: 300 concurrent users
- **Breaking Point**: Should handle 300+ without service degradation

## Monitoring During Tests

### Real-Time Metrics

While tests are running, monitor:

1. **K6 Output**: Real-time metrics in console
2. **Database Metrics**: 
   - Connection pool usage
   - Query execution time
   - Lock contention
3. **Application Metrics**:
   - Response times per endpoint
   - Error rates
   - Memory usage
   - CPU utilization

### Grafana Dashboard

For historical trends and detailed analysis:

1. Navigate to Grafana: `https://clpr.tv/grafana`
2. Open "K6 Load Test Trends" dashboard
3. Filter by scenario: `moderation_*`

Key panels to watch:
- Response Time Trends (p95, p99)
- Error Rate by Scenario
- Throughput (requests/second)
- Database Query Time

## Interpreting Results

### Success Criteria

✅ **Pass** if:
- All thresholds met
- Error rate < 1%
- No N+1 query issues detected
- System stable under stress
- Recovery after peak load

⚠️ **Warning** if:
- p95 response times 200-500ms
- Error rates 1-3%
- Minor performance degradation during stress

❌ **Fail** if:
- p99 response times > 1000ms
- Error rates > 5%
- N+1 queries detected
- System doesn't recover after stress
- Database deadlocks or timeouts

### Common Issues and Solutions

**High Response Times**:
- Check database query plans
- Verify indexes are being used
- Check for table scans
- Review connection pool settings

**N+1 Query Issues**:
- Use EXPLAIN ANALYZE on slow queries
- Add eager loading for relationships
- Implement query batching
- Consider caching

**High Error Rates**:
- Check application logs for errors
- Verify database connection limits
- Review rate limiting settings
- Check for deadlocks

**Resource Exhaustion**:
- Monitor memory usage trends
- Check for connection leaks
- Review goroutine counts
- Verify cleanup in defer statements

## Best Practices

1. **Run tests on dedicated hardware**: Avoid running on development machines
2. **Use production-like data**: Seed realistic data volumes
3. **Test regularly**: Run performance tests in CI/CD pipeline
4. **Establish baselines**: Capture baselines for each release
5. **Monitor trends**: Track performance over time
6. **Test edge cases**: Include boundary conditions
7. **Verify recovery**: Ensure system recovers after stress

## Troubleshooting

### Test Fails to Start

```bash
# Check if K6 is installed
k6 version

# Verify backend is running
curl http://localhost:8080/health

# Check database connection
psql "postgresql://clipper:clipper_password@localhost:5432/clipper?sslmode=disable" -c "SELECT COUNT(*) FROM twitch_bans;"
```

### No Test Data

```bash
# Re-seed the database
make migrate-seed-moderation-perf-test

# Verify data exists
psql "postgresql://clipper:clipper_password@localhost:5432/clipper?sslmode=disable" -c "
SELECT 
  (SELECT COUNT(*) FROM twitch_bans) as bans,
  (SELECT COUNT(*) FROM moderation_decisions) as decisions,
  (SELECT COUNT(*) FROM moderation_queue) as queue_items;
"
```

### Poor Performance

1. Check database indexes:
```sql
-- List indexes on key tables
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('twitch_bans', 'moderation_decisions', 'moderation_queue')
ORDER BY tablename, indexname;
```

2. Analyze query plans:
```sql
-- Example for audit log query
EXPLAIN ANALYZE
SELECT * FROM moderation_decisions
WHERE action = 'approve'
ORDER BY created_at DESC
LIMIT 100;
```

3. Check connection pool:
```bash
# Monitor active connections
psql "postgresql://clipper:clipper_password@localhost:5432/clipper?sslmode=disable" -c "
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = 'clipper';
"
```

## CI/CD Integration

The performance tests can be integrated into CI/CD pipelines:

### Nightly Performance Tests

Tests automatically run nightly via GitHub Actions (see `.github/workflows/load-tests.yml`).

### On-Demand Testing

Trigger tests manually:
```bash
# Via GitHub UI
Actions > Load Tests > Run workflow > Select test type

# Via GitHub CLI
gh workflow run load-tests.yml -f test_type=moderation_stress
```

### Baseline Comparison

Capture and compare baselines:
```bash
# Capture baseline for a release
make test-load-baseline-capture VERSION=v1.0.0

# Compare current performance
make test-load-baseline-compare VERSION=v1.0.0
```

## Related Documentation

- [Load Test README](../README.md) - Overview of all load tests
- [Stress & Soak Testing Guide](../STRESS_SOAK_GUIDE.md) - Extended stress testing
- [Load Test Dashboard](../../../monitoring/dashboards/LOAD_TEST_DASHBOARD.md) - Grafana setup
- [Performance Summary](../PERFORMANCE_SUMMARY.md) - Performance targets
- [CI/CD Load Tests](.github/workflows/LOAD_TESTS_README.md) - Automated testing

## Support

For issues or questions:
- Review [existing test results](../reports/)
- Check [GitHub Issues](https://github.com/subculture-collective/clipper/issues)
- Consult [CONTRIBUTING.md](../../../CONTRIBUTING.md)
