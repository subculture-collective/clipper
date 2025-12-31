# Rate Limiting Load & Accuracy Tests

## Quick Reference

This document provides a quick reference for the rate limiting load tests implemented in `scenarios/rate_limiting.js`.

## Purpose

Validate that rate limiting is enforced correctly across all key endpoints with accurate headers and acceptable performance.

## Endpoints Tested

| Endpoint | Rate Limit (Basic) | Rate Limit (Premium) | Test Pattern | Notes |
|----------|-------------------|---------------------|--------------|-------|
| Submission | 10/hour | 50/hour (5x) | 15 requests over 2 min | Most requests will be rate limited |
| Metadata | 100/hour | 500/hour (5x) | 120 requests over 2 min | Most requests will be rate limited |
| Watch Party Create | 10/hour | N/A | 15 requests over 2 min | Most requests will be rate limited |
| Watch Party Join | 30/hour | N/A | 40 requests over 2 min | Most requests will be rate limited |
| Search | Variable | Variable | Variable | Tests basic rate limiting |

## Running the Tests

### Local Execution

```bash
# Set authentication token (required)
export AUTH_TOKEN="your_jwt_token"

# Run the test
make test-load-rate-limiting

# Or run directly with k6
k6 run -e AUTH_TOKEN=$AUTH_TOKEN backend/tests/load/scenarios/rate_limiting.js
```

### CI Execution

1. Navigate to **Actions** → **Load Tests** in GitHub
2. Click **Run workflow**
3. Select test type: `rate-limiting`
4. Click **Run workflow**
5. Download artifacts after completion

## Test Scenarios

The test runs 5 concurrent scenarios, each for 2 minutes:

1. **Submission Rate Limit** (0-2 min)
   - Tests: `/api/v1/submissions` POST
   - Pattern: 15 requests over 2 minutes
   - Expected: Most requests rate limited after exceeding 10/hour limit

2. **Metadata Rate Limit** (2-4 min)
   - Tests: `/api/v1/submissions/metadata` GET
   - Pattern: 120 requests over 2 minutes
   - Expected: Most requests rate limited after exceeding 100/hour limit

3. **Watch Party Create Rate Limit** (4-6 min)
   - Tests: `/api/v1/watch-parties` POST
   - Pattern: 15 requests over 2 minutes
   - Expected: Most requests rate limited after exceeding 10/hour limit

4. **Watch Party Join Rate Limit** (6-8 min)
   - Tests: `/api/v1/watch-parties/:id/join` POST
   - Pattern: 40 requests over 2 minutes
   - Expected: Most requests rate limited after exceeding 30/hour limit

5. **Search Rate Limit** (8-10 min)
   - Tests: `/api/v1/search` GET
   - Rate: Variable (10 VUs)
   - Expected: Variable

## Success Criteria

### Rate Limiting Accuracy
- ✅ Rate limiting activates when hourly limit is exceeded
- ✅ Requests within limit are allowed
- ✅ Requests over limit receive 429 responses
- ✅ Rate limiting enforcement is consistent

### Headers Validation
- ✅ `X-RateLimit-Limit` header present and correct
- ✅ `X-RateLimit-Remaining` header present and decrements
- ✅ `X-RateLimit-Reset` header present on allowed requests
- ✅ `Retry-After` header present on 429 responses

### Performance
- ✅ Submission p95 < 250ms
- ✅ Metadata p95 < 150ms
- ✅ Watch Party Create p95 < 200ms
- ✅ Watch Party Join p95 < 150ms
- ✅ Search p95 < 150ms
- ✅ Error rate < 1% (excluding expected 429s)

### Premium Tier Testing
- ✅ Premium users get 5x rate limit multiplier
- ✅ Admin users bypass rate limits completely

## Output & Reports

### Console Output
The test outputs real-time metrics including:
- Request counts (attempts, allowed, blocked)
- Latency metrics (p95, p99, avg)
- Rate limit hit rate
- Check success rates

### Generated Files
- **JSON metrics**: `reports/rate_limiting_<timestamp>.json`
- **HTML report**: `reports/rate_limiting_<timestamp>.html`
- **CI artifacts**: Uploaded with 90-day retention

### Key Metrics to Monitor

```
Custom Metrics:
- submission_attempts: Total submission attempts
- submission_allowed: Successfully submitted
- submission_blocked: Rate limited (429)
- metadata_attempts: Total metadata requests
- metadata_allowed: Successfully fetched
- metadata_blocked: Rate limited (429)
- watch_party_create_attempts: Total create attempts
- watch_party_create_allowed: Successfully created
- watch_party_create_blocked: Rate limited (429)
- watch_party_join_attempts: Total join attempts
- watch_party_join_allowed: Successfully joined
- watch_party_join_blocked: Rate limited (429)
- rate_limit_hits: Overall rate limit hit rate
- errors: Functional errors excluding 429s (< 1%)

Latency Metrics:
- submission_latency: Submission endpoint latency
- metadata_latency: Metadata endpoint latency
- watch_party_create_latency: Watch party create latency
- watch_party_join_latency: Watch party join latency
- search_latency: Search endpoint latency
```

## Interpreting Results

### Good Results ✅
```
submission_attempts: 15
submission_allowed: 1-2 (within 10/hour limit for 2-min window)
submission_blocked: 13-14 (exceeding hourly limit)
rate_limit_hits: high percentage
errors: 0.5% (functional errors only, not 429s)
http_req_duration{endpoint:submission} p(95): 180ms
```

### Warning Signs ⚠️
- No requests blocked when rate should be exceeded
- Missing rate limit headers
- High functional error rate (>1% excluding 429s)
- p95 latency exceeding thresholds
- Rate limit headers showing incorrect values

### Common Issues

#### Issue: No requests blocked
**Possible causes:**
- Rate limiting middleware not applied to endpoint
- Redis connection failed (fallback to in-memory)
- Rate limit configuration too high
- Admin/whitelisted IP being used

**Debug:**
1. Check middleware is applied in `backend/cmd/api/main.go`
2. Verify Redis is connected and healthy
3. Check rate limit configuration in code
4. Confirm test is not using admin token

#### Issue: All requests blocked
**Possible causes:**
- Rate limit configuration too low
- Previous test didn't complete (state in Redis)
- Redis time skew

**Debug:**
1. Clear Redis: `redis-cli FLUSHDB`
2. Check rate limit configuration
3. Verify system time is correct

#### Issue: Headers missing
**Possible causes:**
- Middleware not adding headers
- Response intercepted before headers added
- Header name case mismatch

**Debug:**
1. Check middleware implementation
2. Verify middleware order in router
3. Check header casing (use X-RateLimit-Limit with capital L)

#### Issue: High latency
**Possible causes:**
- Redis performance issues
- Sliding window calculation overhead
- Network latency

**Debug:**
1. Check Redis performance metrics
2. Profile middleware execution time
3. Check network latency to Redis

## Advanced Usage

### Custom Rate Limits
To test different rate limits, modify the scenario:

```javascript
// In rate_limiting.js
export const options = {
    scenarios: {
        custom_rate_limit: {
            executor: 'constant-arrival-rate',
            exec: 'testSubmissionRateLimit',
            rate: 20, // Your custom rate
            timeUnit: '1h',
            duration: '2m',
            preAllocatedVUs: 5,
            maxVUs: 10,
        },
    },
};
```

### Testing Premium Users
To test premium user rate limits, use a premium user token:

```bash
# Get premium user token
export AUTH_TOKEN="premium_user_jwt_token"

# Run test
k6 run -e AUTH_TOKEN=$AUTH_TOKEN backend/tests/load/scenarios/rate_limiting.js
```

Expected: Higher allowed request counts (5x multiplier)

### Extended Duration
For longer tests, modify scenario durations:

```javascript
duration: '10m', // Instead of '2m'
```

## Maintenance

### When to Run
- **Before deploying rate limit changes**: Validate configuration
- **After infrastructure changes**: Verify Redis performance
- **During capacity planning**: Understand rate limiting overhead
- **Nightly in CI**: Continuous validation

### Updating Test
When rate limits change in code, update:
1. Test rates in scenario configuration
2. Expected blocked percentages
3. Threshold values if needed
4. Documentation

### Baseline Updates
After validating new rate limits work correctly:
1. Run test multiple times
2. Capture baseline metrics
3. Update documentation
4. Commit baseline files

## Troubleshooting

### Test Won't Start
```bash
# Check k6 is installed
k6 version

# Check backend is running
curl http://localhost:8080/health

# Check AUTH_TOKEN is set
echo $AUTH_TOKEN
```

### Test Fails Immediately
- Verify backend is accessible
- Check AUTH_TOKEN is valid
- Ensure Redis is running
- Clear Redis state if needed

### Results Don't Match Expected
- Run test multiple times (sample size)
- Check for clock skew
- Verify rate limit configuration
- Check for admin/whitelisted IP

## Related Documentation
- Main testing guide: `docs/testing/TESTING.md`
- Load test README: `backend/tests/load/README.md`
- Rate limit middleware: `backend/internal/middleware/ratelimit_middleware.go`
- Submission rate limiting doc: `docs/backend/submission-rate-limiting.md`

## Support
For issues or questions:
1. Check this document
2. Review main testing documentation
3. Check GitHub Issues
4. Contact team leads
