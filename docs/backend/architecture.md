---
title: "Backend Architecture"
summary: "System design, components, patterns, and data flow of the Clipper backend."
tags: ["backend", "architecture", "go", "design"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["system architecture", "backend design"]
---

# Backend Architecture

## System Overview

Clipper uses a modern, scalable backend architecture with clear separation of concerns and industry-standard patterns.

## Technology Stack

**Core**:
- Go 1.24+ (programming language)
- Gin (web framework)
- PostgreSQL 17 (primary database)
- Redis 8 (caching, sessions)
- OpenSearch 2.11 (full-text search)

**Libraries**:
- pgx (PostgreSQL driver)
- go-redis (Redis client)
- golang-jwt (JWT authentication)
- godotenv (configuration)

**Deployment**:
- Docker & Docker Compose
- GitHub Actions CI/CD
- Kubernetes (production)

See [[../setup/development|Development Setup]] for local environment.

## High-Level Architecture

```text
┌─────────────────┐
│   Clients       │  (Web, Mobile, API)
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  API Gateway    │  (Gin + Middleware)
└────────┬────────┘
         │
    ┌────┴─────┬──────────┬──────────┐
    │          │          │          │
    ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Handler │ │Handler │ │Handler │ │Handler │
│ (Auth) │ │(Clips) │ │(Search)│ │(Users) │
└───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
    │          │          │          │
    └──────────┴──────────┴──────────┘
               │
               ▼
    ┌─────────────────┐
    │  Service Layer  │  (Business Logic)
    └────────┬────────┘
             │
    ┌────────┴─────────┬─────────────┐
    │                  │             │
    ▼                  ▼             ▼
┌──────────┐    ┌────────────┐  ┌────────┐
│PostgreSQL│    │ OpenSearch │  │ Redis  │
└──────────┘    └────────────┘  └────────┘
```

## Directory Structure

```text
backend/
├── cmd/
│   ├── api/              # Main application entry point
│   └── backfill-search/  # Search index backfill tool
├── config/               # Configuration management
├── internal/             # Private application code
│   ├── handlers/         # HTTP request handlers
│   ├── middleware/       # HTTP middleware (auth, CORS, logging)
│   ├── models/           # Domain models
│   ├── repository/       # Data access layer (PostgreSQL)
│   └── services/         # Business logic
├── migrations/           # Database migrations (SQL)
├── pkg/                  # Public libraries
│   ├── opensearch/       # OpenSearch client
│   ├── redis/            # Redis client
│   └── utils/            # Shared utilities
├── scripts/              # Operational scripts
├── tests/                # Test files
│   ├── integration/      # Integration tests
│   └── load/             # k6 load tests
└── testdata/             # Test fixtures
```

## Architectural Patterns

### Layered Architecture

The backend follows a strict layered architecture:

1. **Handler Layer** (`internal/handlers/`)
   - HTTP request/response handling
   - Request validation
   - Response serialization
   - Auth checks

2. **Service Layer** (`internal/services/`)
   - Business logic
   - Transaction management
   - Cross-cutting concerns
   - External service coordination

3. **Repository Layer** (`internal/repository/`)
   - Data access abstraction
   - SQL query execution
   - ORM-like patterns
   - Database-specific logic

4. **Infrastructure Layer** (`pkg/`)
   - External service clients (OpenSearch, Redis)
   - Shared utilities
   - Configuration

**Rule**: Upper layers depend on lower layers, never the reverse. Services use repositories, handlers use services.

### Dependency Injection

Dependencies are injected through constructors:

```go
// Service with injected dependencies
type ClipService struct {
    clipRepo     repository.ClipRepository
    searchSvc    SearchIndexer
    analytics    AnalyticsService
}

func NewClipService(
    clipRepo repository.ClipRepository,
    searchSvc SearchIndexer,
    analytics AnalyticsService,
) *ClipService {
    return &ClipService{
        clipRepo:  clipRepo,
        searchSvc: searchSvc,
        analytics: analytics,
    }
}
```

### Repository Pattern

Repositories provide clean data access abstraction:

```go
type ClipRepository interface {
    GetByID(ctx context.Context, id string) (*models.Clip, error)
    List(ctx context.Context, opts ListOptions) ([]*models.Clip, int, error)
    Create(ctx context.Context, clip *models.Clip) error
    Update(ctx context.Context, clip *models.Clip) error
    Delete(ctx context.Context, id string) error
}
```

Benefits:
- Testability (easy to mock)
- Flexibility (swap implementations)
- Clear contracts

### Middleware Chain

Requests flow through middleware before reaching handlers:

```
Request → Recovery → Logger → CORS → Auth → RateLimit → Handler
```

See [[api|API Reference]] for endpoint documentation.

## Authentication Flow

Uses JWT tokens with Twitch OAuth:

```text
1. User clicks "Login with Twitch"
   ↓
2. Redirect to Twitch OAuth
   ↓
3. Twitch redirects back with code
   ↓
4. Backend exchanges code for Twitch token
   ↓
5. Create user record if new
   ↓
6. Generate JWT token
   ↓
7. Return JWT to client
   ↓
8. Client includes JWT in Authorization header
   ↓
9. Middleware validates JWT on each request
```

See [[authentication|Authentication]] and [[rbac|RBAC]] for details.

## Data Flow

### Clip Creation Example

```text
1. POST /api/v1/clips
   ↓
2. AuthMiddleware validates JWT
   ↓
3. ClipHandler.Create() validates request
   ↓
4. ClipService.Create() applies business rules
   ↓
5. ClipRepository.Create() saves to PostgreSQL
   ↓
6. SearchIndexer.IndexClip() adds to OpenSearch
   ↓
7. EmbeddingService.Generate() creates vector (async)
   ↓
8. Return success response
```

### Search Query Example

```text
1. GET /api/v1/search?q=valorant
   ↓
2. SearchHandler.Search() parses query
   ↓
3. HybridSearchService combines:
   a. OpenSearchService.Search() (BM25)
   b. VectorSearchService.Search() (semantic)
   ↓
4. Merge and re-rank results
   ↓
5. Return top N results
```

See [[search|Search Platform]] and [[semantic-search|Semantic Search]].

## Configuration Management

Environment-based configuration using `.env` files:

```go
type Config struct {
    ServerPort        string
    DatabaseURL       string
    RedisURL          string
    OpenSearchURL     string
    JWTSecret         string
    TwitchClientID    string
    TwitchSecret      string
}
```

See [[../setup/environment|Environment Setup]].

## Error Handling

Structured error responses:

```go
type APIError struct {
    Code    string                 `json:"code"`
    Message string                 `json:"message"`
    Details map[string]interface{} `json:"details,omitempty"`
}
```

Standard error codes:
- `INVALID_REQUEST`: Bad input
- `UNAUTHORIZED`: Auth required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Duplicate resource
- `INTERNAL_ERROR`: Server error

## Performance Optimizations

### Caching Strategy

1. **Redis Cache** (see [[../operations/caching-strategy|Caching Strategy]])
   - Session storage (15 min TTL)
   - API responses (5 min TTL)
   - Twitch API responses (1 hour TTL)
   - Leaderboards (30 sec TTL)

2. **Database Indexes**
   - Primary keys (UUID)
   - Foreign keys
   - Frequently queried columns
   - Full-text search columns (GIN)
   - Vector embeddings (HNSW)

3. **Connection Pooling**
   - PostgreSQL: 25 max connections
   - Redis: 10 max connections
   - OpenSearch: 10 max connections

### Query Optimization

- Use prepared statements
- Limit result sets with pagination
- SELECT only needed columns
- Use EXPLAIN ANALYZE for slow queries
- Batch operations when possible

See [[database|Database]] and [[testing|Load Testing]].

## Security Considerations

- Passwords hashed with bcrypt (cost factor 10)
- JWTs signed with HS256
- CORS configured for frontend origin only
- Rate limiting per user/IP
- Input validation on all endpoints
- SQL injection prevention via parameterized queries
- XSS prevention via content-type headers

See [[authentication|Authentication]] and [[rbac|RBAC]].

## Scalability

The architecture supports horizontal scaling:

- **Stateless Services**: No local state, can scale with load balancer
- **Database**: PostgreSQL replication (read replicas)
- **Cache**: Redis Cluster
- **Search**: OpenSearch cluster (3+ nodes)
- **Async Jobs**: Background workers for embeddings, analytics

See [[../operations/infra|Infrastructure]].

## Observability

### Logging

Structured JSON logging with levels:
- DEBUG: Detailed debugging
- INFO: General information
- WARN: Warning conditions
- ERROR: Error conditions

### Metrics

Prometheus-compatible metrics:
- Request count by endpoint
- Response time histograms
- Error rates
- Cache hit/miss rates
- Database query duration

### Tracing

Distributed tracing with OpenTelemetry:
- Request ID propagation
- Service-to-service calls
- Database queries
- External API calls

See [[../operations/monitoring|Monitoring]].

## Testing Strategy

- **Unit Tests**: 80%+ coverage target
- **Integration Tests**: Database and external services
- **Load Tests**: k6 scenarios for performance
- **E2E Tests**: Playwright for critical workflows

See [[testing|Testing Guide]].

---

## Related Documentation

- [[api|API Reference]]
- [[database|Database]]
- [[search|Search Platform]]
- [[semantic-search|Semantic Search]]
- [[authentication|Authentication]]
- [[rbac|RBAC]]
- [[testing|Testing Guide]]
- [[../setup/development|Development Setup]]

---

[[../index|← Back to Index]]
