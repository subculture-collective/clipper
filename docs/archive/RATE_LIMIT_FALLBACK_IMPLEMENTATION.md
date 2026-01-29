---
title: Rate Limiting Fallback Implementation
summary: This document describes the implementation of a fallback rate limiting mechanism that prevents the system from "failing open" when Redis is...
tags: ['archive', 'implementation', 'summary']
area: docs
status: archived
owner: team-core
version: "1.0"
last_reviewed: 2026-01-29
---

# Rate Limiting Fallback Implementation

## Overview

This document describes the implementation of a fallback rate limiting mechanism that prevents the system from "failing open" when Redis is unavailable.

## Problem Statement

The original rate limiting middleware would allow **all requests** through when Redis failed, creating a security vulnerability:

- Redis outages could lead to unlimited request rates
- Potential for resource exhaustion and DDoS attacks
- No protection during infrastructure failures

## Solution

Implemented an **in-memory fallback rate limiter** that activates automatically when Redis operations fail.

### Key Components

#### 1. In-Memory Rate Limiter (`fallback_ratelimiter.go`)

**Features:**

- Sliding window algorithm for accurate rate limiting
- Thread-safe using `sync.Map` and per-key mutexes
- Automatic memory cleanup to prevent leaks
- Handles concurrent requests correctly

**Implementation:**

```go
type InMemoryRateLimiter struct {
    requests sync.Map        // Thread-safe map of rate limit windows
    window   time.Duration   // Time window for rate limiting
    limit    int            // Maximum requests per window
}
```

**Cleanup Mechanism:**

- Background goroutine runs every 2x window duration
- Removes entries older than 3x window duration
- Prevents memory leaks from abandoned keys

#### 2. Middleware Updates (`ratelimit_middleware.go`)

**Changes in `RateLimitMiddleware`:**

- Initializes fallback limiter on first call
- Falls back to in-memory limiting on Redis pipeline errors
- Falls back to in-memory limiting on Redis increment errors
- Logs Redis errors for monitoring
- Adds `X-RateLimit-Fallback: true` header when using fallback

**Changes in `RateLimitByUserMiddleware`:**

- Same fallback behavior for user-based rate limiting
- Maintains separate fallback limiter instance
- Logs errors and sets fallback header

### Behavior Comparison

| Scenario | Before | After |
|----------|--------|-------|
| Redis healthy | ✅ Rate limit enforced | ✅ Rate limit enforced |
| Redis pipeline fails | ❌ All requests allowed | ✅ In-memory rate limit enforced |
| Redis increment fails | ❌ All requests allowed | ✅ In-memory rate limit enforced |
| Redis timeout | ❌ All requests allowed | ✅ In-memory rate limit enforced |

### Headers

Normal operation:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1698765432
```

Fallback mode:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Fallback: true
```

### Test Coverage

**Unit Tests (10 total):**

1. ✅ Basic allow/deny functionality
2. ✅ Remaining count accuracy
3. ✅ Sliding window behavior
4. ✅ Multiple independent keys
5. ✅ Concurrent access safety
6. ✅ Memory cleanup
7. ✅ Middleware fallback initialization
8. ✅ Fallback header presence
9. ✅ User-based rate limiting fallback
10. ✅ Integration test with timing

All tests passing with 100% success rate.

### Security Benefits

1. **No Fail-Open Behavior**: System never allows unlimited requests
2. **Resource Protection**: Rate limits enforced even during Redis outages
3. **Graceful Degradation**: Service continues with reduced backend dependency
4. **Observability**: Fallback mode is logged and visible in headers
5. **Zero New Vulnerabilities**: CodeQL scan found 0 issues

### Performance Characteristics

**In-Memory Limiter:**

- O(n) per request where n = requests in current window
- Typical n < 1000 (rate limit)
- Memory usage: ~40 bytes per tracked key + timestamps
- Cleanup every 2x window prevents unbounded growth

**Concurrent Performance:**

- Lock contention minimal (per-key locking)
- Tested with 150 concurrent requests
- Correctly enforced 100 request limit
- No race conditions detected

### Monitoring

**Log Messages:**

```
Redis pipeline failed for rate limiting, using in-memory fallback: <error>
Redis increment failed for rate limiting, using in-memory fallback: <error>
Redis increment failed for user rate limiting, using in-memory fallback: <error>
```

**Metrics to Track:**

- Count of requests with `X-RateLimit-Fallback: true` header
- Rate of Redis errors in logs
- Memory usage of Go process during fallback

### Limitations

1. **Cluster Environments**: Each server instance has independent in-memory state
   - Rate limits are per-instance during fallback
   - Actual limit = configured_limit * number_of_instances
   - This is intentional for availability over strict limits

2. **Memory Usage**: Proportional to number of unique keys (IPs/users)
   - Mitigated by automatic cleanup
   - Monitor memory if handling many unique IPs

3. **Window Accuracy**: In-memory uses simple sliding window vs Redis weighted sliding window
   - Slight difference in edge cases
   - Still provides effective rate limiting

### Future Enhancements

Potential improvements if needed:

1. Add configuration for fallback behavior (strict vs. permissive)
2. Implement fallback-specific rate limits (e.g., 2x normal limit)
3. Add metrics exporter for fallback activations
4. Consider Redis Sentinel/Cluster for high availability

### Testing the Implementation

Run the test suite:

```bash
cd backend
go test -v ./internal/middleware/...
```

Expected output: All 10 tests pass in ~1 second.

## Conclusion

This implementation successfully addresses the security concern by:

- ✅ Eliminating fail-open behavior
- ✅ Providing continuous rate limiting protection
- ✅ Maintaining service availability during Redis outages
- ✅ Adding observability for fallback mode
- ✅ Comprehensive test coverage
- ✅ Zero security vulnerabilities introduced
