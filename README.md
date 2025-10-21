# Clipper 🎬

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

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Issue Tracker](https://github.com/subculture-collective/clipper/issues)
- [Documentation](./docs)
- [Twitch API Documentation](https://dev.twitch.tv/docs/api/)

## 📧 Support

For support, please open an issue in the GitHub repository.
