# Feature Audit Issues Tracking

> **Created**: 2024-12-24  
> **Purpose**: Track GitHub issues for feature audit initiative  
> **Source**: [Feature Inventory](feature-inventory.md)

---

## Overview

This document tracks the 25 feature audit issues that need to be created based on the comprehensive feature inventory. Each issue will ensure that a feature category is:
- ✅ Fully implemented and working
- ✅ Properly tested (unit + integration)
- ✅ Correctly typed (TypeScript/Go)
- ✅ Well documented

---

## Issue Status

| # | Feature Category | Priority | Status | Issue Link |
|---|-----------------|----------|--------|------------|
| 1 | Authentication & Authorization | P3 | 📋 Pending | TBD |
| 2 | Clip CRUD Operations | P2 | 📋 Pending | TBD |
| 3 | Clip Submission System | P2 | 📋 Pending | TBD |
| 4 | Scraped Clips | P1 | 📋 Pending | TBD |
| 5 | Voting System | P3 | 📋 Pending | TBD |
| 6 | Favorites/Bookmarking | P3 | 📋 Pending | TBD |
| 7 | User Profiles & Management | P2 | 📋 Pending | TBD |
| 8 | Reputation & Karma System | P3 | 📋 Pending | TBD |
| 9 | Comments System | P3 | 📋 Pending | TBD |
| 10 | Social Features (Following/Blocking) | P2 | 📋 Pending | TBD |
| 11 | Playlists | P2 | 📋 Pending | TBD |
| 12 | Search System | P3 | 📋 Pending | TBD |
| 13 | Feed System | P2 | 📋 Pending | TBD |
| 14 | Discovery Lists & Recommendations | P2 | 📋 Pending | TBD |
| 15 | Content Moderation | P2 | 📋 Pending | TBD |
| 16 | Premium & Subscriptions (Stripe) | P3 | 📋 Pending | TBD |
| 17 | Analytics & Metrics | P2 | 📋 Pending | TBD |
| 18 | Live Streams & Watch Parties | P2 | 📋 Pending | TBD |
| 19 | Community & Forums | P2 | 📋 Pending | TBD |
| 20 | Webhooks & Integrations | P3 | 📋 Pending | TBD |
| 21 | Admin & Moderation Tools | P2 | 📋 Pending | TBD |
| 22 | CI/CD & Deployment Infrastructure | P3 | 📋 Pending | TBD |
| 23 | Monitoring, Security & Database | P2 | 📋 Pending | TBD |
| 24 | Background Jobs & Schedulers | P1 | 📋 Pending | TBD |
| 25 | Additional Features (Queue, Ads, Chat, etc.) | P2 | 📋 Pending | TBD |

**Legend:**
- 📋 Pending: Issue not yet created
- 🚧 In Progress: Issue created, work in progress
- ✅ Complete: All acceptance criteria met
- P1: Critical (broken features or major gaps)
- P2: Important (partial implementation or missing tests)
- P3: Nice-to-have (complete features, verification only)

---

## Priority Breakdown

- **P1 (Critical)**: 2 issues - Broken features need immediate attention
  - #4: Scraped Clips (scheduler tests broken)
  - #24: Background Jobs & Schedulers (some tests failing)

- **P2 (Important)**: 16 issues - Partial implementations or missing tests
  - Features that work but need test coverage, integration tests, or minor completions

- **P3 (Nice-to-have)**: 7 issues - Complete features needing verification
  - Features that are complete but benefit from formal audit and verification

---

## Issue Creation Guidelines

### Required Labels for Each Issue
- `feature-audit` - Main tracking label
- `documentation` - All issues involve docs
- `testing` - All issues involve tests
- `P1`/`P2`/`P3` - Priority label
- Category-specific label (e.g., `authentication`, `clips`, `search`, etc.)

### Milestone
- Assign to: **GA (polish, growth, docs, SEO)**

### Template
Use the template from [feature-inventory.md](feature-inventory.md#issue-template)

---

## Sample Issue Bodies

### Sample 1: P1 Priority (Scraped Clips)

```markdown
## [Feature Audit] Scraped Clips — Completeness + Tests + Typing + Docs

**Feature**: Scraped Clips  
**Category**: Clip Management  
**Status**: ✅ Complete (⚠️ with test failures)  
**Priority**: P1 (Critical)

### Current State
- **Implementation**: ✅ Complete and working
- **Tests**: ⚠️ Scheduler tests failing, service tests pass
- **Typing**: ✅ Complete (Go)
- **Documentation**: ✅ Comprehensive

### Acceptance Criteria
- [ ] Fix failing scheduler tests in `clip_sync_scheduler_test.go`
- [ ] Verify clip scraping runs successfully on schedule (every 15 minutes)
- [ ] Add integration test for end-to-end scraping workflow
- [ ] Verify CDN mirroring works correctly
- [ ] Add performance monitoring for scraping jobs
- [ ] Document error handling and retry logic
- [ ] Verify claimed clips workflow
- [ ] Ensure auto-tagging service works with scraped clips

### How to Verify

**Manual Testing**:
1. Trigger manual sync: `curl -X POST http://localhost:8080/api/v1/admin/sync/clips`
2. Check sync status: `curl http://localhost:8080/api/v1/admin/sync/status`
3. Verify clips appear in database
4. Test clip claiming workflow as creator

**Automated Testing**:
```bash
# Run scheduler tests
cd backend
go test -v ./internal/scheduler/clip_sync_scheduler_test.go

# Run service tests
go test -v ./internal/services/clip_sync_service_test.go

# Run scraper script
./scripts/scrape_clips.sh --dry-run
```

### Known Gaps
- Scheduler tests have race conditions or timing issues
- Performance monitoring not implemented
- Error handling documentation incomplete
- No alerting for failed scraping jobs

### Related Issues
- Related to: Clip submission system
- Blocks: Production scraping deployment

### Documentation Links
- Implementation: `backend/scripts/scrape_clips.go`, `internal/services/clip_sync_service.go`
- API Docs: [Twitch Integration](../backend/twitch-integration.md)
- User Docs: [Scraped Clips](scraped-clips.md)
- Script Docs: [Scraper README](../../backend/scripts/README_SCRAPER.md)
- Inventory: [Feature Inventory - Scraped Clips](feature-inventory.md#23-scraped-clips)

### Labels
`feature-audit`, `P1`, `clips`, `testing`, `documentation`
```

### Sample 2: P2 Priority (Clip Submission)

```markdown
## [Feature Audit] Clip Submission System — Completeness + Tests + Typing + Docs

**Feature**: Clip Submission System  
**Category**: Clip Management  
**Status**: ✅ Complete (🟡 partial tests)  
**Priority**: P2 (Important)

### Current State
- **Implementation**: ✅ Complete and working
- **Tests**: 🟡 Partial - unit tests exist, missing integration/E2E tests
- **Typing**: ✅ Complete (TypeScript + Go)
- **Documentation**: ✅ Complete

### Acceptance Criteria
- [ ] Add end-to-end tests for submission flow
- [ ] Add integration tests for approval/rejection workflow
- [ ] Test abuse detection thoroughly
- [ ] Verify notification system for submission status changes
- [ ] Test bulk moderation actions
- [ ] Document abuse detection tuning parameters
- [ ] Verify rate limiting (10 submissions/hour)
- [ ] Test submission from mobile app

### How to Verify

**Manual Testing**:
1. Submit clip via web: Visit `/submit` page
2. Submit clip via mobile: Use mobile app submit flow
3. Submit clip via API:
```bash
curl -X POST http://localhost:8080/api/v1/submissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clip_url": "https://clips.twitch.tv/..."}'
```
4. Check submission appears in admin queue
5. Approve/reject submission as admin
6. Verify user receives notification

**Automated Testing**:
```bash
# Backend tests
cd backend
go test -v ./internal/services/submission_service_test.go
go test -v ./internal/handlers/submission_handler_test.go

# Frontend tests
cd frontend
npm run test -- SubmitClipPage

# E2E tests (to be added)
npm run test:e2e -- submission
```

### Known Gaps
- E2E submission flow tests missing
- Abuse detection tuning not documented
- Mobile submission testing incomplete
- No load testing for submission queue

### Related Issues
- Related to: Scraped Clips (#4)
- Related to: Clip CRUD (#2)
- Related to: Moderation Queue (#15)

### Documentation Links
- Implementation: `backend/internal/services/submission_service.go`
- API Docs: [Clip Submission API Guide](../backend/clip-submission-api-guide.md)
- Frontend: `frontend/src/pages/SubmitClipPage.tsx`
- Mobile: `mobile/app/submit/index.tsx`
- Inventory: [Feature Inventory - Clip Submission](feature-inventory.md#22-clip-submission-system)

### Labels
`feature-audit`, `P2`, `clips`, `testing`, `documentation`
```

---

## Next Actions

1. **Immediate**: Create all 25 issues in GitHub using the template
2. **Week 1**: Address P1 issues (broken tests, critical gaps)
3. **Week 2-3**: Address P2 issues (partial implementations, missing tests)
4. **Week 4**: Verify P3 issues (complete features)
5. **Ongoing**: Update this tracking document with issue links and status

---

## Notes

- All issues link back to specific sections in [feature-inventory.md](feature-inventory.md)
- Issue template includes verification steps for manual and automated testing
- Each issue documents known gaps from the inventory
- Issues are labeled consistently for easy filtering and tracking
- Milestone: GA (polish, growth, docs, SEO)

---

*This tracking document will be updated as issues are created and resolved.*
