# Clipper 🎬

[![CI](https://github.com/subculture-collective/clipper/actions/workflows/ci.yml/badge.svg)](https://github.com/subculture-collective/clipper/actions/workflows/ci.yml)
[![Docker](https://github.com/subculture-collective/clipper/actions/workflows/docker.yml/badge.svg)](https://github.com/subculture-collective/clipper/actions/workflows/docker.yml)
[![CodeQL](https://github.com/subculture-collective/clipper/actions/workflows/codeql.yml/badge.svg)](https://github.com/subculture-collective/clipper/actions/workflows/codeql.yml)
[![Lighthouse CI](https://github.com/subculture-collective/clipper/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/subculture-collective/clipper/actions/workflows/lighthouse.yml)
[![codecov](https://codecov.io/gh/subculture-collective/clipper/branch/main/graph/badge.svg)](https://codecov.io/gh/subculture-collective/clipper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, community-driven Twitch clip curation platform that allows users to discover, organize, vote on, and share their favorite Twitch clips with the community.

## ✨ Key Features

- 🎮 **Browse & Discover**: Explore trending Twitch clips from across the platform
- 🔍 **Smart Search**: Powered by OpenSearch with typo tolerance, fuzzy matching, and advanced filtering
- ⬆️ **Community Voting**: Upvote and downvote clips to curate the best content
- 💬 **Discussions**: Comment on clips with markdown support
- ⭐ **Favorites**: Save and organize your favorite clips
- 🏆 **Karma System**: Build reputation through quality contributions
- 🔐 **Twitch OAuth**: Seamless authentication with your Twitch account
- 📱 **Responsive Design**: Works beautifully on desktop and mobile

## 📚 Documentation

### For Users

- **[User Guide](docs/user-guide.md)** - How to use Clipper
- **[FAQ](docs/faq.md)** - Frequently asked questions
- **[Community Guidelines](docs/guidelines.md)** - Rules and best practices

### For Developers

- **[Development Setup](docs/development.md)** - Get started with development
- **[Architecture](docs/ARCHITECTURE.md)** - System design and architecture
- **[Mobile Architecture](docs/MOBILE_ARCHITECTURE.md)** - Mobile app architecture and patterns
- **[Mobile Implementation Guide](docs/MOBILE_IMPLEMENTATION_GUIDE.md)** - How to develop mobile apps
- **[API Documentation](docs/API.md)** - REST API reference
- **[Database Documentation](docs/database.md)** - Database management and migrations
- **[Search Platform](docs/SEARCH.md)** - OpenSearch setup and usage
- **[Semantic Search Architecture](docs/SEMANTIC_SEARCH_ARCHITECTURE.md)** - Hybrid BM25 + vector search
- **[Architecture Decision Records](docs/adr/)** - Key architectural decisions
- **[Testing Guide](docs/TESTING.md)** - Testing strategy and tools
- **[RBAC](docs/RBAC.md)** - Role-based access control and admin panel access

### Premium & Subscriptions

- **[Premium Overview](docs/PREMIUM_OVERVIEW.md)** - Complete guide to premium features and documentation index
- **[Premium Tiers](docs/PREMIUM_TIERS.md)** - Pricing strategy, tier benefits, and competitive analysis
- **[Entitlement Matrix](docs/ENTITLEMENT_MATRIX.md)** - Feature gates per platform with implementation details
- **[Trials and Discounts](docs/TRIALS_AND_DISCOUNTS.md)** - Trial periods, promotional campaigns, and coupon system
- **[Subscription Privileges Matrix](docs/SUBSCRIPTION_PRIVILEGES_MATRIX.md)** - Quick reference for features by tier
- **[Stripe Subscriptions](docs/SUBSCRIPTIONS.md)** - Stripe integration setup and payment processing

### Architecture Decisions

- **[RFC 001: Mobile Framework Selection](docs/rfcs/001-mobile-framework-selection.md)** - Decision to use React Native + Expo

### Operations

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Infrastructure Guide](docs/INFRASTRUCTURE.md)** - Infrastructure setup
- **[CI/CD Pipeline](docs/CI-CD.md)** - Continuous integration and deployment
- **[Monitoring Guide](docs/MONITORING.md)** - Error tracking and monitoring setup
- **[Runbook](docs/RUNBOOK.md)** - Operational procedures and incident triage

### Contributing

- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community standards
- **[Changelog](CHANGELOG.md)** - Version history and changes

## 🚦 Project Status

**Current Version**: v0.x (Pre-release)  
**Status**: Active Development  
**Target**: MVP Release Q2 2025

This project is currently in active development. Core features are being implemented and tested. We welcome contributions and feedback!

## 🏗️ Architecture

```text
clipper/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   └── ...
├── mobile/            # React Native + Expo (iOS & Android)
│   ├── app/           # Expo Router screens
│   ├── src/           # Components, hooks, services
│   └── assets/        # Images, fonts, icons
├── shared/            # Shared TypeScript code
│   └── src/
│       ├── types/     # Shared type definitions
│       ├── constants/ # Shared constants
│       └── utils/     # Shared utilities
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

**Frontend (Web):**

- React 19 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- React Router for navigation
- TanStack Query for API state management
- Zustand for global state
- Axios for API calls

**Mobile (iOS & Android):**

- React Native 0.76 with Expo 52
- Expo Router for navigation
- NativeWind (TailwindCSS) for styling
- TanStack Query for API state management
- Zustand for global state
- Shared TypeScript types with web

**Shared:**

- TypeScript types and interfaces
- API client configuration
- Shared constants and utilities

**Backend:**

- Go 1.24+
- Gin web framework
- PostgreSQL (via pgx)
- Redis for caching
- OpenSearch for search
- JWT for authentication
- Twitch API integration

**Infrastructure:**

- Docker & Docker Compose for local development
- PostgreSQL 17
- Redis 8
- OpenSearch 2.11

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
   - Frontend: <http://localhost:5173>
   - Backend API: <http://localhost:8080>
   - API Health: <http://localhost:8080/health>

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

We have a comprehensive testing strategy covering unit, integration, E2E, and load tests. See [Testing Guide](docs/TESTING.md) for detailed documentation.

### Quick Start

```bash
# Run all tests
make test

# Run unit tests only
make test-unit

# Run integration tests (requires Docker)
make test-integration

# Run tests with coverage
make test-coverage

# Run load tests (requires k6)
make test-load
```

### Backend Tests

```bash
cd backend

# Unit tests
go test ./...

# With coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# With race detection
go test -race ./...
```

### Frontend Tests

```bash
cd frontend

# Unit/integration tests
npm test

# With UI
npm run test:ui

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

### Coverage Status

- **Backend**: ~15% (Target: >80%)
  - JWT: 80% ✓
  - Scheduler: 81.8% ✓
  - Utils: 100% ✓
  - Handlers: 0% (in progress)
  - Services: 4.3% (in progress)
  
- **Frontend**: Infrastructure ready, tests in development

### Performance Targets

- Feed endpoint: <100ms (p95)
- API responses: <50ms (p95)
- Concurrent users: 1000+
- Requests/second: 100+

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

For complete details on setting up CI/CD secrets, see [CI/CD Secrets Setup Guide](docs/CI_CD_SECRETS.md).

### Required Secrets

Configure the following secrets in your GitHub repository settings:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `CODECOV_TOKEN` | Codecov upload token | Coverage reporting |
| `STAGING_HOST` | Staging server hostname | Staging deployment |
| `PRODUCTION_HOST` | Production server hostname | Production deployment |
| `DEPLOY_SSH_KEY` | SSH key for deployment | Both deployments |

See [CI/CD Secrets Setup Guide](docs/CI_CD_SECRETS.md) for detailed instructions on generating and configuring these secrets.

### Manual Deployment

To deploy manually, use workflow dispatch:

```bash
# Via GitHub UI
Actions > Deploy to Staging/Production > Run workflow

# Via GitHub CLI
gh workflow run deploy-staging.yml
gh workflow run deploy-production.yml
```

### Deployment Scripts

The repository includes several deployment automation scripts in the `scripts/` directory:

```bash
# Deploy application with automated backup and health checks
./scripts/deploy.sh

# Rollback to a previous version
./scripts/rollback.sh [backup-tag]

# Run health checks on all services
./scripts/health-check.sh

# Backup database and configuration
./scripts/backup.sh

# Set up SSL/TLS certificates (requires sudo)
sudo ./scripts/setup-ssl.sh
```

See [RUNBOOK.md](./docs/RUNBOOK.md) for detailed operational procedures.

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

Please read our [Contributing Guide](CONTRIBUTING.md) for:

- Development workflow
- Code standards and style
- Testing requirements
- Pull request process

Also review our [Code of Conduct](CODE_OF_CONDUCT.md) to understand our community standards.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- **[Issue Tracker](https://github.com/subculture-collective/clipper/issues)** - Report bugs or request features
- **[Discussions](https://github.com/subculture-collective/clipper/discussions)** - Ask questions and share ideas
- **[Twitch API Documentation](https://dev.twitch.tv/docs/api/)** - Official Twitch API docs
- **[Changelog](CHANGELOG.md)** - See what's new

## 📧 Support

- **For Users**: Check the [FAQ](docs/faq.md) or [User Guide](docs/user-guide.md)
- **For Developers**: See [Development Setup](docs/development.md) or open an issue
- **For Bugs**: Open an issue with the `bug` label
- **For Features**: Open an issue with the `enhancement` label

---

**Made with ❤️ by the Subculture Collective community**
