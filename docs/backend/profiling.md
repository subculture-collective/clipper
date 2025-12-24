---
title: "Performance Profiling Guide"
summary: "This guide explains how to profile the Clipper backend to identify performance bottlenecks and optim"
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Performance Profiling Guide

This guide explains how to profile the Clipper backend to identify performance bottlenecks and optimize the system.

## Overview

We use multiple profiling and monitoring tools:
- **Go pprof**: Built-in profiling for CPU, memory, goroutines, etc.
- **Prometheus**: Metrics collection for HTTP requests, latency, throughput
- **K6 Load Testing**: Generate realistic load patterns
- **Database Query Analysis**: Identify slow queries and N+1 problems

## Quick Start

### 1. Start the Backend with Profiling Enabled

```bash
# Start Docker services
make docker-up

# Run migrations and seed test data
make migrate-up
make migrate-seed-load-test

# Start backend
make backend-dev
```

The backend now exposes profiling endpoints at:
- **Prometheus Metrics**: http://localhost:8080/debug/metrics
- **pprof Index**: http://localhost:8080/debug/pprof/
- **CPU Profile**: http://localhost:8080/debug/pprof/profile?seconds=30
- **Heap Profile**: http://localhost:8080/debug/pprof/heap
- **Goroutine Profile**: http://localhost:8080/debug/pprof/goroutine

### 2. Run Load Tests

```bash
# Run mixed user behavior test (recommended)
make test-load-mixed

# Or run specific scenarios
make test-load-feed
make test-load-clip
make test-load-search
```

### 3. Collect Profiling Data

While load tests are running, collect profiling data:

```bash
# CPU profile (30 seconds)
go tool pprof -http=:8081 http://localhost:8080/debug/pprof/profile?seconds=30

# Memory (heap) profile
go tool pprof -http=:8082 http://localhost:8080/debug/pprof/heap

# Goroutine profile (check for leaks)
go tool pprof -http=:8083 http://localhost:8080/debug/pprof/goroutine

# Block profile (contentious locks)
go tool pprof -http=:8084 http://localhost:8080/debug/pprof/block

# Mutex profile
go tool pprof -http=:8085 http://localhost:8080/debug/pprof/mutex
```

Each command opens an interactive web UI for analyzing the profile.

### 4. Analyze Prometheus Metrics

```bash
# View raw metrics
curl http://localhost:8080/debug/metrics

# Key metrics to monitor:
# - http_requests_total
# - http_request_duration_seconds
# - http_in_flight_requests
```

## Automated Profiling Script

Use the provided script to collect baseline metrics:

```bash
cd backend/tests/load
./collect_profile.sh
```

This script:
1. Starts a load test
2. Collects CPU, heap, and goroutine profiles
3. Saves results to `profiles/` directory
4. Generates a summary report

## Common Profiling Workflows

### Identifying CPU Bottlenecks

1. Run load tests to generate realistic load
2. Collect a CPU profile:
   ```bash
   go tool pprof http://localhost:8080/debug/pprof/profile?seconds=30
   ```
3. In the pprof interactive prompt:
   ```
   top20          # Show top 20 functions by CPU time
   list <func>    # Show source code for a function
   web            # Generate visual call graph
   ```
4. Look for:
   - Functions consuming high CPU percentage
   - Unexpected function calls
   - Tight loops or inefficient algorithms

### Identifying Memory Leaks

1. Collect a heap profile before and after load:
   ```bash
   # Before
   curl http://localhost:8080/debug/pprof/heap > heap_before.prof
   
   # Run load test
   make test-load-mixed
   
   # After
   curl http://localhost:8080/debug/pprof/heap > heap_after.prof
   
   # Compare
   go tool pprof -base=heap_before.prof heap_after.prof
   ```
2. Look for:
   - Large memory allocations
   - Growing allocations over time
   - Unexpected object retention

### Identifying Database N+1 Queries

1. Enable PostgreSQL query logging:
   ```sql
   ALTER DATABASE clipper SET log_statement = 'all';
   ALTER DATABASE clipper SET log_duration = on;
   ALTER DATABASE clipper SET log_min_duration_statement = 0;
   ```
2. Run load tests and watch logs:
   ```bash
   docker logs -f clipper-postgres-1
   ```
3. Look for:
   - Repeated similar queries (N+1 pattern)
   - Queries without indexes (sequential scans)
   - Queries taking >10ms

### Identifying Cache Issues

1. Monitor cache hit rates:
   ```bash
   curl http://localhost:8080/health/cache
   ```
2. Check Redis performance:
   ```bash
   docker exec -it clipper-redis-1 redis-cli INFO stats
   ```
3. Look for:
   - Low cache hit rates (<80%)
   - High eviction rates
   - Cache key patterns

## Profiling Cheat Sheet

### pprof Commands
```bash
# CPU profile
go tool pprof http://localhost:8080/debug/pprof/profile?seconds=30

# Heap profile
go tool pprof http://localhost:8080/debug/pprof/heap

# Allocs (all memory allocations, not just heap)
go tool pprof http://localhost:8080/debug/pprof/allocs

# Goroutines
go tool pprof http://localhost:8080/debug/pprof/goroutine

# Block profile (lock contention)
go tool pprof http://localhost:8080/debug/pprof/block

# Mutex profile
go tool pprof http://localhost:8080/debug/pprof/mutex
```

### pprof Interactive Commands
```
top             # Top functions by metric
top20           # Top 20 functions
list <func>     # Show source code
web             # Open call graph in browser
png             # Generate PNG call graph
pdf             # Generate PDF call graph
peek <func>     # Show callers and callees
traces          # Show sample traces
```

## Performance Targets (SLOs)

| Endpoint Type | p95 Target | p99 Target | Throughput |
|--------------|------------|------------|------------|
| Feed listing | <100ms | <150ms | 100+ req/s |
| Clip detail | <50ms | <100ms | 200+ req/s |
| Search | <100ms | <200ms | 50+ req/s |
| Comments list | <50ms | <100ms | 100+ req/s |
| Write operations | <200ms | <500ms | 50+ req/s |

Error rate target: <1%

## Common Optimization Strategies

### 1. Database Optimizations
- Add indexes for frequently queried columns
- Use EXPLAIN ANALYZE to identify slow queries
- Implement connection pooling (already configured)
- Use prepared statements
- Batch operations where possible
- Avoid N+1 queries with eager loading

### 2. Caching Optimizations
- Cache frequently accessed data (clips, users, tags)
- Set appropriate TTLs (Time To Live)
- Use cache warming for popular content
- Implement cache invalidation strategies
- Consider Redis cluster for scaling

### 3. Query Optimizations
- Paginate large result sets
- Use database cursors for streaming
- Implement field selection (don't fetch unused fields)
- Use database-level aggregations
- Consider read replicas for read-heavy workloads

### 4. Application Optimizations
- Use goroutines for parallel operations
- Implement request coalescing
- Use connection pooling for external services
- Optimize JSON serialization
- Reduce middleware overhead
- Implement graceful degradation

## Reporting Template

When creating profiling reports, include:

### Executive Summary
- Key findings
- Performance vs. targets
- Critical bottlenecks identified

### Baseline Metrics
- Load test configuration
- p50, p95, p99 latencies for each endpoint
- Throughput (requests/second)
- Error rates
- Resource utilization (CPU, memory, connections)

### Bottleneck Analysis
- Top CPU consumers
- Memory hotspots
- Database query analysis
- Cache performance
- External API latency

### Optimization Recommendations
- Prioritized list of improvements
- Expected impact of each optimization
- Implementation effort estimate

### Before/After Metrics
- Side-by-side comparison
- Percentage improvements
- New performance characteristics

## Security Considerations

⚠️ **IMPORTANT**: Profiling endpoints expose sensitive information about your application.

In production:
1. **Restrict access** to /debug/* endpoints using:
   - Firewall rules
   - Network policies (internal network only)
   - Authentication middleware
   - VPN access
2. **Monitor access** to profiling endpoints
3. **Consider disabling** in production if not needed
4. **Use environment flags** to enable/disable profiling

Example: Add authentication to debug endpoints
```go
debug := r.Group("/debug")
debug.Use(middleware.RequireRole("admin"))
{
    // ... profiling endpoints
}
```

## Tools and Resources

- [Go pprof Documentation](https://pkg.go.dev/net/http/pprof)
- [Profiling Go Programs](https://go.dev/blog/pprof)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [K6 Documentation](https://k6.io/docs/)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)

## Troubleshooting

### pprof not working
- Ensure the backend is running
- Check firewall rules
- Verify the URL is correct
- Try `curl` first to test connectivity

### High memory usage in profiles
- Check for goroutine leaks
- Look for unbounded caches
- Review connection pool sizes
- Check for memory-intensive operations

### Slow queries not showing in logs
- Enable PostgreSQL query logging
- Adjust log_min_duration_statement
- Check log file location
- Verify logging configuration

## Next Steps

1. Collect baseline metrics (before optimization)
2. Identify top 3 bottlenecks
3. Implement optimizations
4. Collect new metrics (after optimization)
5. Compare and document improvements
6. Repeat for remaining bottlenecks
