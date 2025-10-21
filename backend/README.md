# Backend

Go-based REST API backend for Clipper.

## Tech Stack

- **Go**: 1.24+
- **Framework**: Gin (HTTP web framework)
- **Database**: PostgreSQL with pgx driver
- **Cache**: Redis with go-redis client
- **Authentication**: JWT with golang-jwt
- **Configuration**: godotenv for environment variables

## Project Structure

```
backend/
├── cmd/api/          # Application entry point
│   └── main.go      # Main server file
├── internal/        # Private application code
│   ├── handlers/    # HTTP request handlers
│   ├── models/      # Domain models and DTOs
│   ├── repository/  # Database access layer
│   ├── services/    # Business logic layer
│   └── middleware/  # HTTP middleware (auth, CORS, logging)
├── pkg/             # Public packages
│   ├── database/    # Database connection pool
│   └── utils/       # Public utility functions
├── config/          # Configuration management
├── migrations/      # Database migrations
│   ├── *.up.sql     # Migration up files
│   ├── *.down.sql   # Migration down files
│   ├── seed.sql     # Development seed data
│   └── README.md    # Migration documentation
├── go.mod           # Go module dependencies
└── go.sum           # Dependency checksums
```

## Getting Started


### Prerequisites

- Go 1.24 or higher
- PostgreSQL 17 (via Docker Compose)
- Redis 8 (via Docker Compose)
- golang-migrate CLI tool (for database migrations)

### Setup

1. Install dependencies:
   ```bash
   go mod download
   ```

2. Install golang-migrate (if not already installed):
   ```bash
   # macOS
   brew install golang-migrate
   
   # Linux
   curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xvz
   sudo mv migrate /usr/local/bin/
   
   # Or using Go
   go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your configuration (database, Redis, JWT secret, Twitch API keys)

5. Start database and Redis:
   ```bash
   cd .. && docker compose up -d
   ```

6. Run database migrations:
   ```bash
   # From project root
   make migrate-up
   
   # Or from backend directory
   cd backend
   migrate -path migrations -database "postgresql://clipper:clipper_password@localhost:5432/clipper_db?sslmode=disable" up
   ```

7. (Optional) Seed database with sample data:
   ```bash
   make migrate-seed
   ```

8. Run the server:
   ```bash
   go run cmd/api/main.go
   ```

The server will start on `http://localhost:8080`

## Development

### Building

```bash
# Build binary
go build -o bin/api ./cmd/api

# Run binary
./bin/api
```

### Testing

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific package tests
go test ./internal/handlers
```

### Code Quality

```bash
# Format code
go fmt ./...

# Run linter (if installed)
golangci-lint run

# Check for common mistakes
go vet ./...
```

## Dependencies

The following dependencies will be automatically added when imported in code:

### Core Dependencies
- `github.com/gin-gonic/gin` - HTTP web framework
- `github.com/jackc/pgx/v5` - PostgreSQL driver with connection pooling
- `github.com/google/uuid` - UUID generation and parsing
- `github.com/golang-jwt/jwt/v5` - JWT authentication
- `github.com/redis/go-redis/v9` - Redis client
- `github.com/joho/godotenv` - Environment variable management
- `github.com/golang-migrate/migrate/v4` - Database migrations

### Development Tools
- `github.com/go-delve/delve` - Debugger (optional)

To add a dependency, simply import it in your code and run:
```bash
go mod tidy
```

## Database Management

### Migrations

Database migrations are located in the `migrations/` directory. See [migrations/README.md](migrations/README.md) for detailed documentation.

**Common commands:**

```bash
# Run all pending migrations
make migrate-up

# Rollback the last migration
make migrate-down

# Rollback all migrations
make migrate-down-all

# Check current migration version
make migrate-status

# Create a new migration
make migrate-create NAME=add_new_feature

# Seed database with sample data (development only)
make migrate-seed
```

### Database Schema

The database includes the following tables:
- **users** - User accounts and profiles
- **clips** - Twitch clips with metadata
- **votes** - User votes on clips
- **comments** - User comments on clips
- **comment_votes** - User votes on comments
- **favorites** - User favorite clips
- **tags** - Categorization tags
- **clip_tags** - Many-to-many clip-tag relationships
- **reports** - Content moderation reports
- **refresh_tokens** - JWT refresh token storage

See [docs/DATABASE-SCHEMA.md](../docs/DATABASE-SCHEMA.md) for complete schema documentation including:
- Entity relationship diagram
- Table structures
- Triggers and functions
- Views for common queries
- Indexes and performance optimization

### Database Models

Go models for all database tables are defined in `internal/models/models.go`:
- Type-safe representations of database entities
- JSON serialization tags for API responses
- UUID types for all primary keys
- Proper handling of nullable fields

## API Endpoints

### Health Check
- `GET /health` - Basic server health check
- `GET /health/ready` - Readiness check (includes database and Redis connectivity)
- `GET /health/live` - Liveness check
- `GET /health/stats` - Database connection pool statistics

### Authentication
- `GET /api/v1/auth/twitch` - Initiate Twitch OAuth flow
- `GET /api/v1/auth/twitch/callback` - OAuth callback handler
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user (requires auth)

See [docs/authentication.md](docs/authentication.md) for complete authentication documentation.

### API v1
- `GET /api/v1/ping` - API ping test

More endpoints will be added as features are implemented.

## Environment Variables

See `.env.example` for all available configuration options:

- **Server**: Port, Gin mode
- **Database**: Host, port, credentials, database name
- **Redis**: Host, port, password
- **JWT**: Secret key, token expiration
- **Twitch API**: Client ID, secret, redirect URI
- **CORS**: Allowed origins

## Project Conventions

### Code Style
- Follow standard Go conventions
- Use `gofmt` for formatting
- Use meaningful variable and function names
- Keep functions small and focused
- Document exported functions with comments

### Package Organization
- `cmd/` - Application entry points
- `internal/` - Private application code (cannot be imported by other projects)
- `pkg/` - Public libraries (can be imported by other projects)
- `config/` - Configuration management

### Error Handling
- Always check and handle errors
- Return errors to caller when appropriate
- Log errors with context
- Use custom error types for domain-specific errors

### Logging
- Use structured logging
- Log at appropriate levels (debug, info, warn, error)
- Include context in log messages

## Next Steps

1. ✅ ~~Implement database schema and migrations~~
2. ✅ ~~Create database connection pool~~
3. ✅ ~~Define Go models for all tables~~
4. ✅ ~~Create repository layer for data access~~
5. ✅ ~~Implement authentication with Twitch OAuth~~
6. Add business logic in services layer
7. Create HTTP handlers for API endpoints
8. Add comprehensive tests
9. Add Redis caching layer

## Resources

- [Go Documentation](https://go.dev/doc/)
- [Gin Framework](https://gin-gonic.com/docs/)
- [pgx Documentation](https://pkg.go.dev/github.com/jackc/pgx/v5)
- [golang-migrate](https://github.com/golang-migrate/migrate)
- [golang-jwt](https://github.com/golang-jwt/jwt)
- [Database Schema Documentation](../docs/DATABASE-SCHEMA.md)
- [Authentication Documentation](docs/authentication.md)
