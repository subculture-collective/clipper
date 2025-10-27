# Developer Setup Guide

This guide will help you set up a local development environment for Clipper.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Docker Setup](#docker-setup)
6. [Development Workflow](#development-workflow)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Ensure you have the following installed on your development machine:

### Required Software

- **Go 1.24+**: [Download](https://golang.org/dl/)

    ```bash
    go version  # Should show 1.24 or higher
    ```

- **Node.js 20+**: [Download](https://nodejs.org/)

    ```bash
    node --version  # Should show v20.0.0 or higher
    npm --version
    ```

- **PostgreSQL 15+**: [Download](https://www.postgresql.org/download/)

    ```bash
    psql --version  # Should show 15 or higher
    ```

- **Redis 7+**: [Download](https://redis.io/download)

    ```bash
    redis-server --version  # Should show 7.0 or higher
    ```

- **Docker & Docker Compose** (optional but recommended): [Download](https://www.docker.com/products/docker-desktop)

    ```bash
    docker --version
    docker compose version
    ```

### Optional Tools

- **Make**: For running common tasks

    ```bash
    make --version
    ```

- **Git**: For version control

    ```bash
    git --version
    ```

- **VS Code**: Recommended IDE with Go and TypeScript extensions

## Environment Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/subculture-collective/clipper.git
cd clipper

# Add upstream remote
git remote add upstream https://github.com/subculture-collective/clipper.git
```

### 2. Set Up Twitch OAuth Application

You'll need to create a Twitch application to enable OAuth authentication:

1. Go to [Twitch Developers Console](https://dev.twitch.tv/console)
2. Click "Register Your Application"
3. Fill in the details:
    - **Name**: Clipper Local Dev
    - **OAuth Redirect URLs**: `http://localhost:8080/api/v1/auth/callback`
    - **Category**: Website Integration
4. Save and note down:
    - **Client ID**
    - **Client Secret** (click "New Secret")

### 3. Configure Environment Variables

All environment variables are documented in the `.env.example` files with detailed comments.

**Important**: Never commit `.env` files with actual values! See [Secrets Management Guide](SECRETS_MANAGEMENT.md) for best practices.

#### Backend Environment

```bash
# Copy example environment file
cd backend
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

The `.env.example` file contains all required variables with documentation. Key variables to configure:

- **Database**: PostgreSQL connection settings
- **Redis**: Cache connection settings
- **JWT**: Authentication keys (auto-generated if not provided)
- **Twitch API**: OAuth credentials from [Twitch Developer Console](https://dev.twitch.tv/console/apps)
- **Stripe**: Payment processing keys (use test mode for development)
- **Sentry**: Error tracking (optional, disable for local development)

See `backend/.env.example` for the complete list with detailed comments.

#### Frontend Environment

```bash
# Copy example environment file
cd ../frontend
cp .env.example .env

# Edit .env
nano .env
```

The `.env.example` file contains all required variables with documentation. Key variables to configure:

- **API URL**: Backend API endpoint (default: `http://localhost:8080/api/v1`)
- **Twitch Client ID**: For OAuth redirects
- **Stripe**: Publishable key and price IDs (use test mode)
- **Sentry**: Error tracking (optional, disable for local development)
- **Feature Flags**: Enable/disable features for development

See `frontend/.env.example` for the complete list with detailed comments.

## Backend Setup

### 1. Install Dependencies

```bash
cd backend

# Download Go modules
go mod download

# Verify installation
go mod verify
```

### 2. Set Up Database

#### Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis
cd ..  # Back to project root
make docker-up

# Or manually
docker compose up -d postgres redis
```

#### Manual Setup

If not using Docker:

```bash
# Create database
psql -U postgres
CREATE DATABASE clipper;
CREATE USER clipper WITH PASSWORD 'clipper_password';
GRANT ALL PRIVILEGES ON DATABASE clipper TO clipper;
\q

# Create tables
cd backend
go run cmd/api/main.go migrate
```

### 3. Run Database Migrations

```bash
cd backend

# Run migrations
go run cmd/api/main.go migrate

# Or if migrations script exists
./scripts/migrate.sh up
```

### 4. Seed Development Data (Optional)

```bash
# Seed database with test data
go run cmd/api/main.go seed

# Or use the seeding script if available
./scripts/seed.sh
```

### 5. Start Backend Server

```bash
# Development mode with hot reload (if available)
make backend-dev

# Or run directly
go run cmd/api/main.go

# With live reload using air (optional)
air

# The API will be available at http://localhost:8080
# Health check: http://localhost:8080/health
```

### Backend Development Tools

**Useful Commands**:

```bash
# Run tests
go test ./...

# Run tests with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Format code
go fmt ./...

# Run linter
golangci-lint run

# Build binary
go build -o bin/api ./cmd/api

# Generate mocks (if using mockgen)
go generate ./...
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend

# Install npm packages
npm install

# Verify installation
npm list --depth=0
```

### 2. Configure API Connection

The frontend should already be configured via the `.env` file created earlier.

Verify the API URL is correct:

```bash
# Check .env file
cat .env | grep VITE_API_BASE_URL
# Should output: VITE_API_BASE_URL=http://localhost:8080
```

### 3. Start Development Server

```bash
# Start Vite dev server
npm run dev

# The frontend will be available at http://localhost:5173
# with hot module replacement (HMR)
```

### Frontend Development Tools

**Useful Commands**:

```bash
# Run linter
npm run lint

# Fix lint issues
npm run lint -- --fix

# Build for production
npm run build

# Preview production build
npm run preview

# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run E2E tests
npm run test:e2e

# Run E2E with UI
npm run test:e2e:ui

# Type checking
npm run type-check  # If available
```

## Docker Setup

### Option 1: Full Docker Environment

Run everything in Docker (backend, frontend, database, Redis):

```bash
# Start all services
docker compose up

# Or run in background
docker compose up -d

# View logs
docker compose logs -f

# Access services:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:8080
# - PostgreSQL: localhost:5436 (external), postgres:5432 (internal)
# - Redis: localhost:6379
```

### Option 2: Hybrid Setup

Run database and Redis in Docker, but run backend and frontend locally:

```bash
# Start only database and Redis
docker compose up -d postgres redis

# Then run backend and frontend locally as described above
```

### Docker Management Commands

```bash
# Stop all services
docker compose down

# Stop and remove volumes (deletes data)
docker compose down -v

# Rebuild images
docker compose build

# View running containers
docker compose ps

# Execute command in container
docker compose exec backend sh
docker compose exec postgres psql -U clipper

# View logs for specific service
docker compose logs -f backend
```

## Development Workflow

### Daily Development

1. **Start Services**:

    ```bash
    # Terminal 1: Start Docker services (database, Redis)
    make docker-up

    # Terminal 2: Start backend
    make backend-dev

    # Terminal 3: Start frontend
    make frontend-dev
    ```

2. **Make Changes**:

    - Edit code in your IDE
    - Changes auto-reload in development mode
    - Check console for errors

3. **Test Changes**:

    ```bash
    # Run backend tests
    cd backend && go test ./...

    # Run frontend tests
    cd frontend && npm test
    ```

4. **Commit Changes**:

    ```bash
    git add .
    git commit -m "feat: description of changes"
    git push origin feature-branch
    ```

### Creating a New Feature

1. **Create Branch**:

    ```bash
    git checkout -b feature/your-feature-name
    ```

2. **Implement Feature**:

    - Write code
    - Add tests
    - Update documentation

3. **Test Thoroughly**:

    ```bash
    # Run all tests
    make test

    # Run linters
    make lint
    ```

4. **Submit PR**:
    - Push to your fork
    - Open Pull Request on GitHub
    - Wait for CI checks to pass

### Database Changes

**Creating Migrations**:

```bash
cd backend

# Create new migration
./scripts/create-migration.sh add_user_preferences

# This creates:
# - migrations/XXXXXX_add_user_preferences.up.sql
# - migrations/XXXXXX_add_user_preferences.down.sql
```

**Running Migrations**:

```bash
# Apply migrations
go run cmd/api/main.go migrate

# Rollback last migration
go run cmd/api/main.go migrate-down

# Check migration status
go run cmd/api/main.go migrate-status
```

### Hot Reloading

**Backend Hot Reload with Air**:

```bash
# Install air
go install github.com/cosmtrek/air@latest

# Run with air
cd backend
air

# Configuration in .air.toml
```

**Frontend Hot Reload**:

- Vite automatically reloads on changes
- No additional configuration needed

## Troubleshooting

### Common Issues

#### Backend Won't Start

**Problem**: `connection refused` errors

**Solutions**:

```bash
# Check if database is running
docker compose ps

# Check database connection
psql -h localhost -U clipper -d clipper

# Verify environment variables
cd backend && cat .env

# Check port availability
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows
```

#### Frontend Won't Start

**Problem**: `EADDRINUSE` error

**Solutions**:

```bash
# Kill process on port 5173
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

#### Database Connection Issues

**Problem**: `database does not exist` or `authentication failed`

**Solutions**:

```bash
# Recreate database
docker compose down -v
docker compose up -d postgres

# Wait for database to be ready
sleep 5

# Run migrations
cd backend && go run cmd/api/main.go migrate

# Verify connection
psql -h localhost -U clipper -d clipper -c "SELECT 1;"
```

#### Node Modules Issues

**Problem**: Dependency conflicts or missing modules

**Solutions**:

```bash
cd frontend

# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear npm cache if issues persist
npm cache clean --force
npm install
```

#### Go Module Issues

**Problem**: `go.sum` errors or missing dependencies

**Solutions**:

```bash
cd backend

# Update modules
go get -u ./...
go mod tidy

# Verify modules
go mod verify

# Clear cache if needed
go clean -modcache
go mod download
```

### Getting Help

If you're still stuck:

1. **Check Documentation**:

    - [API Documentation](API.md)
    - [Architecture Overview](ARCHITECTURE.md)
    - [Database Schema](DATABASE-SCHEMA.md)

2. **Search Issues**:

    - [GitHub Issues](https://github.com/subculture-collective/clipper/issues)
    - Look for similar problems

3. **Ask for Help**:

    - Open a new issue
    - Tag it with `question` label
    - Provide error messages and logs

4. **Join Community**:
    - Discuss in GitHub Discussions
    - Share your environment details

## Next Steps

Now that your development environment is set up:

1. **Explore the Codebase**:

    - Read [Architecture Documentation](ARCHITECTURE.md)
    - Review [API Documentation](API.md)
    - Check out [Database Schema](DATABASE-SCHEMA.md)

2. **Run the Tests**:

    - Backend: `cd backend && go test ./...`
    - Frontend: `cd frontend && npm test`

3. **Pick an Issue**:

    - Browse [good first issue](https://github.com/subculture-collective/clipper/labels/good%20first%20issue) labels
    - Comment on the issue to claim it
    - Start coding!

4. **Read Contributing Guide**:
    - [CONTRIBUTING.md](../CONTRIBUTING.md)
    - Learn about code style and PR process

---

**Happy coding! 🚀**
