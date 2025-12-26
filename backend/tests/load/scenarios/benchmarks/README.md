# API Endpoint Performance Benchmarks

This directory contains focused performance benchmarks for individual API endpoints, based on the top 20 most important endpoints by traffic and criticality.

## Overview

Unlike general load tests that simulate mixed user behavior, these benchmarks:

1. **Target specific endpoints** with precise p50/p95/p99 targets
2. **Monitor cache effectiveness** per endpoint
3. **Detect N+1 query patterns** during execution
4. **Enforce performance SLOs** with strict thresholds
5. **Track trends over time** for regression detection

## Benchmark Structure

Each benchmark script follows a consistent pattern:

```javascript
// Imports and metrics
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Performance targets (from endpoint-targets.yaml)
export const options = {
    stages: [...],  // Load pattern
    thresholds: {   // Pass/fail criteria
        'http_req_duration': ['p(50)<Xms', 'p(95)<Yms', 'p(99)<Zms'],
        'endpoint_errors': ['rate<0.01'],
        'cache_hits': ['rate>0.7'],
    },
};

// Test logic with realistic traffic patterns
export default function() {
    // Make request
    // Validate response
    // Record metrics
    // Detect N+1 patterns
}

// Summary with target comparison
export function handleSummary(data) {
    // Print pass/fail against targets
}
```

## Available Benchmarks

### Critical Endpoints (High Traffic)

- **`feed_list.js`** - Main feed endpoint (GET /api/v1/clips)
  - Target: p50<20ms, p95<75ms, p99<150ms
  - RPS: 50+
  - Cache: 70%+
  
- **`clip_detail.js`** - Individual clip (GET /api/v1/clips/:id)
  - Target: p50<15ms, p95<50ms, p99<100ms
  - RPS: 40+
  - Cache: 80%+
  
- **`search.js`** - Search functionality (GET /api/v1/search)
  - Target: p50<30ms, p95<100ms, p99<200ms
  - RPS: 25+
  - Cache: 50%+

- **`related_clips.js`** - Related clips recommendation
  - Target: p50<25ms, p95<75ms, p99<150ms
  - RPS: 30+
  - Cache: 70%+

- **`list_comments.js`** - Comments for a clip
  - Target: p50<20ms, p95<50ms, p99<100ms
  - RPS: 35+
  - Cache: 60%+

- **`auth_me.js`** - Current user endpoint
  - Target: p50<15ms, p95<40ms, p99<75ms
  - RPS: 30+
  - Cache: 70%+

### Additional Benchmarks (To Be Created)

- `search_suggestions.js` - Autocomplete
- `create_comment.js` - Create comment
- `vote_clip.js` - Voting on clips
- `user_profile.js` - User profile
- And more...

## Running Benchmarks

### Individual Endpoint

```bash
# Run specific endpoint benchmark
k6 run backend/tests/load/scenarios/benchmarks/feed_list.js

# With custom duration
k6 run --duration 5m backend/tests/load/scenarios/benchmarks/feed_list.js

# Output to JSON for analysis
k6 run --out json=results.json backend/tests/load/scenarios/benchmarks/feed_list.js
```

### All Benchmarks

```bash
# Run all endpoint benchmarks
make test-benchmarks-all

# Run with query profiling
make test-benchmarks-with-profiling
```

### With Query Profiling

Combine benchmarks with database query analysis:

```bash
# Profile queries while running benchmark
backend/tests/load/profile_queries.sh feed_list 60

# This will:
# - Enable query logging
# - Run the benchmark
# - Capture EXPLAIN ANALYZE
# - Detect N+1 patterns
# - Generate report
```

## Performance Targets

All targets are defined in `../../config/endpoint-targets.yaml`.

| Endpoint | p50 (ms) | p95 (ms) | p99 (ms) | RPS | Cache % |
|----------|----------|----------|----------|-----|---------|
| Feed List | 20 | 75 | 150 | 50+ | 70%+ |
| Clip Detail | 15 | 50 | 100 | 40+ | 80%+ |
| Search | 30 | 100 | 200 | 25+ | 50%+ |
| ... | ... | ... | ... | ... | ... |

## Metrics Collected

Each benchmark tracks:

1. **Latency Percentiles**: p50, p95, p99, avg, min, max
2. **Error Rate**: Failed requests as percentage
3. **Throughput**: Requests per second
4. **Cache Performance**: Hit rate, miss rate
5. **N+1 Detection**: Patterns indicating N+1 queries

## Integration with CI

Benchmarks run automatically in CI:

1. **Nightly**: Full benchmark suite
2. **On PR**: Benchmarks for changed endpoints
3. **Regression Detection**: Compare against baselines
4. **Fail Build**: If thresholds exceeded

### CI Workflow

```yaml
# .github/workflows/benchmarks.yml
- name: Run Endpoint Benchmarks
  run: make test-benchmarks-all
  
- name: Compare Against Baseline
  run: ./scripts/compare_benchmarks.sh
  
- name: Upload Results
  uses: actions/upload-artifact@v4
  with:
    name: benchmark-results
    path: backend/tests/load/profiles/
```

## Query Profiling

### N+1 Detection

The profiling harness automatically detects N+1 patterns by:

1. Monitoring query call counts
2. Identifying repeated similar queries
3. Correlating with response times
4. Flagging patterns exceeding thresholds

Example N+1 pattern:

```
Query: SELECT * FROM users WHERE id = $1
Calls: 50
Mean time: 2ms each
Total time: 100ms

^ This indicates 50 individual user queries instead of 1 batch query
```

### EXPLAIN ANALYZE

For slow queries (>100ms), the profiler captures:

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
SELECT c.*, u.username, COUNT(v.id) as votes
FROM clips c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN votes v ON c.id = v.clip_id
GROUP BY c.id, u.username
ORDER BY c.created_at DESC
LIMIT 25;
```

Output shows:
- Execution plan
- Actual timing
- Rows processed
- Buffer usage
- Missing indexes

## Cache Monitoring

### Per-Endpoint Cache Metrics

Each benchmark checks the `X-Cache-Status` header:

```javascript
const cacheStatus = response.headers['X-Cache-Status'];
if (cacheStatus === 'HIT') {
    cacheHitRate.add(1);
} else {
    cacheHitRate.add(0);
}
```

### Cache Instrumentation

To enable cache headers, add to your handler:

```go
// In Redis cache layer
func (c *Cache) Get(ctx context.Context, key string) ([]byte, error) {
    val, err := c.client.Get(ctx, key).Bytes()
    if err == redis.Nil {
        return nil, ErrCacheMiss
    }
    return val, err
}

// In HTTP handler
if val, err := cache.Get(ctx, cacheKey); err == nil {
    c.Header("X-Cache-Status", "HIT")
    c.Data(http.StatusOK, "application/json", val)
    return
}
c.Header("X-Cache-Status", "MISS")
```

### Expected Cache Rates

Based on endpoint characteristics:

- **Hot feeds** (sort=hot): 80%+ hit rate (cached 5min)
- **Clip details**: 75%+ hit rate (cached 10min)  
- **Search results**: 50%+ hit rate (popular queries cached)
- **User profiles**: 60%+ hit rate (cached 15min)

## Reporting

### Benchmark Summary

After each run, benchmarks output:

```
=== Feed List Endpoint Benchmark Summary ===
p50: 18.23ms (target: <20ms) ✓
p95: 67.45ms (target: <75ms) ✓
p99: 142.11ms (target: <150ms) ✓
Error Rate: 0.32% (target: <0.5%) ✓
Throughput: 52.3 RPS (target: >50 RPS) ✓
Cache Hit Rate: 73.2% (target: >70%) ✓
```

### Trend Reports

Historical data tracked in:

- `profiles/benchmarks/` - Per-run results
- `baselines/` - Version baselines
- Grafana dashboard - Real-time trends

## Troubleshooting

### Benchmark Fails Thresholds

1. Check if backend is warmed up (run twice)
2. Verify database is seeded with test data
3. Check for other processes consuming resources
4. Review query profiling report for bottlenecks

### High N+1 Query Count

1. Review `n_plus_one_candidates.csv`
2. Check for missing JOINs in repository layer
3. Implement batch loading (e.g., DataLoader pattern)
4. Add eager loading for relations

### Low Cache Hit Rate

1. Verify Redis is running and accessible
2. Check cache TTL configuration
3. Ensure cache invalidation isn't too aggressive
4. Review cache key strategy for correctness

### Slow Queries

1. Review `explain_analyze.txt` for query plans
2. Check for sequential scans on large tables
3. Add missing indexes from recommendations
4. Consider query optimization or denormalization

## Best Practices

1. **Run Benchmarks Consistently**: Same environment, same data
2. **Warm Up First**: Run once to warm caches, then measure
3. **Use Realistic Data**: Seed with production-like dataset
4. **Monitor Trends**: Single run can vary, track over time
5. **Fix Root Causes**: Don't just cache over N+1 queries
6. **Document Changes**: Note improvements in git commit messages

## Contributing

When adding new endpoint benchmarks:

1. Copy template from existing benchmark
2. Update targets from `endpoint-targets.yaml`
3. Add realistic traffic pattern (weights for variants)
4. Include cache hit rate checks
5. Add N+1 detection logic
6. Update this README with new endpoint
7. Add Makefile target
8. Test locally before committing

## References

- [Endpoint Targets Config](../config/endpoint-targets.yaml)
- [Query Profiling Script](../profile_queries.sh)
- [Load Test README](../README.md)
- [Performance Summary](../PERFORMANCE_SUMMARY.md)
