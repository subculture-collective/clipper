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
├── pkg/utils/       # Public utility functions
├── config/          # Configuration management
├── go.mod          # Go module dependencies
└── go.sum          # Dependency checksums
```

## Getting Started

### Prerequisites

- Go 1.24 or higher
- PostgreSQL 17 (via Docker Compose)
- Redis 8 (via Docker Compose)

### Setup

1. Install dependencies:
   ```bash
   go mod download
   ```

2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your configuration (database, Redis, JWT secret, Twitch API keys)

4. Start database and Redis:
   ```bash
   cd .. && docker compose up -d
   ```

5. Run the server:
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
- `github.com/gin-gonic/gin` - HTTP web framework (already imported)
- `github.com/jackc/pgx/v5` - PostgreSQL driver
- `github.com/golang-jwt/jwt/v5` - JWT authentication
- `github.com/redis/go-redis/v9` - Redis client
- `github.com/joho/godotenv` - Environment variable management

### Development Tools
- `github.com/go-delve/delve` - Debugger (optional)

To add a dependency, simply import it in your code and run:
```bash
go mod tidy
```

## API Endpoints

### Health Check
- `GET /health` - Server health check

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

1. Implement database schema and migrations
2. Create repository layer for data access
3. Implement authentication with Twitch OAuth
4. Add business logic in services layer
5. Create HTTP handlers for API endpoints
6. Add comprehensive tests
7. Set up CI/CD pipeline

## Resources

- [Go Documentation](https://go.dev/doc/)
- [Gin Framework](https://gin-gonic.com/docs/)
- [pgx Documentation](https://pkg.go.dev/github.com/jackc/pgx/v5)
- [golang-jwt](https://github.com/golang-jwt/jwt)
