# Development Setup Guide

This guide provides step-by-step instructions for setting up the Clipper development environment.

## Prerequisites

Ensure you have the following installed:

- **Go**: Version 1.24 or higher
  - Download from: <https://go.dev/dl/>
  - Verify: `go version`

- **Node.js**: Version 20 or higher
  - Download from: <https://nodejs.org/>
  - Verify: `node --version`

- **Docker & Docker Compose**: Latest version
  - Download from: <https://docs.docker.com/get-docker/>
  - Verify: `docker --version && docker compose version`

- **Make**: Usually pre-installed on Linux/Mac
  - Windows users can use WSL or install GNU Make
  - Verify: `make --version`

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/subculture-collective/clipper.git
cd clipper
```

### 2. Install Dependencies

```bash
make install
```

This will:

- Install Go dependencies for the backend
- Install npm dependencies for the frontend

### 3. Set Up Environment Variables

#### Backend Environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and configure:

- Database credentials
- Redis settings
- JWT secret (generate a secure random string)
- Twitch API credentials (obtain from <https://dev.twitch.tv/console>)

#### Frontend Environment

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env` and configure:

- API base URL (defaults to `http://localhost:8080/api/v1`)
- Twitch Client ID

### 4. Start Development Services

#### Option A: Start Everything at Once

```bash
make dev
```

This will start:

- Docker services (PostgreSQL + Redis)
- Backend server on port 8080
- Frontend development server on port 5173

#### Option B: Start Services Individually

Terminal 1 - Docker Services:

```bash
make docker-up
```

Terminal 2 - Backend:

```bash
make backend-dev
```

Terminal 3 - Frontend:

```bash
make frontend-dev
```

### 5. Access the Application

- **Frontend**: <http://localhost:5173>
- **Backend API**: <http://localhost:8080>
- **Health Check**: <http://localhost:8080/health>
- **API Ping**: <http://localhost:8080/api/v1/ping>

## Development Workflow

### Backend Development

```bash
# Navigate to backend directory
cd backend

# Run the server
go run cmd/api/main.go

# Build the binary
go build -o bin/api ./cmd/api

# Run tests
go test ./...

# Format code
go fmt ./...

# Add a new dependency
go get github.com/some/package
go mod tidy
```

### Frontend Development

```bash
# Navigate to frontend directory
cd frontend

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Add a new dependency
npm install package-name
```

### Using Make Commands

```bash
# Show all available commands
make help

# Install all dependencies
make install

# Build everything
make build

# Clean build artifacts
make clean

# Run linters
make lint

# Start/stop Docker services
make docker-up
make docker-down
```

## Project Structure

```text
clipper/
├── backend/              # Go backend
│   ├── cmd/api/         # Main application
│   ├── internal/        # Private packages
│   ├── pkg/             # Public utilities
│   └── config/          # Configuration
├── frontend/            # React frontend
│   └── src/            # Source code
├── docs/               # Documentation
├── docker-compose.yml  # Docker services
├── Makefile           # Development commands
└── README.md          # Main documentation
```

## Common Tasks

### Resetting the Database

```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Restart services
```

### Viewing Logs

```bash
# Docker services
docker compose logs -f

# Backend (if running with make dev)
# Check Terminal 2

# Frontend (if running with make dev)
# Check Terminal 3
```

### Debugging

#### Backend Debugging

Use VS Code with Go extension:

1. Install Go extension
2. Set breakpoints in code
3. Run "Debug" configuration

Or use Delve manually:

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
dlv debug cmd/api/main.go
```

#### Frontend Debugging

Use browser DevTools:

- Chrome: F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows)
- Firefox: F12
- Sources tab for breakpoints
- Console for logs
- Network tab for API calls

### Running Tests

```bash
# All tests
make test

# Backend only
cd backend && go test ./...

# Frontend only
cd frontend && npm test

# With coverage
cd backend && go test -cover ./...
```

## Troubleshooting

### Port Already in Use

If you see "address already in use" errors:

```bash
# Find process using port 8080 (backend)
lsof -i :8080
kill -9 <PID>

# Find process using port 5173 (frontend)
lsof -i :5173
kill -9 <PID>
```

### Docker Services Not Starting

```bash
# Check Docker is running
docker ps

# Remove all containers and volumes
docker compose down -v

# Restart Docker daemon
# Linux: sudo systemctl restart docker
# Mac: Restart Docker Desktop
# Windows: Restart Docker Desktop

# Try again
docker compose up -d
```

### Go Module Issues

```bash
cd backend
go clean -modcache
go mod download
go mod tidy
```

### Node Module Issues

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Permission Issues (Linux)

If you encounter permission issues with Docker:

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then test
docker ps
```

## Next Steps

1. Review the [Architecture Documentation](ARCHITECTURE.md)
2. Read the [API Documentation](API.md)
3. Check [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
4. Start implementing features!

## Getting Help

- Check existing documentation in `docs/`
- Search for existing issues on GitHub
- Create a new issue if you find a bug
- Join discussions in GitHub Discussions

## Additional Resources

- [Go Documentation](https://go.dev/doc/)
- [React Documentation](https://react.dev/)
- [Gin Framework](https://gin-gonic.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Twitch API Docs](https://dev.twitch.tv/docs/api/)
