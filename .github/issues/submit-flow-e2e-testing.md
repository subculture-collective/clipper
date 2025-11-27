# [Feature] Comprehensive E2E Testing for Clip Submission Flow

## Summary

Implement end-to-end testing for the complete clip submission workflow covering frontend, mobile, backend API, moderation queue, and approval process. This ensures the entire user-submitted content system works reliably before production launch.

## Scope

### Backend Integration Tests

- **Submit endpoint**: POST /api/v1/submissions with full workflow
- **Metadata endpoint**: GET /api/v1/submissions/metadata
- **Moderation endpoints**: Admin approval/rejection flow
- **Auto-approval logic**: High-karma user bypass testing
- **Rate limiting**: Verify submission throttling
- **Duplicate detection**: Test existing clip rejection

### Frontend E2E Tests (Playwright)

- **Submit page**: Full form submission workflow
- **User submissions page**: List, filter, status display
- **Moderation queue**: Admin approval/rejection flow
- **Error scenarios**: Network errors, validation failures
- **Success flows**: Submission → moderation → approval → feed

### Mobile E2E Tests (Detox)

- **4-step wizard**: Complete submission flow
- **URL validation**: Valid/invalid URL handling
- **Metadata fetch**: Real API integration test
- **Tag management**: Add/remove tags flow
- **NSFW toggle**: Flag submission correctly
- **Success/error states**: Proper feedback display

### Load Testing

- Concurrent submissions (100 users)
- Metadata endpoint performance (<500ms p95)
- Database query performance under load
- Redis cache effectiveness
- Rate limiting behavior under stress

### Security Testing

- Authentication bypass attempts
- CSRF protection verification
- SQL injection testing on text inputs
- XSS attempts in custom titles/tags
- Rate limit evasion attempts
- Authorization checks (user can't approve own submission)

## Acceptance Criteria

### Integration Tests

- [ ] Full submit workflow: URL → metadata → submit → approve → published
- [ ] Auto-approval for users with karma ≥ 500
- [ ] Manual moderation for users with karma < 500
- [ ] Duplicate clip rejection (same clip_id)
- [ ] Rate limiting enforced (5 submissions/hour for new users)
- [ ] NSFW flag properly stored and displayed
- [ ] Custom titles and tags saved correctly
- [ ] Rejection reasons stored and displayed to user

### Frontend E2E Tests

- [ ] Submit form validation works (URL, title, tags)
- [ ] Metadata auto-fetches from backend
- [ ] Submission success shows confirmation
- [ ] User submissions page displays all statuses
- [ ] Admin can approve/reject from moderation queue
- [ ] Approved clips appear in main feed
- [ ] Rejected clips show reason to submitter

### Mobile E2E Tests

- [ ] All 4 steps complete successfully
- [ ] Back navigation preserves state
- [ ] Metadata loading state displays correctly
- [ ] Tag limit enforced (max 5 tags)
- [ ] NSFW toggle works correctly
- [ ] Success screen shows next actions
- [ ] Error screen allows retry

### Load Tests

- [ ] 100 concurrent users submit clips successfully
- [ ] Metadata endpoint: p95 < 500ms, p99 < 1000ms
- [ ] Submit endpoint: p95 < 300ms, p99 < 600ms
- [ ] Database connection pool stable under load
- [ ] Redis cache hit rate > 80%
- [ ] No rate limit false positives

### Security Tests

- [ ] Unauthenticated requests rejected (401)
- [ ] User cannot approve own submissions
- [ ] Admin-only endpoints reject regular users (403)
- [ ] CSRF tokens validated on POST requests
- [ ] SQL injection attempts safely handled
- [ ] XSS in titles/tags properly escaped
- [ ] Rate limiting cannot be bypassed

### Documentation

- [ ] Test suite setup documented in `docs/TESTING.md`
- [ ] CI/CD pipeline includes E2E tests
- [ ] Test data fixtures documented
- [ ] Troubleshooting guide for common failures

## Priority

**P0 (Critical - MVP blocker)**

Cannot launch user-submitted content without verified end-to-end testing.

## Milestone

**MVP** (foundations, must-fixes, go-to-market blockers)

## Tech Notes

### Test Stack

**Frontend E2E**: Playwright

- Already in package.json
- Cross-browser testing (Chromium, Firefox, WebKit)
- Visual regression testing capability

**Mobile E2E**: Detox

- React Native testing framework
- iOS simulator + Android emulator
- Supports deep linking and native features

**Backend Integration**: Go testing + testcontainers

- Real PostgreSQL container
- Real Redis container
- Isolated test database per run

**Load Testing**: k6

- Already have k6 scripts in `backend/tests/load/scenarios/submit.js`
- Extend with metadata endpoint tests
- Add realistic user behavior scenarios

### Test Data Setup

Create test fixtures:

```go
// High-karma user (auto-approval)
testUserHighKarma := User{
    ID: "test-high-karma",
    KarmaPoints: 600,
}

// Low-karma user (manual moderation)
testUserLowKarma := User{
    ID: "test-low-karma",
    KarmaPoints: 50,
}

// Sample Twitch clip URLs
testClipURLs := []string{
    "https://clips.twitch.tv/FamousCrispyEelPJSalt",
    "https://www.twitch.tv/shroud/clip/ToughSillyFrogFunRun",
}
```

### CI/CD Integration

Add to GitHub Actions workflow:

```yaml
e2e-tests:
    runs-on: ubuntu-latest
    services:
        postgres:
            image: postgres:16
        redis:
            image: redis:7
    steps:
        - name: Backend Integration Tests
          run: make test-integration
        - name: Frontend E2E Tests
          run: cd frontend && npm run test:e2e
        - name: Load Tests (smoke)
          run: k6 run --vus 10 --duration 30s backend/tests/load/scenarios/submit.js
```

### Performance Targets

| Metric                | Target | Current |
| --------------------- | ------ | ------- |
| Metadata fetch (p95)  | <500ms | TBD     |
| Submit (p95)          | <300ms | TBD     |
| Moderation list (p95) | <200ms | TBD     |
| Cache hit rate        | >80%   | TBD     |
| Concurrent users      | 100+   | TBD     |

### Test Coverage Goals

- Backend: >80% coverage for submission handlers/services
- Frontend: All critical user paths covered
- Mobile: All 4 steps + success/error states
- Integration: Full workflow from submit → feed

### Security Test Tools

- **OWASP ZAP**: Automated vulnerability scanning
- **sqlmap**: SQL injection testing
- **Burp Suite Community**: Manual security testing
- **Custom scripts**: Rate limit bypass attempts

## Related Issues

- Depends on: #[Backend Metadata Integration]
- Depends on: Mobile submit flow (already implemented)
- Depends on: Frontend submit flow (already implemented)
- Enables: Production launch of user submissions
- Related: #396 (MFA for admins - security testing)
- Related: #397 (Secrets management - security testing)
