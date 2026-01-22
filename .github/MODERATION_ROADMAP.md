# 🛡️ ROADMAP: Voluntary Ban Sync & Moderation System

**Status:** Planning
**Target Completion:** Q2 2026
**Priority:** P1 - High
**Owner:** Community Moderation Team

---

## Overview

This roadmap defines the implementation of a voluntary Twitch ban synchronization feature with clear distinction between **community moderators** (channel-specific) and **site moderators** (platform-wide). The system will allow streamers to voluntarily share their ban lists within the Clipper platform while maintaining proper role-based access control.

### Key Objectives
- ✅ Enable Twitch channel owners to sync their bans into Clipper
- ✅ Distinguish community moderators from site moderators with granular permissions
- ✅ Audit all moderation decisions and actions
- ✅ Comprehensive testing at unit, integration, and E2E levels
- ✅ Production-ready deployment with monitoring

### Why This Feature
**Privacy-first & Community-scoped approach:** Bans are **channel-specific, not sitewide**. A user banned from Channel A can still fully interact with Channel B. Only authorized moderators can view/act on bans from their channel(s). Site moderators have cross-channel visibility. This prevents harassment tracking while enabling community self-governance.

### Critical: Ban Scope Clarification
**Bans are ALWAYS channel-scoped.** Community moderators can only ban from their assigned channels.
- User banned from Channel A → Can view Channel A's posts but **cannot** comment, favorite, share, or interact
- User banned from Channel A → **CAN** fully interact with Channels B, C, D, etc.
- Sitewide bans only available to Site Admins (via existing `is_banned` User field)

---

## � Ban Visibility & Interaction Model

When a user is banned from a channel, the system must enforce the following rules across ALL frontend components:

### For Banned Users Viewing Banned Channel Content:

**OPTION A - Content Hidden (Privacy-First)**
```
Channel A Post by @StreamerA
├─ User banned from Channel A
├─ Result: Post is COMPLETELY HIDDEN from banned user's feed
├─ They don't see post exists
├─ Query filters exclude posts from banned channels
└─ Best for: Users who don't want to see streamers they're banned from
```

**OPTION B - Content Visible with Disabled Interactions (Transparency)**
```
Channel A Post by @StreamerA
├─ User banned from Channel A
├─ Post IS VISIBLE in feed
├─ Buttons appear DISABLED/GRAYED OUT:
│  ├─ 💬 Comment button → Disabled with tooltip "You're banned from this community"
│  ├─ ❤️ Favorite button → Disabled
│  ├─ 🔗 Share button → Disabled
│  ├─ ↪️ Repost button → Disabled
│  └─ User can STILL view replies/engagement but cannot interact
└─ Best for: Transparent communication of why they can't interact
```

**Recommended: OPTION B (Content Visible, Interactions Disabled)**
- More transparent - user knows content exists and why they can't interact
- Easier to implement - no feed filtering logic needed
- Better UX - no confusion about "where did this content go?"
- Consistent with platform norms (Reddit, Twitter, etc.)

### Affected Components:
- **[FeedCard](frontend/src/components/FeedCard.tsx)** - Check ban status before rendering interaction buttons
- **[CommentForm](frontend/src/components/CommentForm.tsx)** - Prevent submission if user banned
- **[FavoriteButton](frontend/src/components/FavoriteButton.tsx)** - Disable if user banned from channel
- **[ShareButton](frontend/src/components/ShareButton.tsx)** - Disable if user banned from channel
- **[PostDetail](frontend/src/pages/PostDetail.tsx)** - Show ban message prominently
- **[ChannelFeed](frontend/src/pages/ChannelFeed.tsx)** - Check ban status on mount

### API Contracts for Ban Checks:

All endpoints serving user content must include ban status:

```go
// Endpoint response includes ban context
GET /api/v1/channels/:channelId/feed
Response: {
  posts: [
    {
      id: "post-123",
      channelId: "channel-456",
      // ... post data ...
      currentUserBanStatus: {
        isBanned: true,
        bannedBy: "moderator-id",
        reason: "Harassment",
        bannedAt: "2025-02-15T10:30:00Z",
        expiresAt: null
      }
    }
  ]
}

// Ban check endpoint
GET /api/v1/moderation/ban-status?channelId=:id
Response: {
  channelId: "channel-456",
  currentUserBanned: true,
  reason: "Harassment",
  bannedAt: "2025-02-15T10:30:00Z",
  expiresAt: null
}
```

---

## �📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Moderation System                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Permission Model Enhancement (P1)              │  │
│  │  - Community Moderator Role (channel-scoped)            │  │
│  │  - Site Moderator Role (platform-wide)                 │  │
│  │  - New permissions: community:moderate, site:moderate   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │       Database Schema (P1)                              │  │
│  │  - community_moderators table (channel-specific)        │  │
│  │  - channel_moderators table (track moderator scope)     │  │
│  │  - moderation_audit_logs table (all actions)            │  │
│  │  - twitch_bans table (synced ban data)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      Backend Services (P1)                              │  │
│  │  - TwitchBanSyncService (fetch & sync bans)            │  │
│  │  - ModerationService (ban/unban operations)            │  │
│  │  - PermissionService (authorization checks)            │  │
│  │  - AuditLogService (logging all actions)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      API Endpoints (P1)                                 │  │
│  │  - POST /api/v1/moderation/sync-bans (initiate sync)   │  │
│  │  - GET /api/v1/moderation/bans (list bans)             │  │
│  │  - POST /api/v1/moderation/ban (create ban)            │  │
│  │  - DELETE /api/v1/moderation/ban/:id (revoke ban)      │  │
│  │  - GET /api/v1/moderation/audit-logs (view actions)    │  │
│  │  - PATCH /api/v1/moderation/moderators (manage mods)   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      Frontend Components (P2)                           │  │
│  │  - ModeratorManagement component                        │  │
│  │  - BanListViewer component                              │  │
│  │  - SyncBansModal component                              │  │
│  │  - AuditLogViewer component                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      Testing (P0 - Comprehensive)                       │  │
│  │  - Unit tests for all services                          │  │
│  │  - Integration tests with Twitch mock                   │  │
│  │  - E2E tests for moderation workflows                   │  │
│  │  - Authorization & RBAC tests                           │  │
│  │  - Audit log verification tests                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Epic Breakdown

### EPIC 1: Permission Model Enhancement (P1) ⚠️ CRITICAL
**Effort:** 12-16 hours
**Blocks:** All other epics
**Status:** Ready

Extend the existing role-based access control system to distinguish community moderators from site moderators.

**Child Issues:**
1. **#TBD-1** - Add Community Moderator Role to Permission Model (4-6h)
2. **#TBD-2** - Add Community Moderation Permissions (4-6h)
3. **#TBD-3** - Extend User Model for Moderator Metadata (2-3h)
4. **#TBD-4** - Create Permission Checking Middleware (2-3h)

---

### EPIC 2: Database Schema & Models (P1) ⚠️ BLOCKER
**Effort:** 16-20 hours
**Dependencies:** EPIC 1
**Status:** Ready

Create database tables and migration scripts for moderation data.

**Child Issues:**
1. **#TBD-5** - Create Community Moderators Table & Migration (3-4h)
2. **#TBD-6** - Create Twitch Bans Sync Table & Migration (3-4h)
3. **#TBD-7** - Create Moderation Audit Logs Table & Migration (3-4h)
4. **#TBD-8** - Create Channel Moderators Association Table (2-3h)
5. **#TBD-9** - Add Database Indexes for Performance (2-3h)
6. **#TBD-10** - Write Migration Testing & Rollback Tests (3-4h)

---

### EPIC 3: Backend Services (P1) ⚠️ CORE
**Effort:** 40-50 hours
**Dependencies:** EPIC 1, EPIC 2
**Status:** Ready

Implement core moderation business logic and Twitch integration.

**Child Issues:**
1. **#TBD-11** - Implement TwitchBanSyncService (12-16h)
   - OAuth token validation
   - Fetch bans from Twitch API
   - Sync to local database
   - Handle rate limiting and errors
   - Implement retry logic

2. **#TBD-12** - Implement ModerationService (12-16h)
   - Ban/unban user operations
   - Permission checks (community vs site scope)
   - Transaction handling
   - Cascade operations (ban user across posts, etc.)

3. **#TBD-13** - Implement AuditLogService (8-10h)
   - Log all moderation actions
   - Track who, what, when, why
   - Query/filtering functionality
   - Data retention policies

4. **#TBD-14** - Implement PermissionCheckService (4-6h)
   - Validate moderator permissions
   - Scope checking (community vs site)
   - Channel ownership verification

5. **#TBD-15** - Add Service Layer Unit Tests (4-6h)
   - Test sync logic with mocked Twitch API
   - Test permission checking
   - Test audit logging

---

### EPIC 4: API Endpoints & Handlers (P1) ⚠️ CORE
**Effort:** 32-40 hours
**Dependencies:** EPIC 3
**Status:** Ready

Create REST API endpoints for moderation operations.

**Child Issues:**
1. **#TBD-16** - Implement Twitch Ban Sync Endpoint (6-8h)
   - POST /api/v1/moderation/sync-bans
   - Authentication & authorization
   - Webhook support for auto-sync
   - Response with sync results

2. **#TBD-17** - Implement Ban Management Endpoints (8-10h)
   - GET /api/v1/moderation/bans (list with filtering)
   - POST /api/v1/moderation/ban (create ban)
   - DELETE /api/v1/moderation/ban/:id (revoke ban)
   - GET /api/v1/moderation/ban/:id (details)

3. **#TBD-18** - Implement Moderator Management Endpoints (8-10h)
   - GET /api/v1/moderation/moderators (list moderators)
   - POST /api/v1/moderation/moderators (add moderator)
   - DELETE /api/v1/moderation/moderators/:id (remove moderator)
   - PATCH /api/v1/moderation/moderators/:id (update permissions)

4. **#TBD-19** - Implement Audit Log Endpoints (6-8h)
   - GET /api/v1/moderation/audit-logs (paginated list)
   - GET /api/v1/moderation/audit-logs/:id (details)
   - Query parameters: date range, actor, action type, target

5. **#TBD-20** - Add Handler Unit Tests & Integration Tests (4-6h)
   - Test authorization on all endpoints
   - Test with different moderator scopes
   - Test error handling

---

### EPIC 5: Frontend UI Components (P2)
**Effort:** 32-40 hours
**Dependencies:** EPIC 4
**Status:** Ready

Build user interfaces for moderation management.

**Child Issues:**
1. **#TBD-21** - Implement Moderator Management UI (8-10h)
   - List current moderators
   - Add new moderators
   - Remove moderators
   - Manage permissions
   - Search & filter

2. **#TBD-22** - Implement Ban List Viewer (6-8h)
   - Display all bans for moderated content
   - Filter by: date, reason, moderator, status
   - Pagination
   - Export to CSV

3. **#TBD-23** - Implement Sync Bans Modal (6-8h)
   - Connect Twitch account
   - Select which channel to sync
   - Confirm sync operation
   - Show sync progress/results

4. **#TBD-24** - Implement Audit Log Viewer (6-8h)
   - Timeline view of all moderation actions
   - Filter by: action type, moderator, date range
   - Export logs
   - Search functionality

5. **#TBD-25** - Add Frontend Tests (4-6h)
   - Component snapshot tests
   - Integration tests with API
   - E2E tests for moderation workflows

---

### EPIC 6: Comprehensive Testing (P0) ✅ CRITICAL
**Effort:** 48-60 hours
**Dependencies:** All other epics
**Status:** Ready

Full test coverage for all moderation features.

**Child Issues:**
1. **#TBD-26** - Write Unit Tests for Services (12-16h)
   - Service layer tests with mocks
   - Permission checking tests
   - Audit logging verification
   - Error handling tests

2. **#TBD-27** - Write Integration Tests (12-16h)
   - End-to-end moderation workflows
   - Twitch API integration (with mock)
   - Permission boundary tests
   - Transaction rollback tests

3. **#TBD-28** - Write RBAC Authorization Tests (6-8h)
   - Community moderator scoping
   - Site moderator capabilities
   - Permission escalation prevention
   - Cross-channel access prevention

4. **#TBD-29** - Write E2E Tests (12-16h)
   - Full user workflows
   - Moderator onboarding flow
   - Ban sync flow
   - Audit log verification
   - Edge cases and error scenarios

5. **#TBD-30** - Performance & Load Testing (4-6h)
   - Ban sync with large datasets
   - Audit log query performance
   - Permission check performance

---

### EPIC 7: Documentation (P1)
**Effort:** 12-16 hours
**Dependencies:** All code complete
**Status:** Ready

Create comprehensive documentation for operators and developers.

**Child Issues:**
1. **#TBD-31** - Write API Documentation (4-6h)
   - OpenAPI/Swagger docs
   - Example requests/responses
   - Error codes and handling
   - Rate limiting

2. **#TBD-32** - Write Permission Model Documentation (3-4h)
   - Permission hierarchy
   - Role definitions
   - Scope definitions (community vs site)
   - Authorization examples

3. **#TBD-33** - Write Operational Runbooks (3-4h)
   - Moderator onboarding
   - Troubleshooting sync failures
   - Audit log queries
   - Emergency procedures

4. **#TBD-34** - Write Developer Guide (2-3h)
   - Architecture overview
   - Service interfaces
   - Testing strategy
   - Adding new permissions

---

### EPIC 8: Deployment & Monitoring (P1)
**Effort:** 12-16 hours
**Dependencies:** All code & tests complete
**Status:** Ready

Deploy and monitor the feature in production.

**Child Issues:**
1. **#TBD-35** - Create Migration Scripts (3-4h)
   - Forward migrations
   - Rollback procedures
   - Data validation scripts

2. **#TBD-36** - Set Up Monitoring & Alerts (4-6h)
   - Sync job monitoring
   - Failed ban operations alerts
   - Audit log storage monitoring
   - Permission check failures tracking

3. **#TBD-37** - Implement Feature Flags (2-3h)
   - Gradual rollout capability
   - Kill switch for ban sync
   - A/B testing support

4. **#TBD-38** - Create Deployment Guide (3-4h)
   - Blue-green deployment steps
   - Rollback procedures
   - Health check procedures
   - Post-deployment verification

---

## 🗓️ Timeline & Phases

### Phase 1: Foundation (Weeks 1-2) - CRITICAL
**Goal:** Establish data model and core services

- [ ] EPIC 1: Permission Model Enhancement
- [ ] EPIC 2: Database Schema & Migrations
- [ ] Parallel: Create database tables and migrations

**Success Criteria:**
- All permissions defined and tested
- Database schema complete with migrations
- No blocking issues for Phase 2

---

### Phase 2: Backend Implementation (Weeks 3-4) - CORE
**Goal:** Complete all backend services and APIs

- [ ] EPIC 3: Backend Services (all services)
- [ ] EPIC 4: API Endpoints (all handlers)
- [ ] Service layer integration tests
- [ ] Handler endpoint tests

**Success Criteria:**
- All services implemented and tested
- All API endpoints functional
- Permission checks working on all endpoints
- Audit logging complete

---

### Phase 3: Frontend & UI (Weeks 5-6)
**Goal:** Complete user interface

- [ ] EPIC 5: Frontend UI Components
- [ ] Component integration tests
- [ ] API integration verified
- [ ] Basic E2E tests

**Success Criteria:**
- All UI components rendering correctly
- API calls working end-to-end
- UI tests passing

---

### Phase 4: Testing & QA (Weeks 7-8) - QUALITY GATE
**Goal:** Comprehensive testing and validation

- [ ] EPIC 6: Comprehensive Testing (all test suites)
- [ ] RBAC authorization tests
- [ ] E2E test scenarios
- [ ] Load/performance testing

**Success Criteria:**
- All tests passing (unit, integration, E2E)
- Code coverage > 90%
- Performance benchmarks met
- No security vulnerabilities

---

### Phase 5: Documentation & Deployment (Weeks 9-10)
**Goal:** Document and deploy to production

- [ ] EPIC 7: Documentation (all docs)
- [ ] EPIC 8: Deployment & Monitoring
- [ ] Staging deployment and testing
- [ ] Production rollout with monitoring

**Success Criteria:**
- All documentation complete
- Monitoring and alerts configured
- Zero errors in staging
- Successful production deployment

---

## 🔐 Security & Compliance

### Authorization Model
```
┌─────────────────────────────────────────┐
│        User Role Hierarchy              │
├─────────────────────────────────────────┤
│                                         │
│  SITE ADMIN                             │
│  ├─ All permissions                     │
│  ├─ Can view all bans                   │
│  ├─ Can manage all moderators           │
│  └─ Can view complete audit logs        │
│                                         │
│  SITE MODERATOR                         │
│  ├─ View all channel bans               │
│  ├─ Manage ban categories               │
│  ├─ View filtered audit logs            │
│  └─ Cannot escalate privileges          │
│                                         │
│  COMMUNITY MODERATOR                    │
│  ├─ View own channel bans               │
│  ├─ Manage own channel bans             │
│  ├─ View own audit logs                 │
│  └─ Cannot access other channels        │
│                                         │
│  MEMBER (Regular User)                  │
│  ├─ View own ban status                 │
│  ├─ Cannot moderate                     │
│  └─ Read-only access                    │
│                                         │
└─────────────────────────────────────────┘
```

### Audit Trail
Every moderation action is logged with:
- **Who:** User ID and username of moderator
- **What:** Action type (ban, unban, etc.)
- **When:** Timestamp
- **Where:** Channel ID (for community mods)
- **Why:** Reason provided
- **Proof:** Related Twitch API references

### Privacy Considerations
1. **Cross-channel tracking prevention:** Community moderators cannot see bans from other channels
2. **User privacy:** Ban information only visible to involved parties (moderators, banned user)
3. **Data retention:** Ban data retained per policy (default: 90 days for inactive bans)
4. **Audit transparency:** Audit logs provide complete accountability trail

---

## ✅ Definition of Done

Each issue must meet these criteria before marking as complete:

### Code Quality
- [ ] All acceptance criteria met
- [ ] Code passes linting (golangci-lint)
- [ ] Code formatted with `gofmt`
- [ ] No security issues (gosec, CodeQL)
- [ ] Type-safe (no unsafe operations)

### Testing
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing (where applicable)
- [ ] Error cases tested
- [ ] Edge cases identified and tested

### Documentation
- [ ] Code comments for complex logic
- [ ] Function documentation complete
- [ ] API documentation updated
- [ ] Architecture diagrams updated

### Deployment
- [ ] Database migrations validated
- [ ] Backwards compatibility ensured
- [ ] Rollback procedures tested
- [ ] Monitoring alerts configured

---

## 🚀 Success Metrics

### Completion Metrics
- [ ] All 38 child issues created and tracked
- [ ] 100% issue completion rate
- [ ] Zero blocked issues at any phase
- [ ] All phases completed within target timeline

### Quality Metrics
- [ ] Code coverage > 90%
- [ ] Zero security vulnerabilities
- [ ] Zero critical/high bugs found in testing
- [ ] All E2E tests passing consistently

### Performance Metrics
- [ ] Ban sync completes in < 5 seconds
- [ ] Audit log queries < 200ms
- [ ] Permission checks < 10ms
- [ ] API endpoints respond in < 500ms (p99)

### User Adoption Metrics
- [ ] Community moderator onboarding time < 5 minutes
- [ ] Sync success rate > 99%
- [ ] Zero permission escalation incidents
- [ ] 100% audit log accuracy

---

## 📋 Risk Management

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Twitch API rate limiting | Medium | High | Implement queue + exponential backoff |
| Data consistency issues | Low | High | Transaction tests + rollback procedures |
| Permission model complexity | Medium | Medium | Comprehensive documentation + tests |
| Large ban list sync timeout | Low | High | Implement pagination + async processing |
| Audit log storage bloat | Low | Medium | Implement archival + cleanup policies |

### Mitigation Strategies
1. **API Rate Limiting:** Implement queue system with configurable batch sizes
2. **Data Validation:** Write comprehensive validation tests before sync
3. **Permission Testing:** RBAC tests for all permission combinations
4. **Async Processing:** Use background jobs for large syncs
5. **Archival Policy:** Auto-archive old audit logs, implement retention

---

## 🔗 Dependencies & Blockers

### Required
- Twitch OAuth already implemented ✅
- Chat moderation system exists ✅
- User model with roles ✅
- Database migrations setup ✅

### Optional
- SendGrid for notification emails (Phase 2+)
- Analytics for moderation tracking (Phase 3+)
- Slack integration for alerts (Phase 3+)

### Blockers
- EPIC 1 blocks all other work
- EPIC 2 blocks EPIC 3 & EPIC 4
- EPIC 3 blocks EPIC 4
- All code epics block testing epics

---

## 📞 Support & Communication

### Daily Progress Tracking
- Check GitHub Projects board
- Filter by epic to see progress
- Issues marked with phase label

### Weekly Standups
- Monday 10:00 AM - Planning
- Wednesday 10:00 AM - Progress Check
- Friday 4:00 PM - Demo & Retrospective

### Issue Templates
Use these labels on all child issues:
- `epic:moderation` - Part of this roadmap
- `kind:feature` or `kind:test`
- `area:backend` or `area/frontend`
- `phase/1` through `phase/5`
- `priority/P0` or `priority/P1`

---

## 📚 References

- [Twitch API Documentation](https://dev.twitch.tv/docs/api/reference)
- [Chat Moderation System Doc](./CHAT_MODERATION.md)
- [Current Roles & Permissions](./backend/internal/models/roles.go)
- [Testing Strategy](./docs/testing/testing-strategy.md)
- [Deployment Guide](./docs/deployment/blue-green-deployment.md)

---

**Total Estimated Effort:** 220-260 hours
**Estimated Timeline:** 10 weeks (5 phases of 2 weeks each)
**Target Launch:** End of Q2 2026

**Status:** Ready to begin Phase 1
**Last Updated:** January 7, 2026
