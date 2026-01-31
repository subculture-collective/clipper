# Clipper

**Community-driven Twitch clip curation.** Discover, vote, and organize the best moments — ranked by people, not algorithms.

![Status](https://img.shields.io/badge/status-active%20development-blue)
![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?logo=go&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What is Clipper?

Clipper is a platform for discovering and curating Twitch clips through community voting. Think Reddit meets Twitch clips:

- **Vote on clips** — upvote/downvote to surface the best content
- **Earn karma** — build reputation through quality contributions  
- **Comment & discuss** — nested threads with markdown support
- **Search everything** — hybrid BM25 + semantic vector search
- **Save & organize** — favorites, playlists, and collections

The goal: replace algorithmic black boxes with transparent, community-driven curation.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Go 1.24+, Gin, PostgreSQL 17, Redis 8, OpenSearch 2.11 |
| **Web** | React 19, TypeScript, Vite, TailwindCSS, TanStack Query |
| **Mobile** | React Native 0.76, Expo 52, Expo Router |
| **Auth** | Twitch OAuth, JWT with refresh tokens |
| **Infra** | Docker, Kubernetes, GitHub Actions CI/CD |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Go 1.24+
- Node.js 20+ (or use `nvm`)
- [golang-migrate](https://github.com/golang-migrate/migrate) CLI

### Development Setup

```bash
# Clone
git clone git@github.com:subculture-collective/clipper.git
cd clipper

# Copy environment configs
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start services (Postgres, Redis, OpenSearch)
docker compose up -d

# Run database migrations
make migrate-up

# (Optional) Seed with sample data
make migrate-seed

# Start backend (terminal 1)
cd backend && go run cmd/api/main.go

# Start frontend (terminal 2)
cd frontend && npm install && npm run dev
```

The app will be available at `http://localhost:5173` (frontend) and `http://localhost:8080` (API).

See [docs/setup/development.md](docs/setup/development.md) for detailed setup instructions.

## Project Structure

```
clipper/
├── backend/           # Go API server
│   ├── cmd/api/       # Entry point
│   ├── internal/      # Handlers, services, repository, middleware
│   ├── pkg/           # Shared packages (database, jwt, twitch, redis)
│   └── migrations/    # PostgreSQL migrations
├── frontend/          # React web app
│   └── src/           # Components, pages, hooks, context
├── mobile/            # React Native apps (iOS/Android)
├── docs/              # Obsidian documentation vault
├── helm/              # Kubernetes Helm charts
├── monitoring/        # Grafana, Prometheus configs
└── infrastructure/    # Terraform, deployment scripts
```

## Features

### Implemented ✅

- Twitch OAuth authentication
- Clip browsing with hot/new/top/rising sorts
- Upvote/downvote with karma system
- Reddit-style nested comments (10 levels deep)
- Hybrid search (BM25 + vector embeddings)
- Advanced query language (`game:Valorant votes:>50 after:last-week`)
- Favorites and playlists
- User profiles and karma tracking
- Role-based access control (RBAC)
- Rate limiting and abuse detection
- Moderation tools (reports, bans, Twitch mod actions)
- Premium tier infrastructure

### In Progress 🚧

- Tag and creator pages
- Saved searches and history
- Watch parties
- Push notifications (mobile)
- Recommendation personalization

See the [Roadmap](docs/product/roadmap.md) and [GitHub Issues](https://github.com/subculture-collective/clipper/issues) for current priorities.

## Documentation

Comprehensive docs live in the `docs/` folder as an Obsidian vault:

- **[Introduction](docs/introduction.md)** — Project overview
- **[API Reference](docs/backend/api.md)** — REST endpoints
- **[Database Schema](docs/DATABASE-SCHEMA.md)** — Tables and relationships
- **[Development Setup](docs/setup/development.md)** — Getting started
- **[Architecture](docs/backend/architecture.md)** — System design

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

```bash
# Run tests
make test

# Lint
cd backend && golangci-lint run
cd frontend && npm run lint

# Check docs
npm run docs:check
```

## License

MIT — see [LICENSE](LICENSE).

---

Built by [Subcult](https://github.com/subculture-collective) 🦞
