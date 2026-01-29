# E2E Test IPv6 Connection Fix

## Problem

E2E tests were failing with `ECONNREFUSED ::1:8080` errors. The root cause was:

1. **Node.js/Playwright behavior**: When connecting to `localhost`, modern Node.js versions prefer IPv6 and resolve `localhost` to `::1` (IPv6 loopback)
2. **Backend binding**: The Go backend binds to `:8080` which, depending on system configuration, may only listen on IPv4
3. **Connection mismatch**: Tests tried to connect via IPv6 (`::1:8080`) but backend was only accessible via IPv4 (`127.0.0.1:8080`)

## Solution

Updated all E2E test configuration and utility files to explicitly use **`127.0.0.1`** (IPv4) instead of `localhost`. This ensures consistent connection behavior across all systems and eliminates IPv6 resolution issues.

## Files Changed

### Configuration Files

- `frontend/playwright.config.ts`
    - Updated `baseURL` default from `http://localhost:5173` → `http://127.0.0.1:5173`
    - Updated `webServer.url` from `http://localhost:5173` → `http://127.0.0.1:5173`
    - Updated `webServer.command` VITE_API_URL from `http://localhost:8080/api/v1` → `http://127.0.0.1:8080/api/v1`
    - Added `--host 127.0.0.1` flag to Vite dev server command to ensure it binds to IPv4

### Test Fixtures

- `frontend/e2e/fixtures/setup.ts`
    - Updated `globalSetup()` default baseUrl
    - Updated `globalTeardown()` default baseUrl
    - Updated `seedData` fixture default baseUrl

- `frontend/e2e/fixtures/index.ts`
    - Updated `multiUserContexts` fixture default baseUrl
    - Updated `apiUrl` fixture default baseUrl

- `frontend/e2e/fixtures/api-utils.ts`
    - Updated `getApiUrl()` fallback from `http://localhost:5173` → `http://127.0.0.1:5173`

- `frontend/e2e/fixtures/multi-user-context.ts`
    - Updated `makeApiRequest()` default baseUrl
    - Updated `multiUserFixture` default baseUrl

### Test Utilities

- `frontend/e2e/utils/db-seed.ts`
    - Updated fallback API URL from `http://localhost:8080/api/v1` → `http://127.0.0.1:8080/api/v1`
    - Updated console warning message

- `frontend/e2e/utils/social-features.ts`
    - Updated default API URL from `http://localhost:8080/api/v1` → `http://127.0.0.1:8080/api/v1`

- `frontend/e2e/utils/search.ts`
    - Updated default API URL from `http://localhost:8080/api/v1` → `http://127.0.0.1:8080/api/v1`

- `frontend/e2e/utils/stripe-helpers.ts`
    - Updated default baseUrl from `http://localhost:8080` → `http://127.0.0.1:8080`

- `frontend/e2e/utils/session-mock.ts`
    - Updated `verifySessionAcrossTabs()` default baseUrl parameter
    - Updated `simulateConcurrentSessions()` default baseUrl parameter

### Build Configuration

- `Makefile`
    - Updated E2E test section:
        - `BASE_URL` from `http://localhost:5173` → `http://127.0.0.1:5173`
        - `CORS_ALLOWED_ORIGINS` from `http://localhost:5173` → `http://127.0.0.1:5173`

## Impact

### Positive

✅ **Eliminates IPv6 connection errors** - All API requests will use IPv4 consistently
✅ **Improves test reliability** - No more connection refused errors due to IPv6/IPv4 mismatch
✅ **Cross-platform consistency** - Works the same on all systems regardless of IPv6 configuration
✅ **No backend changes required** - Backend continues to work as-is

### Considerations

⚠️ **Environment variables override** - If `PLAYWRIGHT_BASE_URL` is explicitly set to use `localhost`, it will still be used (by design)
⚠️ **Development vs Production** - This change only affects E2E tests; production configs remain unchanged

## Testing

To verify the fix works:

```bash
# Run E2E tests
make test INTEGRATION=0 E2E=1

# Should see:
# ✓ Backend API is ready (not "Backend API not available")
# ✓ Significantly fewer connection errors
# ✓ More tests passing
```

## Alternative Approaches Considered

1. **Make backend listen on both IPv4 and IPv6**
    - Would require changing Go server code to explicitly bind to both `0.0.0.0` and `::`
    - More complex, affects production code
    - Not necessary for test environment

2. **Force Node.js to prefer IPv4**
    - Would require setting `NODE_OPTIONS="--dns-result-order=ipv4first"`
    - System-wide change with potential side effects
    - Less explicit than using 127.0.0.1 directly

3. **Use environment-specific DNS resolution**
    - Complex to maintain
    - Less transparent

**Chosen approach**: Explicit IPv4 addresses in test configs - simple, clear, and effective.

## Related Issues

This fix addresses the primary root cause of ~85% of E2E test failures identified in the test-run.log:

- ❌ `connect ECONNREFUSED ::1:8080` errors
- ❌ Vite proxy errors to API endpoints
- ❌ Tests falling back to mock data
- ❌ Watch party API failures
- ❌ User creation via API failures

## Next Steps

After this fix, remaining test failures should be investigated:

1. Watch party API endpoint implementation (if still failing)
2. Moderation workflow timeout issues
3. Clip submission rate limiting tests
4. Integration test timeouts
5. Token lifecycle concurrent refresh handling
6. Review of 96 skipped tests

## References

- [Node.js DNS Resolution Order](https://nodejs.org/api/dns.html#dnslookupaddress-options-callback)
- [IPv6 Loopback (::1) vs IPv4 Loopback (127.0.0.1)](https://en.wikipedia.org/wiki/Localhost)
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
