# Clipper 🎬

[![CI](https://github.com/subculture-collective/clipper/actions/workflows/ci.yml/badge.svg)](https://github.com/subculture-collective/clipper/actions/workflows/ci.yml)
[![Docker](https://github.com/subculture-collective/clipper/actions/workflows/docker.yml/badge.svg)](https://github.com/subculture-collective/clipper/actions/workflows/docker.yml)
[![CodeQL](https://github.com/subculture-collective/clipper/actions/workflows/codeql.yml/badge.svg)](https://github.com/subculture-collective/clipper/actions/workflows/codeql.yml)
[![Lighthouse CI](https://github.com/subculture-collective/clipper/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/subculture-collective/clipper/actions/workflows/lighthouse.yml)

A modern Twitch clip curation platform that allows users to discover, organize, and share their favorite Twitch clips with the community.

## 🏗️ Architecture

```
clipper/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   └── ...
├── backend/           # Go + Gin
│   ├── cmd/api/       # Application entry point
│   ├── internal/      # Private application code
│   │   ├── handlers/  # HTTP handlers
│   │   ├── models/    # Data models
│   │   ├── repository/# Database layer
│   │   ├── services/  # Business logic
│   │   └── middleware/# Auth, CORS, logging
│   ├── pkg/utils/     # Public utilities
│   └── config/        # Configuration
└── docs/             # Documentation
```

### Tech Stack

**Frontend:**
- React 19 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- React Router for navigation
- TanStack Query for API state management
- Zustand for global state
- Axios for API calls

**Backend:**
- Go 1.24+
- Gin web framework
- PostgreSQL (via pgx)
- Redis for caching
- JWT for authentication
- Twitch API integration

**Infrastructure:**
- Docker & Docker Compose for local development
- PostgreSQL 17
- Redis 8

## 🚀 Quick Start

### Prerequisites

- Go 1.24 or higher
- Node.js 20 or higher
- Docker and Docker Compose
- Make (optional, but recommended)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/subculture-collective/clipper.git
   cd clipper
   ```

2. **Install dependencies**
   ```bash
   make install
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   
   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your configuration
   ```

4. **Start Docker services**
   ```bash
   make docker-up
   ```

5. **Start development servers**
   
   Option A: Start everything at once
   ```bash
   make dev
   ```
   
   Option B: Start services individually
   ```bash
   # Terminal 1 - Backend
   make backend-dev
   
   # Terminal 2 - Frontend
   make frontend-dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080
   - API Health: http://localhost:8080/health

## 🛠️ Development

### Available Commands

Run `make help` to see all available commands:

```bash
make install        # Install all dependencies
make dev           # Start all services in development mode
make build         # Build both frontend and backend
make test          # Run all tests
make clean         # Clean build artifacts
make docker-up     # Start Docker services (PostgreSQL + Redis)
make docker-down   # Stop Docker services
make backend-dev   # Run backend in development mode
make frontend-dev  # Run frontend in development mode
make lint          # Run linters
```

### Backend Development

```bash
cd backend

# Run the server
go run cmd/api/main.go

# Build the binary
go build -o bin/api ./cmd/api

# Run tests
go test ./...

# Format code
go fmt ./...
```

### Frontend Development

```bash
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

## 📝 API Documentation

The API is organized under `/api/v1` prefix:

- `GET /health` - Health check endpoint
- `GET /api/v1/ping` - API ping endpoint

More endpoints will be documented as they are implemented.

## 🧪 Testing

### Backend Tests
```bash
cd backend
go test ./...
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Building for Production

```bash
# Build everything
make build

# Or build individually
make backend-build
make frontend-build
```

## 🐳 Docker

The project includes a `docker-compose.yml` for local development with PostgreSQL and Redis:

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Reset database
docker compose down -v
docker compose up -d
```

## 🚢 Deployment

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

- **CI Workflow**: Runs on every push and PR to `main` and `develop` branches
  - Lints and formats code (backend and frontend)
  - Runs tests with coverage reporting
  - Builds binaries and bundles
  - Matrix testing across Go 1.21/1.22 and Node 18/20

- **Docker Workflow**: Builds and pushes Docker images
  - Multi-stage builds for optimized image sizes
  - Pushes to GitHub Container Registry (ghcr.io)
  - Tags with version, branch, and commit SHA
  - Scans images for vulnerabilities with Trivy

- **Security Scanning**:
  - CodeQL analysis for Go and TypeScript
  - Weekly scheduled security scans
  - Automated dependency updates via Dependabot

### Docker Images

Build images locally:
```bash
# Backend
cd backend
docker build -t clipper-backend .

# Frontend
cd frontend
docker build -t clipper-frontend .
```

Pull from GitHub Container Registry:
```bash
docker pull ghcr.io/subculture-collective/clipper/backend:latest
docker pull ghcr.io/subculture-collective/clipper/frontend:latest
```

### Deployment Environments

#### Staging
- Deploys automatically on push to `develop` branch
- Environment: `staging`
- Runs smoke tests after deployment

To configure staging deployment, add these secrets to your repository:
- `STAGING_HOST`: Hostname of staging server
- `DEPLOY_SSH_KEY`: SSH private key for deployment

#### Production
- Deploys on push to `main` or version tags (`v*`)
- Requires manual approval via GitHub Environments
- Runs E2E tests before deployment
- Automatic rollback on health check failure

To configure production deployment, add these secrets:
- `PRODUCTION_HOST`: Hostname of production server
- `DEPLOY_SSH_KEY`: SSH private key for deployment

### Required Secrets

Configure the following secrets in your GitHub repository settings:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `CODECOV_TOKEN` | Codecov upload token | Coverage reporting |
| `STAGING_HOST` | Staging server hostname | Staging deployment |
| `PRODUCTION_HOST` | Production server hostname | Production deployment |
| `DEPLOY_SSH_KEY` | SSH key for deployment | Both deployments |

### Manual Deployment

To deploy manually, use workflow dispatch:
```bash
# Via GitHub UI
Actions > Deploy to Staging/Production > Run workflow

# Via GitHub CLI
gh workflow run deploy-staging.yml
gh workflow run deploy-production.yml
```

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📖 Documentation

- [Quick Start - CI/CD](./docs/QUICK-START-CI-CD.md) - Quick reference for developers
- [CI/CD Pipeline](./docs/CI-CD.md) - Complete CI/CD documentation
- [Deployment Guide](./docs/DEPLOYMENT.md) - Detailed deployment instructions
- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute

## 🔗 Links

- [Issue Tracker](https://github.com/subculture-collective/clipper/issues)
- [Twitch API Documentation](https://dev.twitch.tv/docs/api/)

## 📧 Support

For support, please open an issue in the GitHub repository.
