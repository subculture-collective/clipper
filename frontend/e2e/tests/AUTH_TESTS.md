# Authentication & Session E2E Tests

Comprehensive end-to-end test suite for authentication, MFA, session management, and token lifecycle using Playwright.

## Overview

This test suite provides complete coverage for:
- **Twitch OAuth authentication** - Success, errors, abort, PKCE validation
- **Multi-Factor Authentication (MFA)** - TOTP enrollment, challenges, recovery codes
- **Session Management** - Persistence, reloads, multi-tab synchronization
- **Token Lifecycle** - Access token refresh, expiry, rotation
- **Logout Flows** - Token revocation, session cleanup
- **Concurrent Sessions** - Multiple devices, session isolation, limits

## Test Files

### `auth-oauth.spec.ts`
Tests for Twitch OAuth authentication flows:
- ✅ Successful OAuth login flow
- ✅ OAuth access_denied error handling
- ✅ OAuth server error handling
- ✅ OAuth abort/cancel flow
- ✅ OAuth state parameter validation (CSRF protection)
- ✅ PKCE OAuth flow
- ✅ OAuth without required PKCE parameters (rejection)
- ✅ OAuth popup window handling
- ✅ Redirect to intended page after login
- ✅ OAuth timeout handling

### `auth-mfa.spec.ts`
Tests for Multi-Factor Authentication:
- ✅ MFA enrollment with TOTP
- ✅ TOTP code verification during enrollment
- ✅ Invalid TOTP code rejection
- ✅ MFA challenge with valid TOTP code
- ✅ MFA challenge with invalid TOTP code
- ✅ Authentication with recovery code
- ✅ Recovery code regeneration
- ✅ MFA disable flow
- ✅ Account lockout after failed attempts
- ✅ Display remaining attempts

### `auth-session.spec.ts`
Tests for session management:
- ✅ Session persistence across page navigation
- ✅ Session persistence across page reload
- ✅ Session sharing across multiple tabs
- ✅ Session expiry handling
- ✅ Token refresh before expiry
- ✅ Token refresh on 401 response
- ✅ Logout and session cleanup
- ✅ Logout clears session across all tabs
- ✅ Refresh token failure handling
- ✅ Session maintenance during long activity
- ✅ Session storage types (localStorage, sessionStorage, cookies)
- ✅ Concurrent refresh request handling

### `auth-token-lifecycle.spec.ts`
Tests for token lifecycle management:
- ✅ Automatic token refresh before expiry
- ✅ Token refresh on 401 unauthorized
- ✅ Refresh token rotation
- ✅ Token invalidation on backend error
- ✅ Concurrent refresh request handling
- ✅ Token expiry edge cases
- ✅ No refresh for valid tokens
- ✅ Revoke refresh token on logout
- ✅ Clear all session data on logout
- ✅ Redirect to home after logout
- ✅ Logout failure handling
- ✅ Prevent using old tokens after logout

### `auth-concurrent-sessions.spec.ts`
Tests for concurrent session management:
- ✅ Multiple sessions per user allowed
- ✅ Session isolation between contexts/devices
- ✅ Logout in one session without affecting others
- ✅ Multiple tabs in same session
- ✅ Session limit enforcement
- ✅ Session takeover prevention
- ✅ Active session tracking
- ✅ Revoking specific sessions

## Test Utilities

### `oauth-mock.ts`
OAuth mocking utilities:
- `mockOAuthSuccess()` - Mock successful OAuth flow
- `mockOAuthError()` - Mock OAuth errors (access_denied, server_error, etc.)
- `mockOAuthAbort()` - Mock OAuth abort/cancel
- `mockOAuthInvalidState()` - Mock invalid state parameter
- `mockOAuthPKCE()` - Mock PKCE OAuth flow
- `generateMockTokens()` - Generate mock OAuth tokens
- `generateMockUser()` - Generate mock user data
- `clearOAuthMocks()` - Clear all OAuth mocks

### `mfa-mock.ts`
MFA mocking utilities:
- `mockMFAEnrollment()` - Mock MFA enrollment flow
- `mockMFAEnrollmentVerification()` - Mock TOTP verification during enrollment
- `mockMFAChallenge()` - Mock MFA challenge during login
- `mockMFARecoveryCode()` - Mock recovery code usage
- `mockMFADisable()` - Mock MFA disable flow
- `mockMFAStatus()` - Mock MFA status check
- `mockMFARegenerateRecoveryCodes()` - Mock recovery code regeneration
- `mockMFALockout()` - Mock account lockout
- `generateMockTOTPSecret()` - Generate mock TOTP secret
- `generateMockRecoveryCodes()` - Generate mock recovery codes
- `clearMFAMocks()` - Clear all MFA mocks

### `session-mock.ts`
Session and token management utilities:
- `setSessionTokens()` - Set session tokens in storage
- `getSessionTokens()` - Get session tokens from storage
- `clearSessionTokens()` - Clear all session tokens
- `verifySessionPersistence()` - Verify session persists across navigation
- `verifySessionPersistsOnReload()` - Verify session persists on reload
- `verifySessionAcrossTabs()` - Verify session sharing across tabs
- `mockTokenRefresh()` - Mock token refresh endpoint
- `simulateTokenExpiry()` - Simulate expired token
- `mock401Response()` - Mock 401 unauthorized response
- `mockTokenRefreshOn401()` - Mock token refresh triggered by 401
- `mockLogout()` - Mock logout endpoint
- `verifyLogoutClearsSession()` - Verify logout clears all session data
- `clearSessionMocks()` - Clear all session mocks

## Running Tests

### Run all authentication tests
```bash
npm run test:e2e -- auth-
```

### Run specific test file
```bash
npm run test:e2e -- auth-oauth.spec.ts
npm run test:e2e -- auth-mfa.spec.ts
npm run test:e2e -- auth-session.spec.ts
npm run test:e2e -- auth-token-lifecycle.spec.ts
npm run test:e2e -- auth-concurrent-sessions.spec.ts
```

### Run with UI mode
```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser)
```bash
npx playwright test auth-oauth.spec.ts --headed
```

### Run specific test
```bash
npx playwright test --grep "should complete successful OAuth login"
```

### Run with debugging
```bash
npx playwright test auth-oauth.spec.ts --debug
```

## Test Configuration

Tests use the main Playwright configuration from `playwright.config.ts`:
- **Timeout**: 30 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Workers**: 4 on CI, auto-detect locally
- **Browsers**: Chromium, Firefox, WebKit
- **Artifacts**: Screenshots, videos, traces on failure

## Environment Variables

```bash
# Set base URL for tests
export PLAYWRIGHT_BASE_URL=http://localhost:5173

# Set API URL for backend calls
export VITE_API_URL=http://localhost:8080/api/v1
```

## Test Patterns

### Using Mocks
```typescript
import { mockOAuthSuccess } from '../utils/oauth-mock';

test('example test', async ({ page }) => {
  // Mock OAuth
  await mockOAuthSuccess(page, {
    user: { username: 'testuser' },
  });

  // Perform test actions
  await page.goto('/');
  // ...
});
```

### Verifying Session
```typescript
import { getSessionTokens, verifySessionPersistence } from '../utils/session-mock';

test('example session test', async ({ page }) => {
  // Set up session
  const tokens = await getSessionTokens(page);
  expect(tokens).toBeTruthy();

  // Verify persistence
  const persisted = await verifySessionPersistence(page);
  expect(persisted).toBeTruthy();
});
```

### Testing MFA
```typescript
import { mockMFAChallenge } from '../utils/mfa-mock';

test('example MFA test', async ({ page }) => {
  // Mock MFA challenge
  await mockMFAChallenge(page, {
    shouldSucceed: true,
    expectedCode: '123456',
  });

  // Test MFA flow
  // ...
});
```

## Best Practices

1. **Always clean up mocks** - Use `afterEach()` to clear mocks
2. **Use proper timeouts** - Allow time for async operations
3. **Handle UI variations** - Check if elements exist before interacting
4. **Mock external dependencies** - Don't rely on real OAuth/API endpoints
5. **Test isolation** - Each test should be independent
6. **Use descriptive test names** - Clearly state what is being tested

## Troubleshooting

### Tests timeout
- Increase timeout in test: `test.setTimeout(60000)`
- Check if mock endpoints are set up correctly
- Verify UI elements exist before interacting

### Mocks not working
- Ensure mocks are set up before navigation
- Check URL patterns match actual API calls
- Clear mocks in `afterEach()` to avoid interference

### Session not persisting
- Verify correct storage type (local/session/cookie)
- Check if cookies are allowed in test browser
- Ensure proper domain for cookies

### CI failures
- Review CI logs and artifacts
- Check screenshots and traces
- Verify environment variables are set
- Ensure browsers are installed

## Coverage Metrics

Target metrics for this test suite:
- ✅ **100% pass rate** in stable CI runs for auth scenarios
- ✅ **< 1% flakiness** across 50 consecutive nightly runs
- ✅ **Average test time** per scenario < 10s
- ✅ **Code coverage** for auth flows > 90%

## CI Integration

Tests run automatically on:
- Pull request creation/updates
- Push to main/develop branches
- Nightly scheduled runs

Artifacts available:
- HTML test report
- Screenshots on failure
- Video recordings on failure
- Trace files for debugging

## Related Documentation

- [Playwright E2E Framework](../README.md)
- [Backend Auth Documentation](../../../backend/internal/handlers/auth_handler.go)
- [Frontend Auth Context](../../../frontend/src/context/AuthContext.tsx)
- [MFA Service](../../../backend/internal/services/mfa_service.go)

## Contributing

When adding new auth tests:
1. Follow existing patterns in test files
2. Use appropriate mock utilities
3. Add cleanup in `afterEach()`
4. Document new mocks in utility files
5. Update this README with new test coverage
6. Ensure tests pass in all browsers
7. Check for flakiness (run 10+ times)

## Support

For questions or issues with auth tests:
1. Check existing test examples
2. Review utility function documentation
3. Check Playwright documentation
4. Open an issue with test logs and artifacts
