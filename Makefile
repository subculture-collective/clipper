.PHONY: help install dev build test clean docker-up docker-down backend-dev frontend-dev migrate-up migrate-down migrate-create migrate-seed migrate-status

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	@echo "Installing backend dependencies..."
	cd backend && go mod download
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing mobile dependencies..."
	cd mobile && npm install
	@echo "✓ All dependencies installed"

dev: ## Start all services in development mode (Note: mobile must be started separately with 'make mobile-dev')
	@echo "Starting development environment..."
	@make -j3 docker-up backend-dev frontend-dev

build: ## Build backend, frontend, and mobile
	@echo "Building backend..."
	cd backend && go build -o bin/api ./cmd/api
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Building mobile (iOS)..."
	cd mobile && npm run ios -- --configuration Release || echo "⚠ Mobile iOS build skipped (requires macOS)"
	@echo "✓ Build complete"

test: ## Run all tests
	@echo "Running backend tests..."
	cd backend && go test ./...
	@echo "Running frontend tests..."
	cd frontend && npm run test -- run
	@echo "Running mobile tests..."
	cd mobile && npm run test || echo "Mobile tests not configured"
	@echo "✓ Tests complete"

test-unit: ## Run unit tests only
	@echo "Running backend unit tests..."
	cd backend && go test -short ./...
	@echo "Running frontend unit tests..."
	cd frontend && npm run test -- run
	@echo "✓ Unit tests complete"

test-integration: ## Run integration tests (requires Docker)
	@echo "Starting test database..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true
	@echo "Running integration tests..."
	cd backend && go test -v -tags=integration ./...
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Integration tests complete"

test-coverage: ## Run tests with coverage report
	@echo "Running backend tests with coverage..."
	cd backend && go test -coverprofile=coverage.out -covermode=atomic ./...
	@echo "Generating coverage report..."
	cd backend && go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated at backend/coverage.html"
	@echo "✓ Coverage tests complete"

test-load: ## Run all load tests (requires k6)
	@if command -v k6 > /dev/null; then \
		echo "Running all load tests..."; \
		k6 run backend/tests/load/scenarios/feed_browsing.js; \
		k6 run backend/tests/load/scenarios/clip_detail.js; \
		k6 run backend/tests/load/scenarios/search.js; \
		k6 run backend/tests/load/scenarios/comments.js; \
		k6 run backend/tests/load/scenarios/mixed_behavior.js; \
		echo "✓ All load tests complete"; \
	else \
		echo "Error: k6 is not installed"; \
		echo "Install it with: brew install k6 (macOS) or visit https://k6.io/docs/getting-started/installation/"; \
		exit 1; \
	fi

test-load-feed: ## Run feed browsing load test
	@k6 run backend/tests/load/scenarios/feed_browsing.js

test-load-clip: ## Run clip detail view load test
	@k6 run backend/tests/load/scenarios/clip_detail.js

test-load-search: ## Run search load test
	@k6 run backend/tests/load/scenarios/search.js

test-load-comments: ## Run comments load test
	@k6 run backend/tests/load/scenarios/comments.js

test-load-submit: ## Run submission load test (requires AUTH_TOKEN)
	@k6 run backend/tests/load/scenarios/submit.js

test-load-mixed: ## Run mixed user behavior load test
	@k6 run backend/tests/load/scenarios/mixed_behavior.js

clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	rm -rf backend/bin
	rm -rf frontend/dist
	@echo "✓ Cleanup complete"

docker-up: ## Start Docker services (PostgreSQL + Redis)
	@echo "Starting Docker services..."
	docker compose -f docker-compose.prod.yml up -d
	@echo "✓ Docker services started"

docker-build: ## Start Docker services (PostgreSQL + Redis)
	@echo "Starting Docker build..."
	docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
	@echo "✓ Docker build complete, and services started"

docker-down: ## Stop Docker services
	@echo "Stopping Docker services..."
	docker compose -f docker-compose.prod.yml down
	@echo "✓ Docker services stopped"

docker-logs: ## View Docker service logs
	@echo "Tailing Docker service logs..."
	docker compose -f docker-compose.prod.yml logs -f --tail 500
	@echo "✓ Docker logs ended"

backend-dev: ## Run backend in development mode
	@echo "Waiting for PostgreSQL on localhost:5436..."
	@bash -c 'until pg_isready -h localhost -p 5436 -U clipper -d clipper_db >/dev/null 2>&1; do sleep 1; done'
	@echo "PostgreSQL is ready. Starting backend..."
	cd backend && go run cmd/api/main.go

frontend-dev: ## Run frontend in development mode
	@echo "Starting frontend..."
	cd frontend && npm run dev

backend-build: ## Build backend binary
	@echo "Building backend..."
	cd backend && go build -o bin/api ./cmd/api
	@echo "✓ Backend built"

frontend-build: ## Build frontend for production
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "✓ Frontend built"

mobile-dev: ## Run mobile app in development mode
	@echo "Starting mobile app..."
	cd mobile && npm start

mobile-ios: ## Run mobile app on iOS simulator
	@echo "Starting mobile app on iOS..."
	cd mobile && npm run ios

mobile-android: ## Run mobile app on Android emulator
	@echo "Starting mobile app on Android..."
	cd mobile && npm run android

mobile-build-ios: ## Build mobile app for iOS
	@echo "Building mobile app for iOS..."
	cd mobile && npm run ios -- --configuration Release
	@echo "✓ Mobile iOS built"

mobile-build-android: ## Build mobile app for Android
	@echo "Building mobile app for Android..."
	cd mobile && npm run android -- --variant=release
	@echo "✓ Mobile Android built"

lint: ## Run linters
	@echo "Linting backend..."
	cd backend && go fmt ./...
	@echo "Linting frontend..."
	cd frontend && npm run lint
	@echo "✓ Linting complete (mobile linting skipped - requires expo CLI fix)"

# Database Migration Commands
DB_URL := "postgresql://clipper:clipper_password@localhost:5436/clipper_db?sslmode=disable"
MIGRATIONS_PATH := backend/migrations

migrate-up: ## Run database migrations up
	@echo "Running database migrations..."
	@if command -v migrate > /dev/null; then \
		migrate -path $(MIGRATIONS_PATH) -database $(DB_URL) up; \
		echo "✓ Migrations completed"; \
	else \
		echo "Error: golang-migrate is not installed"; \
		echo "Install it with: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"; \
		exit 1; \
	fi

migrate-down: ## Rollback last database migration
	@echo "Rolling back database migration..."
	@if command -v migrate > /dev/null; then \
		migrate -path $(MIGRATIONS_PATH) -database $(DB_URL) down 1; \
		echo "✓ Rollback completed"; \
	else \
		echo "Error: golang-migrate is not installed"; \
		exit 1; \
	fi

migrate-down-all: ## Rollback all database migrations
	@echo "Rolling back all database migrations..."
	@if command -v migrate > /dev/null; then \
		migrate -path $(MIGRATIONS_PATH) -database $(DB_URL) down; \
		echo "✓ All migrations rolled back"; \
	else \
		echo "Error: golang-migrate is not installed"; \
		exit 1; \
	fi

migrate-create: ## Create a new migration (usage: make migrate-create NAME=migration_name)
	@if [ -z "$(NAME)" ]; then \
		echo "Error: NAME is required. Usage: make migrate-create NAME=migration_name"; \
		exit 1; \
	fi
	@if command -v migrate > /dev/null; then \
		migrate create -ext sql -dir $(MIGRATIONS_PATH) -seq $(NAME); \
		echo "✓ Migration files created"; \
	else \
		echo "Error: golang-migrate is not installed"; \
		exit 1; \
	fi

migrate-status: ## Check current migration version
	@echo "Checking migration status..."
	@if command -v migrate > /dev/null; then \
		migrate -path $(MIGRATIONS_PATH) -database $(DB_URL) version; \
	else \
		echo "Error: golang-migrate is not installed"; \
		exit 1; \
	fi

migrate-seed: ## Seed database with sample data
	@echo "Seeding database..."
	@PGPASSWORD=clipper_password psql -h localhost -p 5436 -U clipper -d clipper_db -f $(MIGRATIONS_PATH)/seed.sql
	@echo "✓ Database seeded"

migrate-seed-load-test: ## Seed database with load test data (includes sample data)
	@echo "Seeding database with load test data..."
	@PGPASSWORD=clipper_password psql -h localhost -p 5436 -U clipper -d clipper_db -f $(MIGRATIONS_PATH)/seed.sql
	@PGPASSWORD=clipper_password psql -h localhost -p 5436 -U clipper -d clipper_db -f $(MIGRATIONS_PATH)/seed_load_test.sql
	@echo "✓ Load test data seeded"

# Search Evaluation
evaluate-search: ## Run search quality evaluation
	@echo "Running search evaluation..."
	@cd backend && go build -o bin/evaluate-search ./cmd/evaluate-search
	@cd backend && ./bin/evaluate-search -verbose
	@echo "✓ Search evaluation complete"

evaluate-search-json: ## Run search evaluation and output JSON
	@echo "Running search evaluation..."
	@cd backend && go build -o bin/evaluate-search ./cmd/evaluate-search
	@cd backend && ./bin/evaluate-search -output evaluation-results.json
	@echo "✓ Results saved to backend/evaluation-results.json"
