# Testing Strategy & Guide

> **Roadmap 5.0 Phase 0 - Unified Testing Strategy**  
> This document defines Clipper's comprehensive testing strategy to achieve 90%+ coverage and align E2E, integration, load, and scheduler testing across all platforms.

## Table of Contents

- [Strategic Overview](#strategic-overview)
- [Test Types & Layers](#test-types--layers)
- [Coverage Targets & Status](#coverage-targets--status)
- [Test Ownership & SLAs](#test-ownership--slas)
- [CI/CD Gates & Policies](#cicd-gates--policies)
- [Running Tests](#running-tests)
- [Feature-Specific Testing](#feature-specific-testing)
- [Writing Tests](#writing-tests)
- [Troubleshooting](#troubleshooting)
- [Related Issues](#related-issues)

## Strategic Overview

Clipper employs a multi-layered testing strategy that covers:

- **Unit Testing**: Isolated component testing with high coverage targets (≥80%)
- **Integration Testing**: Cross-component testing with real services (≥70%)
- **E2E Testing**: Full user journey validation on web and mobile platforms (≥80% critical paths)
- **Performance Testing**: Load, stress, and soak testing with k6 (p95 < 300ms for critical endpoints)
- **Scheduler/Job Testing**: Background job reliability and scheduling correctness
- **Security Testing**: Input validation, authorization, and vulnerability scanning
- **Observability**: Distributed tracing and metrics validation with OpenTelemetry

### Roadmap 5.0 Goals

- **Coverage Target**: 90%+ across all test layers by Phase 2
- **Flakiness Threshold**: <1% test failure rate unrelated to code changes
- **Performance SLAs**: p95 < 300ms for critical paths, p99 < 600ms
- **CI Pipeline Time**: <20 minutes for full test suite
- **Mobile Parity**: Feature parity testing between web and mobile

## Test Types & Layers

Clipper uses multiple types of tests to ensure code quality and reliability:

1. **Unit Tests**: Test individual functions and methods in isolation
2. **Integration Tests**: Test interactions between components with real database
3. **End-to-End (E2E) Tests**: Test complete user flows through the UI (web + mobile)
4. **Load Tests**: Test system performance under load (k6)
5. **Scheduler Tests**: Test background jobs and scheduled tasks
6. **Security Tests**: Test authorization, validation, and vulnerability detection
7. **Observability Tests**: Validate metrics, traces, and alerting rules

## Running Tests

### Backend Tests

#### Unit Tests

Run all unit tests:

```bash
cd backend
go test ./...
```

Run tests for a specific package:

```bash
go test ./internal/services
go test ./internal/handlers
```

Run tests with coverage:

```bash
go test -coverprofile=coverage.out -covermode=atomic ./...
go tool cover -html=coverage.out -o coverage.html
```

#### Integration Tests

Integration tests require a test database and Redis instance.

**Setup:**

```bash
# Start test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up
```

**Run tests:**

```bash
cd backend
go test -v -tags=integration ./tests/integration/...
```

**Run specific integration test suite:**

```bash
# DMCA tests
go test -v -tags=integration ./tests/integration/dmca/...

# Auth tests
go test -v -tags=integration ./tests/integration/auth/...

# All integration tests
go test -v -tags=integration ./tests/integration/...
```

**Cleanup:**

```bash
docker compose -f docker-compose.test.yml down
```

### Frontend Tests

```bash
cd frontend
npm run test        # Unit tests
npm run test:e2e    # E2E tests
```

### Mobile Tests

```bash
cd mobile
npm run test
```

## Coverage Targets & Status

### Current Status (Roadmap 5.0 Phase 0)

| Test Layer | Coverage Target | Current Status | Phase 2 Goal | Owner |
|-----------|----------------|----------------|--------------|-------|
| **Backend Unit Tests** | ≥80% line coverage | 8% → 80% | 90%+ | @backend-team |
| **Backend Integration** | ≥70% critical paths | 70%+ ✅ | 85%+ | @backend-team |
| **Frontend Unit Tests** | ≥70% coverage | 70%+ ✅ | 80%+ | @frontend-team |
| **Frontend E2E (Playwright)** | ≥80% critical flows | 80%+ ✅ | 90%+ | @frontend-team |
| **Mobile Unit Tests** | ≥70% coverage | 65% → 70% | 80%+ | @mobile-team |
| **Mobile E2E (Detox)** | ≥75% critical flows | 40% → 75% | 85%+ | @mobile-team |
| **Load Tests (k6)** | p95 < 300ms | ✅ (p95: ~200ms) | p95 < 250ms | @platform-team |
| **Scheduler/Jobs** | ≥80% job coverage | 85%+ ✅ | 90%+ | @backend-team |
| **Security Tests** | 100% auth endpoints | 95%+ ✅ | 100% | @security-team |

### Coverage Calculation Methodology

- **Unit Tests**: Line and branch coverage reported by language-specific tools (Go `cover`, Jest)
- **Integration Tests**: Endpoint coverage × scenario coverage (happy + error paths)
- **E2E Tests**: Critical user journey coverage (feature-based)
- **Load Tests**: Performance SLA compliance rate (% of requests meeting targets)

### Target Milestones

- **Phase 0 (Current)**: Baseline coverage established, CI gates in place
- **Phase 1**: Backend unit coverage → 50%, Mobile E2E → 60%
- **Phase 2**: All layers → 90%+, flakiness < 1%

## Test Ownership & SLAs

### Team Responsibilities

| Team | Responsibilities | SLA (PR Review) | SLA (CI Fix) |
|------|-----------------|-----------------|--------------|
| **@backend-team** | Backend unit, integration, scheduler tests | < 24h | < 4h |
| **@frontend-team** | Frontend unit, E2E (web) tests | < 24h | < 4h |
| **@mobile-team** | Mobile unit, E2E (iOS/Android) tests | < 24h | < 4h |
| **@platform-team** | Load tests, infrastructure, CI/CD | < 48h | < 8h |
| **@security-team** | Security tests, vulnerability scanning | < 24h | < 2h (P0) |

### Test Maintenance Windows

- **Daily**: Unit and integration tests run on every commit
- **Nightly**: Full E2E suite, extended load tests (2 AM UTC)
- **Weekly**: Soak tests, security scans (Sunday 00:00 UTC)
- **On-Demand**: Performance benchmarks, stress tests (via GitHub Actions)

### Escalation Path

1. **Test Failure (< 5%)**: Developer fixes within 1 sprint
2. **Test Failure (5-10%)**: Team lead investigation within 24h
3. **Test Failure (> 10%)**: Incident declared, rollback considered
4. **Flaky Tests (> 1%)**: Disabled temporarily, root cause analysis required

## CI/CD Gates & Policies

### Required CI Checks (Blocking)

All PRs must pass the following checks before merging:

#### Backend
- ✅ **Lint & Format** (`gofmt`, `golangci-lint`)
- ✅ **Unit Tests** (Go 1.21, 1.22) - Must pass with ≥8% coverage
- ✅ **Integration Tests** - Must pass with ≥70% coverage
- ✅ **Build** (Linux, macOS, Windows)

#### Frontend
- ✅ **Lint & Format** (`eslint`, `prettier`)
- ✅ **Type Check** (`tsc --noEmit`)
- ✅ **Unit Tests** (Jest) - Must pass with ≥70% coverage
- ✅ **Build** (Vite production build)

#### Mobile
- ✅ **Lint & Format** (`eslint`, `prettier`)
- ✅ **Type Check** (`tsc --noEmit`)
- ✅ **Unit Tests** (Jest) - Must pass with ≥65% coverage

### Optional CI Checks (Non-Blocking)

These checks run but don't block merges (warnings only):

- 🟡 **E2E Tests** (Playwright) - Run on staging after merge
- 🟡 **Mobile E2E** (Detox) - Manual trigger or nightly
- 🟡 **Load Tests** (k6) - Nightly schedule or on-demand
- 🟡 **Security Scan** (CodeQL) - Weekly or on security-related PRs

### Branch Protection Rules

**Main Branch:**
- Require PR review from code owner
- Require all CI checks to pass
- Require branch to be up-to-date before merging
- No direct commits (must use PR)

**Develop Branch:**
- Require PR review (1 approval)
- Require core CI checks (unit + integration)
- Allow merge commits and squash merging

### Retry & Flakiness Policy

**Automatic Retries:**
- CI jobs auto-retry **once** on infrastructure failure
- E2E tests auto-retry **up to 2 times** per test
- Load tests **do not retry** (manual re-run required)

**Flakiness Threshold:**
- Target: **< 1% failure rate** across all test suites
- Measurement: 30-day rolling average of unrelated failures
- Action: Tests exceeding 3% flaky rate are **quarantined** (skipped until fixed)

**Flaky Test Handling:**
1. Add `.skip` or `@flaky` annotation with issue link
2. File GitHub issue with `flaky-test` label
3. Root cause analysis required within 2 sprints
4. Tests disabled > 1 month are deleted (must be rewritten)

### Performance Gates (Load Tests)

Load tests enforce the following thresholds:

| Endpoint Category | p95 Latency | p99 Latency | Error Rate | Throughput |
|-------------------|-------------|-------------|------------|------------|
| **Critical** (submit, auth) | < 300ms | < 600ms | < 0.1% | 500 req/s |
| **High** (feed, search) | < 500ms | < 1000ms | < 0.5% | 1000 req/s |
| **Medium** (comments, votes) | < 1000ms | < 2000ms | < 1% | 200 req/s |

**Alerting:**
- Performance degradation > 20%: Warning alert
- Performance degradation > 50%: Critical alert + rollback consideration

## Test Tooling & Infrastructure

### Backend Testing Stack

| Tool | Purpose | Version | Documentation |
|------|---------|---------|---------------|
| **Go testing** | Unit tests | stdlib | [pkg.go.dev/testing](https://pkg.go.dev/testing) |
| **testify** | Assertions & mocks | v1.9+ | [github.com/stretchr/testify](https://github.com/stretchr/testify) |
| **Docker Compose** | Test containers | 2.20+ | [docker-compose.test.yml](../../docker-compose.test.yml) |
| **golang-migrate** | Database migrations | v4.17+ | [github.com/golang-migrate/migrate](https://github.com/golang-migrate/migrate) |
| **pgvector/pgvector** | Test database | pg17 | PostgreSQL with vector support |
| **Redis** | Test cache | 7-alpine | In-memory data store |
| **OpenSearch** | Test search | 2.11+ | Search and analytics engine |

### Frontend Testing Stack

| Tool | Purpose | Version | Documentation |
|------|---------|---------|---------------|
| **Jest** | Unit tests | v29+ | [jestjs.io](https://jestjs.io/) |
| **React Testing Library** | Component tests | v14+ | [testing-library.com/react](https://testing-library.com/react) |
| **Playwright** | E2E tests | v1.40+ | [playwright.dev](https://playwright.dev/) |
| **MSW** | API mocking | v2.0+ | [mswjs.io](https://mswjs.io/) |
| **Vite** | Test runner | v5.0+ | Fast build tooling |

### Mobile Testing Stack

| Tool | Purpose | Version | Documentation |
|------|---------|---------|---------------|
| **Jest** | Unit tests | v29+ | [jestjs.io](https://jestjs.io/) |
| **React Native Testing Library** | Component tests | v12+ | [callstack.github.io/react-native-testing-library](https://callstack.github.io/react-native-testing-library/) |
| **Detox** | E2E tests | v20+ | [wix.github.io/Detox](https://wix.github.io/Detox/) |
| **Expo** | Test runner | v50+ | [docs.expo.dev/develop/unit-testing](https://docs.expo.dev/develop/unit-testing/) |

### Load Testing Stack

| Tool | Purpose | Version | Documentation |
|------|---------|---------|---------------|
| **k6** | Load testing | v0.48+ | [k6.io/docs](https://k6.io/docs/) |
| **Grafana** | Metrics visualization | 10.0+ | Dashboard for k6 results |
| **InfluxDB** | Metrics storage | 2.7+ | Time-series database |

### Observability & Monitoring

| Tool | Purpose | Version | Documentation |
|------|---------|---------|---------------|
| **OpenTelemetry** | Distributed tracing | v1.21+ | [opentelemetry.io](https://opentelemetry.io/) |
| **Jaeger** | Trace visualization | v1.52+ | [jaegertracing.io](https://www.jaegertracing.io/) |
| **Prometheus** | Metrics collection | v2.48+ | [prometheus.io](https://prometheus.io/) |
| **Grafana** | Dashboards | 10.0+ | [grafana.com](https://grafana.com/) |

### Test Environments

| Environment | Purpose | Databases | URL | Refresh Cycle |
|-------------|---------|-----------|-----|---------------|
| **Local** | Developer testing | Docker Compose | localhost:8080 | On-demand |
| **CI** | Automated testing | GitHub Services | N/A | Every commit |
| **Staging** | Pre-production E2E | Dedicated PostgreSQL | staging.clipper.dev | Daily |
| **Load Test** | Performance testing | Scaled PostgreSQL | N/A | On-demand |

**Test Data Management:**
- **Unit Tests**: In-memory mocks, no persistent data
- **Integration Tests**: Docker containers with migrations, cleaned between runs
- **E2E Tests**: Seeded fixtures (`scripts/test-seed-e2e.sh`), reset daily
- **Load Tests**: Production-like synthetic data, refreshed weekly

## Feature-Specific Testing

### Input Validation Middleware Tests

The validation middleware provides defense-in-depth security against injection attacks:

**Unit Tests** (`backend/internal/middleware/validation_middleware_test.go` & `validation_middleware_security_test.go`):
- Basic SQLi pattern detection (UNION, SELECT, INSERT, DROP, etc.)
- XSS pattern detection (script tags, event handlers, javascript:)
- Path traversal detection (../, ..\\)
- Header validation (UTF-8, length limits)
- Request body size limits
- URL length validation
- Cross-field validation for user inputs
- SQLi/XSS edge cases (case variations, special characters)
- Mixed attack vectors (combined SQLi + XSS)
- Sanitization consistency and idempotency
- Fuzzer smoke test (1000+ random malicious payloads)

**Integration Tests** (`backend/tests/integration/validation/validation_integration_test.go`):
- Validation applied on clip endpoints
- Validation on user management endpoints
- Validation on comment endpoints
- Validation on search endpoints
- Header validation across all endpoints

**Coverage:**
- Unit test coverage: ~95% of validation logic
- Integration test coverage: All critical endpoints
- Fuzzer test: 1000+ payloads with 0 panics, 0% failure rate

**Running validation tests:**

```bash
cd backend

# All validation tests (unit + sanitization)
go test -v ./internal/middleware/ -run "TestInputValidation|TestSanitizeInput"

# Edge case tests
go test -v ./internal/middleware/ -run TestInputValidationMiddleware_SQLInjectionEdgeCases
go test -v ./internal/middleware/ -run TestInputValidationMiddleware_XSSEdgeCases

# Fuzzer smoke test (1000+ payloads)
go test -v ./internal/middleware/ -run TestInputValidationMiddleware_FuzzerSmoke

# Integration tests (requires test database)
docker compose -f docker-compose.test.yml up -d
go test -v -tags=integration ./tests/integration/validation/...
docker compose -f docker-compose.test.yml down
```

**Security Note:** The validation middleware provides defense-in-depth but should not be the only security layer. Always use:
- Parameterized queries/prepared statements for database access
- Context-aware output encoding for HTML/JS/CSS
- Content Security Policy (CSP) headers
- HTTPS for all communications

### DMCA System Tests

The DMCA system has comprehensive test coverage including:

**Unit Tests** (`backend/internal/services/dmca_service_test.go`, `backend/internal/handlers/dmca_handler_test.go`):
- Validation logic (required fields, URL validation, signature matching)
- Fuzzy signature matching algorithm
- Business day calculation for waiting periods
- URL parsing and clip ID extraction
- Authorization checks
- Malformed request handling

**Integration Tests** (`backend/tests/integration/dmca/dmca_integration_test.go`):
- Takedown notice submission workflow
- Admin review and approval process
- Takedown processing and strike issuance
- Counter-notice submission
- User access controls (users can only view own strikes)
- Admin access controls (admins/moderators can manage all notices)
- Audit log creation

**Coverage:**
- Service validation methods: 81-100% coverage
- Handler endpoints: ~60% from unit tests, higher with integration tests
- Critical business logic fully tested

**Running DMCA tests:**

```bash
# Unit tests only
cd backend
go test -v ./internal/services -run "TestValidateTakedownNotice|TestFuzzyMatchSignature|TestValidateCounterNotice|TestDMCAExtractClipIDFromURL"
go test -v ./internal/handlers -run "TestSubmit.*|TestGetUserStrikes.*|TestReviewNotice.*|TestProcessTakedown.*"

# Integration tests
go test -v -tags=integration ./tests/integration/dmca/...
```

### GDPR Account Deletion Lifecycle Tests

The GDPR account deletion system has comprehensive test coverage including:

**Integration Tests** (`backend/tests/integration/gdpr/gdpr_deletion_lifecycle_test.go`, `backend/tests/integration/gdpr/gdpr_hard_delete_test.go`):
- Deletion request creation with 30-day grace period
- Duplicate request prevention
- Cancellation flow and account restoration
- Grace period behavior (data remains accessible)
- Hard delete execution and data removal
- Removal of user-owned resources (favorites, votes, comments, submissions)
- Authentication token deletion (CASCADE)
- User settings deletion (CASCADE)
- Export endpoint validation post-deletion
- Scheduled deletion execution
- Audit log entries for request, cancellation, and completion
- Negative flows and error cases

**Coverage:**
- Full lifecycle: request → grace period → hard delete
- Cancellation and restoration flows
- Data erasure and anonymization
- Auditability of all deletion lifecycle events

**Running GDPR tests:**

```bash
# Setup test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Integration tests
cd backend
go test -v -tags=integration ./tests/integration/gdpr/...

# Cleanup
docker compose -f docker-compose.test.yml down
```

### Admin User Management Authorization Tests

The admin user management system has comprehensive test coverage including:

**Integration Tests** (`backend/tests/integration/admin/admin_user_management_test.go`):
- Authorization enforcement (403 for non-admin, success for admin/moderator)
- Privilege escalation prevention (users cannot self-promote to admin)
- Role management with database persistence verification
- Ban/unban operations with state verification
- Comment privilege suspension (temporary and permanent)
- Audit log creation for all administrative actions
- Karma adjustment operations
- Comment review requirement toggling
- User listing with pagination

**Coverage:**
- Full authorization testing across all admin endpoints
- Role changes persist and apply immediately to permissions
- All operations create appropriate audit log entries
- Negative tests for unauthorized access and privilege escalation
- Database state verification after each operation

**Running Admin Tests:**

```bash
# Setup test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Integration tests
cd backend
go test -v -tags=integration ./tests/integration/admin/...

# Cleanup
docker compose -f docker-compose.test.yml down
```

### Discovery Lists Tests

The Discovery Lists feature (Top/New/Discussed) has comprehensive test coverage:

**Unit Tests** (`backend/internal/handlers/discovery_list_handler_test.go`):
- Pagination parameter validation (limit, offset, boundary values)
- Filter parameters (featured lists)
- Authentication checks for follow/bookmark operations
- Error handling for invalid inputs
- Response structure verification

**Integration Tests** (`backend/tests/integration/discovery/discovery_list_integration_test.go`):
- Pagination with live database fixtures
- Sorting correctness (hot, new, top, discussed)
- Filter combinations (top10k_streamers, timeframe)
- Ordering verification (hot score, vote count, comment count, creation time)
- Database state verification after operations

**Coverage:**
- All major sort options tested (hot, new, top, discussed)
- Pagination edge cases (empty results, boundary values, multi-page)
- Filter parameters (timeframe, top10k_streamers)
- Combined filter testing

**Running Discovery Lists tests:**

```bash
# Unit tests only
cd backend
go test -v ./internal/handlers -run TestDiscoveryList
go test -v ./internal/handlers -run TestListDiscoveryLists
go test -v ./internal/handlers -run TestGetDiscoveryListClips

# Integration tests (requires test database)
docker compose -f docker-compose.test.yml up -d
go test -v -tags=integration ./tests/integration/discovery/...
docker compose -f docker-compose.test.yml down
```

### Live Status Tracking Tests

The Live Status Tracking system has comprehensive integration test coverage:

**Integration Tests** (`backend/tests/integration/live_status/live_status_integration_test.go`):
- Live status persistence and retrieval (UpsertLiveStatus, GetLiveStatus)
- Status transitions (offline → online, online → offline)
- API endpoint testing (GetBroadcasterLiveStatus, ListLiveBroadcasters, GetFollowedLiveBroadcasters)
- Authentication and authorization for protected endpoints
- Sync status tracking and logging
- Error logging for upstream failures
- Cache invalidation via timestamp updates
- Database state verification after all operations

**Coverage:**
- Full CRUD operations on broadcaster live status
- All HTTP API endpoints with proper authentication
- Sync status and sync log creation
- Error handling and logging
- Pagination and ordering of live broadcasters
- User-specific followed broadcaster filtering

**Running Live Status tests:**

```bash
# Setup test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Integration tests
cd backend
go test -v -tags=integration ./tests/integration/live_status/...

# Run specific test suites
go test -v -tags=integration ./tests/integration/live_status/... -run TestLiveStatusPersistence
go test -v -tags=integration ./tests/integration/live_status/... -run TestLiveStatusAPIEndpoints
go test -v -tags=integration ./tests/integration/live_status/... -run TestSyncStatusAndLogging
go test -v -tags=integration ./tests/integration/live_status/... -run TestCacheInvalidationViaTimestamp

# Cleanup
docker compose -f docker-compose.test.yml down
```

### Chat/WebSocket Backend Reliability Tests

The Chat/WebSocket system has comprehensive integration test coverage for reliability and real-time messaging:

**Integration Tests** (`backend/tests/integration/chat/chat_reliability_test.go`):
- Multi-client connection and disconnection lifecycle
- Presence notifications (join/leave events)
- Message fanout to all connected clients
- Message ordering preservation within channels
- Reconnection with message history delivery (last 50 messages)
- Message deduplication using client-provided IDs
- Rate limiting enforcement (20 messages per minute)
- Slow client handling and backpressure (full send buffers)
- Server stability under message overload
- Cross-channel message isolation

**Coverage:**
- Connection lifecycle with proper cleanup
- Real-time message broadcast to multiple clients
- Message persistence and history retrieval
- Rate limiting with error responses
- Graceful handling of slow consumers
- Channel isolation and security

**Test Scenarios:**
- `TestMultipleClientsConnectDisconnect` - Connection lifecycle and presence
- `TestMessageFanout` - Broadcast to all channel members
- `TestMessageOrdering` - Sequential message delivery
- `TestReconnectionAndMessageHistory` - State recovery on reconnect
- `TestMessageDeduplication` - Duplicate prevention
- `TestRateLimiting` - Rate limit enforcement
- `TestSlowClientHandling` - Backpressure handling
- `TestCrossChannelIsolation` - Security and isolation

**Running Chat/WebSocket tests:**

```bash
# Setup test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Integration tests
cd backend
go test -v -tags=integration ./tests/integration/chat/...

# Run specific test scenarios
go test -v -tags=integration ./tests/integration/chat/... -run TestMultipleClientsConnectDisconnect
go test -v -tags=integration ./tests/integration/chat/... -run TestMessageFanout
go test -v -tags=integration ./tests/integration/chat/... -run TestMessageOrdering
go test -v -tags=integration ./tests/integration/chat/... -run TestReconnectionAndMessageHistory
go test -v -tags=integration ./tests/integration/chat/... -run TestMessageDeduplication
go test -v -tags=integration ./tests/integration/chat/... -run TestRateLimiting
go test -v -tags=integration ./tests/integration/chat/... -run TestSlowClientHandling
go test -v -tags=integration ./tests/integration/chat/... -run TestCrossChannelIsolation

# Cleanup
docker compose -f docker-compose.test.yml down
```

**Note:** These tests require PostgreSQL (port 5437) and Redis (port 6380) to be running. Use `docker-compose.test.yml` to start test infrastructure.

### Scheduler & Background Job Tests

The scheduler system orchestrates background jobs for periodic tasks. All schedulers have comprehensive test coverage:

**Schedulers with Test Coverage:**

1. **Clip Sync Scheduler** (`clip_sync_scheduler_test.go`)
   - Periodic Twitch clip synchronization
   - Rate limiting and backoff logic
   - Error handling and retry behavior

2. **Hot Score Scheduler** (`hot_score_scheduler_test.go`)
   - Periodic recalculation of trending scores
   - Batch processing and database updates
   - Performance validation

3. **Trending Score Scheduler** (`trending_score_scheduler_test.go`)
   - Time-decay trending algorithm
   - Score persistence and cache invalidation
   - Ordering correctness

4. **Embedding Scheduler** (`embedding_scheduler_test.go`)
   - Semantic search embedding generation
   - Batch processing of new content
   - Vector database synchronization

5. **Webhook Retry Scheduler** (`webhook_retry_scheduler_test.go`)
   - Dead letter queue (DLQ) processing
   - Exponential backoff and retry limits
   - Delivery confirmation

6. **Live Status Scheduler** (`live_status_scheduler.go`)
   - Broadcaster live status synchronization
   - Follower notification triggers
   - 30-second interval reliability

7. **CDN Scheduler** (`cdn_scheduler.go`)
   - CDN cache warming and invalidation
   - Asset distribution scheduling
   - Failover coordination

8. **Reputation Scheduler** (`reputation_scheduler.go`)
   - User karma recalculation
   - Trust score updates
   - Reputation decay processing

9. **Export Scheduler** (`export_scheduler.go`)
   - GDPR data export generation
   - Scheduled cleanup of old exports
   - Notification delivery

10. **Email Metrics Scheduler** (`email_metrics_scheduler.go`)
    - Email delivery statistics aggregation
    - Bounce and complaint processing
    - Weekly reporting

11. **Mirror Scheduler** (`mirror_scheduler.go`)
    - Clip mirroring to CDN/storage
    - Redundancy and failover preparation
    - Cost optimization scheduling

12. **Outbound Webhook Scheduler** (`outbound_webhook_scheduler.go`)
    - Event-driven webhook delivery
    - Queue management and batching
    - Delivery tracking and metrics

**Test Coverage:**
- Unit tests: 85%+ coverage for core schedulers with dedicated `*_test.go` files (currently schedulers 1–5)
- Integration tests: Verify scheduling intervals, job execution, error handling (including schedulers 6–12)
- Load tests: Validate scheduler performance under sustained load

**Running Scheduler Tests:**

```bash
cd backend

# Run all scheduler unit tests
go test -v ./internal/scheduler/...

# Run specific scheduler test
go test -v ./internal/scheduler/ -run TestClipSyncScheduler
go test -v ./internal/scheduler/ -run TestWebhookRetryScheduler

# Run with race detection
go test -v -race ./internal/scheduler/...
```

**Scheduler Test Scenarios:**
- ✅ Correct scheduling intervals (30s, 1m, 5m, 15m, 1h, 24h)
- ✅ Graceful startup and shutdown
- ✅ Concurrent job execution limits
- ✅ Error handling and recovery
- ✅ Metrics emission (jobs_executed, jobs_failed, job_duration_ms)
- ✅ Database transaction management
- ✅ Idempotency (jobs can be safely retried)

**Observability:**

All schedulers emit OpenTelemetry traces and Prometheus metrics:

```promql
# Job execution rate
rate(scheduler_jobs_executed_total[5m])

# Job failure rate
rate(scheduler_jobs_failed_total[5m])

# Job duration (p95)
histogram_quantile(0.95, scheduler_job_duration_seconds_bucket)
```

Alert rules monitor scheduler health:
- `SchedulerJobFailureRateHigh`: > 5% failure rate
- `SchedulerJobStuckFor15Minutes`: No executions in 15+ minutes
- `SchedulerJobDurationHigh`: p95 > 60s

See [Monitoring Documentation](../../monitoring/README.md) for dashboard setup.

### Moderation Workflow E2E Tests

The Moderation Workflow has comprehensive end-to-end test coverage for admin/moderator operations:

**E2E Tests** (`frontend/e2e/tests/moderation-workflow.spec.ts`):
- **Access Control**: Admin-only access enforcement (non-admin blocked, admin/moderator allowed)
- **Single Actions**: Approve/reject individual submissions with rejection reasons
- **Bulk Actions**: Bulk approve/reject multiple submissions
- **Audit Logging**: Verification that all moderation actions create audit log entries
- **Rejection Reason Visibility**: Users can see rejection reasons for their submissions
- **Performance Baseline**: p95 page load time measurement for moderation queue

**Test Coverage:**
- ✅ Non-admin users blocked from accessing moderation queue
- ✅ Admin and moderator users can access moderation queue
- ✅ Single submission approval with audit logging
- ✅ Single submission rejection with reason display and audit logging
- ✅ Bulk approve submissions workflow with audit logs
- ✅ Bulk reject submissions workflow with reason and audit logs
- ✅ Rejection reasons visible to submitting users
- ✅ p95 page load time baseline measurement (< 3s for 50 submissions)
- ✅ Audit log creation for all moderation actions
- ✅ Audit log retrieval with filtering

**Running Moderation Workflow tests:**

```bash
cd frontend

# Run all moderation workflow tests
npm run test:e2e -- moderation-workflow.spec.ts

# Run specific test suites
npm run test:e2e -- moderation-workflow.spec.ts -g "Access Control"
npm run test:e2e -- moderation-workflow.spec.ts -g "Single Submission Actions"
npm run test:e2e -- moderation-workflow.spec.ts -g "Bulk Actions"
npm run test:e2e -- moderation-workflow.spec.ts -g "Audit Logging"
npm run test:e2e -- moderation-workflow.spec.ts -g "Performance Baseline"

# Run in headed mode to see browser
npm run test:e2e -- moderation-workflow.spec.ts --headed

# Run in UI mode for debugging
npm run test:e2e:ui -- moderation-workflow.spec.ts
```

**API Endpoints Tested:**
- `GET /api/admin/submissions` - List pending submissions (moderation queue)
- `POST /api/admin/submissions/:id/approve` - Approve single submission
- `POST /api/admin/submissions/:id/reject` - Reject single submission with reason
- `POST /api/admin/submissions/bulk-approve` - Bulk approve submissions
- `POST /api/admin/submissions/bulk-reject` - Bulk reject submissions with reason
- `GET /api/submissions` - User's own submissions (includes rejection reasons)
- `GET /api/admin/audit-logs` - Retrieve audit logs with filters

**Performance Metrics:**
- p95 page load time for moderation queue with 50 submissions (with mocked API responses): < 3 seconds (baseline)
- Test runs 20 iterations locally (10 iterations in CI) to establish baseline under mocked backend conditions
- Metrics logged: min, max, median, p95, mean load times

**Notes:**
- Tests use mocked API responses for consistent, isolated testing; real-world performance with actual backend latency may differ from these baselines
- Bulk actions are tested via API calls as UI doesn't expose bulk selection yet; these are API integration tests rather than true E2E tests
- Audit logging is verified for every moderation action
- Access control tests verify both blocking (403) and allowing access
- Performance baseline can be adjusted based on actual production requirements and production observability data

### Search Failover Tests

The Search Failover tests validate behavior when the primary search backend (OpenSearch) is degraded or unavailable. These tests ensure graceful fallback, correct HTTP semantics, observability, and alerting.

**Test Coverage:**
- OpenSearch timeout scenarios with fallback to PostgreSQL FTS
- OpenSearch 5xx error scenarios with fallback
- Response headers validation (`X-Search-Failover`, `X-Search-Failover-Reason`, `X-Search-Failover-Service`)
- Hybrid search 503 responses when no fallback available
- Suggestions endpoint failover behavior
- Failover metrics (`search_fallback_total`, `search_fallback_duration_ms`)
- Alert threshold validation

**Backend Integration Tests** (`backend/tests/integration/search/search_failover_test.go`):
- Simulates OpenSearch timeouts and errors using mock client
- Validates fallback to PostgreSQL FTS
- Verifies response headers during failover
- Tests 503 responses for hybrid search (no fallback)
- Validates suggestions endpoint failover

**Running Search Failover Tests:**

```bash
# Setup test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Run search failover integration tests
cd backend
go test -v -tags=integration ./tests/integration/search/... -run TestSearchFailover

# Cleanup
docker compose -f docker-compose.test.yml down
```

**Load Tests (k6)** (`backend/tests/load/scenarios/search_failover.js`):
- Tests system stability under sustained OpenSearch failures
- Validates alert thresholds during failover
- Monitors failover rate and latency metrics
- Verifies graceful degradation

```bash
# Run search failover load test
# Note: Requires OPENSEARCH_FAILOVER_MODE=true to inject failures
export OPENSEARCH_FAILOVER_MODE=true
k6 run backend/tests/load/scenarios/search_failover.js

# With custom base URL
k6 run -e BASE_URL=http://staging:8080 -e OPENSEARCH_FAILOVER_MODE=true \
  backend/tests/load/scenarios/search_failover.js
```

**Frontend E2E Tests (Playwright)** (`frontend/e2e/tests/search-failover.spec.ts`):
- Validates user-facing UX during failover
- Tests empty state messaging
- Verifies retry affordances
- Tests pagination with fallback results
- Validates loading states

```bash
cd frontend

# Run search failover E2E tests
npm run test:e2e -- search-failover.spec.ts

# Run with failover mode enabled (requires backend configuration)
E2E_FAILOVER_MODE=true npm run test:e2e -- search-failover.spec.ts

# Run in headed mode to see browser
npm run test:e2e -- search-failover.spec.ts --headed

# Run in UI mode for debugging
npm run test:e2e:ui -- search-failover.spec.ts
```

**Monitoring & Alerts:**

The failover tests validate that appropriate Prometheus metrics are emitted:
- `search_fallback_total{reason="timeout|error"}` - Counter of failover events
- `search_fallback_duration_ms` - Histogram of fallback path latency

Alert rules in `monitoring/alerts.yml`:
- `SearchFailoverRateHigh` - Triggers when failover rate > 5/sec
- `SearchFailoverRateCritical` - Triggers when failover rate > 20/sec  
- `SearchFailoverLatencyHigh` - Triggers when P95 fallback latency > 500ms

**Diagnosing Failover Issues:**

See [Search Incidents Playbook](../operations/playbooks/search-incidents.md#search-failover) for:
- Investigation steps
- Common causes and fixes
- Resolution criteria
- Follow-up actions

```bash
# Check failover metrics in Prometheus
curl 'http://prometheus:9090/api/v1/query?query=rate(search_fallback_total[5m])'

# View failover by reason
curl 'http://prometheus:9090/api/v1/query?query=sum by (reason) (rate(search_fallback_total[5m]))'

# Check fallback latency
curl 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, sum(rate(search_fallback_duration_ms_bucket[5m])) by (le))'
```

### CDN Failover Tests

The CDN Failover tests validate behavior when the CDN is degraded or unavailable. These tests ensure graceful fallback to origin for static assets and HLS streaming.

**Test Coverage:**
- CDN timeout scenarios with fallback to origin
- CDN 5xx error scenarios with fallback
- Response headers validation (`X-CDN-Failover`, `X-CDN-Failover-Reason`, `X-CDN-Failover-Service`)
- HLS master playlist failover behavior
- HLS segment failover behavior
- Retry/backoff behavior (exponential backoff, max 3 retries)
- Cache header validation during failover
- Failover metrics (`cdn_failover_total`, `cdn_failover_duration_ms`)
- Alert threshold validation
- UI functionality during CDN failure

**Backend Integration Tests** (`backend/tests/integration/cdn/cdn_failover_test.go`):
- Simulates CDN timeouts and errors using mock provider
- Validates fallback to origin URLs
- Verifies response headers during failover
- Tests retry logic with exponential backoff
- Validates cache headers during failover

**Running CDN Failover Tests:**

```bash
# Setup test infrastructure
docker compose -f docker-compose.test.yml up -d

# Run migrations
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up

# Run CDN failover integration tests
cd backend
go test -v -tags=integration ./tests/integration/cdn/... -run TestCDNFailover

# Cleanup
docker compose -f docker-compose.test.yml down
```

**Load Tests (k6)** (`backend/tests/load/scenarios/cdn_failover.js`):
- Tests system stability under sustained CDN failures
- Validates alert thresholds during failover
- Monitors failover rate and latency metrics
- Verifies graceful degradation
- Tests static assets (thumbnails, images, JS bundles)
- Tests HLS playlists and media segments
- Validates retry behavior and prevents request storms

```bash
# Run CDN failover load test
# Note: Requires CDN_FAILOVER_MODE=true to inject failures
export CDN_FAILOVER_MODE=true
k6 run backend/tests/load/scenarios/cdn_failover.js

# With custom base URL
k6 run -e BASE_URL=http://staging:8080 -e CDN_FAILOVER_MODE=true \
  backend/tests/load/scenarios/cdn_failover.js
```

**Frontend E2E Tests (Playwright)** (`frontend/e2e/tests/cdn-failover.spec.ts`):
- Validates user-facing UX during failover
- Tests static asset loading from origin
- Tests HLS video playback during CDN failure
- Verifies player resilience (stall and resume)
- Tests UI responsiveness
- Validates loading states

```bash
cd frontend

# Run CDN failover E2E tests
npm run test:e2e -- cdn-failover.spec.ts

# Run with failover mode enabled (requires backend configuration)
E2E_CDN_FAILOVER_MODE=true npm run test:e2e -- cdn-failover.spec.ts

# Run in headed mode to see browser
npm run test:e2e -- cdn-failover.spec.ts --headed

# Run in UI mode for debugging
npm run test:e2e:ui -- cdn-failover.spec.ts
```

**Monitoring & Alerts:**

The failover tests validate that appropriate Prometheus metrics are emitted:
- `cdn_failover_total{reason="timeout|error|dns_failure"}` - Counter of failover events
- `cdn_failover_duration_ms` - Histogram of fallback path latency

Alert rules:
- `CDNFailoverRateHigh` - Triggers when failover rate > 5/sec
- `CDNFailoverRateCritical` - Triggers when failover rate > 20/sec  
- `CDNFailoverLatencyHigh` - Triggers when P95 fallback latency > 500ms

**Diagnosing Failover Issues:**

See [CDN Failover Runbook](../../operations/CDN_FAILOVER_RUNBOOK.md) for:
- Investigation steps
- Common causes and fixes
- Resolution criteria
- Configuration options

```bash
# Check failover metrics in Prometheus
curl 'http://prometheus:9090/api/v1/query?query=rate(cdn_failover_total[5m])'

# View failover by reason
curl 'http://prometheus:9090/api/v1/query?query=sum by (reason) (rate(cdn_failover_total[5m]))'

# Check fallback latency
curl 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, sum(rate(cdn_failover_duration_ms_bucket[5m])) by (le))'
```

**Test Configuration:**

For local testing with Caddy simulating CDN failures:

```bash
# Start test environment with CDN failover simulation
caddy run --config Caddyfile.cdn-test

# In another terminal, run tests
npm run test:e2e -- cdn-failover.spec.ts
```

## Writing Tests

### Best Practices

1. **Test Independence**: Each test should be independent and not rely on other tests
2. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases
4. **Error Cases**: Always test both success and error scenarios
5. **Mock External Dependencies**: Use mocks for external services (email, payment, etc.)
6. **Clean Up**: Always clean up test data after tests complete
7. **Parallel Safety**: Tests should be safe to run in parallel when possible

### Example Test Structure

```go
func TestFeature(t *testing.T) {
    // Setup
    testData := setupTestData(t)
    defer testData.Cleanup()

    t.Run("SuccessCase", func(t *testing.T) {
        // Arrange
        input := createValidInput()
        
        // Act
        result, err := service.DoSomething(input)
        
        // Assert
        assert.NoError(t, err)
        assert.Equal(t, expectedValue, result)
    })

    t.Run("ErrorCase", func(t *testing.T) {
        // Arrange
        input := createInvalidInput()
        
        // Act
        result, err := service.DoSomething(input)
        
        // Assert
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "expected error message")
    })
}
```

## CI/CD Integration

All tests run automatically in CI/CD pipelines:

- **Unit tests**: Run on every commit
- **Integration tests**: Run on pull requests
- **E2E tests**: Run on staging deployments
- **Load tests**: Run before production releases
- **Rate limiting tests**: Run nightly to validate enforcement accuracy

### Rate Limiting Load Tests

Rate limiting load tests validate the accuracy and performance of rate limiting enforcement across key endpoints. These tests ensure that:

- Rate limits are enforced correctly at configured thresholds
- Allowed vs. blocked request ratios match expected values (±5% tolerance)
- Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After) are accurate
- p95 latency remains acceptable even under rate limiting
- Error rate stays below 1% (excluding expected 429 responses)

**Endpoints tested:**
- Submission endpoint: 10 requests/hour (basic users), 50/hour (premium)
- Metadata endpoint: 100 requests/hour (basic users), 500/hour (premium)
- Watch party create: 10 requests/hour
- Watch party join: 30 requests/hour
- Search endpoint: Variable rate limiting

**Running rate limiting tests:**

```bash
# Requires authentication token
export AUTH_TOKEN="your_jwt_token"
make test-load-rate-limiting

# Or run directly with k6
k6 run -e AUTH_TOKEN=$AUTH_TOKEN backend/tests/load/scenarios/rate_limiting.js
```

**Test output includes:**
- Submission attempts and blocked/allowed counts
- Metadata request distribution
- Watch party rate limit accuracy
- Rate limit header validation
- Latency metrics under rate limiting
- HTML report with visualizations

**CI Integration:**

Rate limiting tests run automatically in CI:
- Nightly scheduled runs at 2 AM UTC
- Manual trigger via GitHub Actions workflow
- Reports uploaded as artifacts

**Interpreting results:**

**Interpreting results:**

The test scenarios send requests over short 2-minute windows to validate rate limiting behavior:

- **Submission**: Sends 15 requests over 2 minutes. With a 10/hour limit, we'd expect the first ~0.33 requests to be allowed in the 2-minute window, then rate limiting kicks in for subsequent requests.
- **Metadata**: Sends 120 requests over 2 minutes. With a 100/hour limit, we'd expect the first ~3.3 requests to be allowed in the 2-minute window, then rate limiting applies.
- **Watch party create**: Sends 15 requests over 2 minutes. With a 10/hour limit, similar to submission above.
- **Watch party join**: Sends 40 requests over 2 minutes. With a 30/hour limit, we'd expect the first request to be allowed in the 2-minute window, then rate limiting applies.

**Note**: Because these tests run for only 2 minutes while rate limits are configured per hour, most requests will be rate limited. The key validation is:
- Rate limiting activates when the per-hour limit is exceeded
- Rate limit headers are present and accurate
- Latency remains acceptable even when rate limited

If blocked percentages deviate significantly from expected behavior, this indicates:
- Rate limiting configuration drift
- Middleware not properly applied to endpoints
- Redis connection issues affecting distributed rate limiting
- Premium user multipliers not working correctly

## Troubleshooting

### Test Database Connection Issues

If integration tests fail to connect to the database:

1. Ensure Docker containers are running: `docker ps`
2. Check database is ready: `docker logs clipper-test-db`
3. Verify connection string matches `docker-compose.test.yml` settings
4. Try restarting containers: `docker compose -f docker-compose.test.yml restart`

### Slow Tests

If tests are running slowly:

1. Use `go test -short` to skip long-running tests during development
2. Run specific test files or packages instead of all tests
3. Consider if tests can be parallelized with `t.Parallel()`
4. Profile tests to identify bottlenecks

### Test Failures

When tests fail:

1. Read the error message carefully
2. Check if test data was properly cleaned up from previous runs
3. Verify all required environment variables are set
4. Look for race conditions if failures are intermittent
5. Check if external dependencies (DB, Redis) are available

## Additional Resources

- [Integration & E2E Testing Guide](./integration-e2e-guide.md)
- [Testing Guide](./testing-guide.md)
- [Feature Test Coverage](../product/feature-test-coverage.md)
- [Backend Integration Tests README](../../backend/tests/integration/README.md)
- [Monitoring & Observability](../../monitoring/README.md)
- [Distributed Tracing Setup](../../monitoring/TRACING.md)
- [Load Testing Documentation](../../backend/tests/load/README.md)

## Related Issues (Roadmap 5.0)

This testing strategy supports the following Roadmap 5.0 initiatives:

### Master Tracker
- [#805 - Roadmap 5.0 Master Tracker](https://github.com/subculture-collective/clipper/issues/805)

### Phase 1 - Critical Security & Compliance (P0)
- [#917 - DMCA Handler Test Suite](https://github.com/subculture-collective/clipper/issues/917) ✅
- [#904 - GDPR Account Deletion Lifecycle Tests](https://github.com/subculture-collective/clipper/issues/904) ✅
- [#912 - Admin User Management Authorization Tests](https://github.com/subculture-collective/clipper/issues/912) ✅
- [#901 - Authorization Test Suite (RBAC Endpoints)](https://github.com/subculture-collective/clipper/issues/901) ✅
- [#914 - Validation Middleware Security Tests](https://github.com/subculture-collective/clipper/issues/914) ✅

### Phase 2 - Infrastructure Reliability (P0/P1)
- [#903 - Deployment Scripts Test Harness & Smoke Tests](https://github.com/subculture-collective/clipper/issues/903)
- [#902 - Database Migration Rollback Tests](https://github.com/subculture-collective/clipper/issues/902)
- [#913 - Backup & Restore Validation](https://github.com/subculture-collective/clipper/issues/913)
- [#907 - Monitoring Alert Rule Validation](https://github.com/subculture-collective/clipper/issues/907)

### Phase 3 - Feature Completeness (P1)
- [#910 - Mobile E2E Test Suite - Core Flows](https://github.com/subculture-collective/clipper/issues/910)
- [#906 - Discovery Lists - Unit + Integration + E2E Coverage](https://github.com/subculture-collective/clipper/issues/906) ✅
- [#911 - Live Status Tracking - Integration Tests](https://github.com/subculture-collective/clipper/issues/911) ✅
- [#915 - Moderation Workflow - E2E Coverage](https://github.com/subculture-collective/clipper/issues/915) ✅
- [#905 - Watch Party Real-time Sync Tests](https://github.com/subculture-collective/clipper/issues/905)

### Phase 4 - Performance & Optimization (P2)
- [#908 - Rate Limiting - Load Tests](https://github.com/subculture-collective/clipper/issues/908) ✅
- [#897 - Search Fallback Performance & Failover Tests](https://github.com/subculture-collective/clipper/issues/897) ✅
- [#898 - CDN Failover Simulation Tests](https://github.com/subculture-collective/clipper/issues/898) ✅
- [#899 - Webhook Delivery at Scale - Load & DLQ Replay](https://github.com/subculture-collective/clipper/issues/899)

### Additional Related Issues
- [#806-822 - Testing Infrastructure Issues](https://github.com/subculture-collective/clipper/issues?q=is%3Aissue+is%3Aopen+label%3Aarea%2Ftesting)
- [#817-818 - E2E Testing Enhancements](https://github.com/subculture-collective/clipper/issues?q=is%3Aissue+is%3Aopen+label%3Ae2e)
- [#812-814 - Integration Testing Improvements](https://github.com/subculture-collective/clipper/issues?q=is%3Aissue+is%3Aopen+label%3Aintegration)
- [#809 - Performance Testing Strategy](https://github.com/subculture-collective/clipper/issues/809)

---

**Document Version**: 2.0  
**Last Updated**: 2026-01-02  
**Maintained by**: [@backend-team](https://github.com/orgs/subculture-collective/teams/backend-team), [@platform-team](https://github.com/orgs/subculture-collective/teams/platform-team)  
**Next Review**: 2026-04-01 (Roadmap 5.0 Phase 1 Complete)
