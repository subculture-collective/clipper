.PHONY: help install dev build test clean docker-up docker-down backend-dev frontend-dev migrate-up migrate-down migrate-create migrate-seed migrate-status test-security test-idor

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

build: ## Build backend, frontend, and mobile
	@echo "Building backend..."
	cd backend && go build -o bin/api ./cmd/api
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Building mobile (iOS)..."
	cd mobile && npm run ios -- --configuration Release || echo "⚠ Mobile iOS build skipped (requires macOS)"
	@echo "✓ Build complete"

test-setup: ## Set up test environment (containers + migrations)
	@echo "Starting test containers (Postgres + Redis + OpenSearch)..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for test Postgres on localhost:5437..."
	@bash -c 'until pg_isready -h localhost -p 5437 -U clipper -d clipper_test >/dev/null 2>&1; do sleep 1; done'
	@echo "Postgres is ready. Running test migrations..."
	@if command -v migrate > /dev/null; then \
		migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true; \
	else \
		echo "Warning: golang-migrate not installed. Skipping migrations."; \
		echo "Install with: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"; \
	fi
	@echo "Waiting for OpenSearch on localhost:9200..."
	@bash -c 'for i in {1..60}; do if curl -f -s http://localhost:9200/_cluster/health >/dev/null 2>&1; then echo "OpenSearch is ready"; exit 0; fi; sleep 1; done; echo "OpenSearch failed to become ready"; exit 1'
	@echo "Seeding OpenSearch with test indices..."
	@if [ -f scripts/test-seed-opensearch.sh ]; then \
		OPENSEARCH_URL=http://localhost:9200 bash scripts/test-seed-opensearch.sh; \
	else \
		echo "Warning: test-seed-opensearch.sh not found"; \
	fi
	@echo "Seeding E2E test data (clips, users, subscriptions)..."
	@if [ -f scripts/test-seed-e2e.sh ]; then \
		TEST_DATABASE_HOST=localhost \
		TEST_DATABASE_PORT=5437 \
		TEST_DATABASE_USER=clipper \
		TEST_DATABASE_PASSWORD=clipper_password \
		TEST_DATABASE_NAME=clipper_test \
		OPENSEARCH_URL=http://localhost:9200 \
		bash scripts/test-seed-e2e.sh; \
	else \
		echo "Warning: test-seed-e2e.sh not found"; \
	fi

test-teardown: ## Tear down test environment (containers)
	@echo "Stopping test containers..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Test environment teardown complete"

test: ## Run all tests (unit by default; set INTEGRATION=1 and/or E2E=1 to expand)
	@if [ "$(INTEGRATION)" = "1" ] || [ "$(E2E)" = "1" ]; then \
		$(MAKE) test-setup; \
	fi
	@echo "Running backend unit tests..."
	cd backend && go test ./...
	@if [ "$(E2E)" = "1" ]; then \
		echo "Starting backend API for E2E..."; \
		mkdir -p .tmp; \
		(\
			cd backend && \
			PORT=8080 \
			GIN_MODE=release \
			BASE_URL=http://localhost:5173 \
			DB_HOST=localhost \
			DB_PORT=5437 \
			DB_USER=clipper \
			DB_PASSWORD=clipper_password \
			DB_NAME=clipper_test \
			REDIS_HOST=localhost \
			REDIS_PORT=6380 \
			OPENSEARCH_URL=http://localhost:9200 \
			CORS_ALLOWED_ORIGINS=http://localhost:5173 \
			RATE_LIMIT_WHITELIST_IPS=127.0.0.1 \
			FEATURE_ANALYTICS=false \
			go run cmd/api/main.go \
		) > .tmp/backend-e2e.log 2>&1 & echo $$! > .tmp/backend-e2e.pid; \
		echo "Backend started (PID: $$(cat .tmp/backend-e2e.pid))"; \
		sleep 3; \
		echo "Running frontend E2E tests..."; \
		cd frontend && npm run test:e2e; \
		echo "Stopping backend API..."; \
		if [ -f .tmp/backend-e2e.pid ]; then kill $$(cat .tmp/backend-e2e.pid) || true; rm -f .tmp/backend-e2e.pid; fi; \
	else \
		echo "Skipping E2E tests (set E2E=1 to enable)"; \
	fi
	@echo "Running mobile tests..."
	cd mobile && npm run test || echo "Mobile tests not configured"
	@if [ "$(INTEGRATION)" = "1" ] || [ "$(E2E)" = "1" ]; then \
		$(MAKE) test-teardown; \
	fi
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
	cd backend && go test -v -tags=integration -race -parallel=4 ./tests/integration/...
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Integration tests complete"

test-integration-coverage: ## Run integration tests with coverage report
	@echo "Starting test database..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true
	@echo "Running integration tests with coverage..."
	cd backend && go test -v -tags=integration -race -parallel=4 -coverprofile=coverage-integration.out -covermode=atomic ./tests/integration/...
	@echo "Generating coverage report..."
	cd backend && go tool cover -html=coverage-integration.out -o coverage-integration.html
	@echo "Calculating coverage percentage..."
	@cd backend && go tool cover -func=coverage-integration.out | grep total | awk '{print "Integration test coverage: " $$3}'
	@echo "Coverage report generated at backend/coverage-integration.html"
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Integration tests with coverage complete"

test-integration-auth: ## Run authentication integration tests only
	@echo "Starting test database..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true
	@echo "Running authentication integration tests..."
	cd backend && go test -v -tags=integration ./tests/integration/auth/...
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Authentication tests complete"

test-integration-submissions: ## Run submission integration tests only
	@echo "Starting test database..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true
	@echo "Running submission integration tests..."
	cd backend && go test -v -tags=integration ./tests/integration/submissions/...
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Submission tests complete"

test-integration-engagement: ## Run engagement integration tests only
	@echo "Starting test database..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true
	@echo "Running engagement integration tests..."
	cd backend && go test -v -tags=integration ./tests/integration/engagement/...
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Engagement tests complete"

test-integration-premium: ## Run premium integration tests only
	@echo "Starting test database..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true
	@echo "Running premium integration tests..."
	cd backend && go test -v -tags=integration ./tests/integration/premium/...
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Premium tests complete"

test-integration-stripe: ## Run Stripe subscription & payment integration tests only
	@echo "Starting test database..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true
	@echo "Running Stripe integration tests..."
	@echo "Note: Tests use Stripe test mode keys. Set TEST_STRIPE_SECRET_KEY and TEST_STRIPE_WEBHOOK_SECRET env vars for full testing."
	cd backend && go test -v -tags=integration ./tests/integration/premium/ -run "TestWebhook.*|TestEntitlement.*|TestProration.*|TestPaymentFailure.*"
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Stripe integration tests complete"

test-integration-search: ## Run search integration tests only
	@echo "Starting test database..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true
	@echo "Running search integration tests..."
	cd backend && go test -v -tags=integration ./tests/integration/search/...
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Search tests complete"

test-integration-api: ## Run API integration tests only
	@echo "Starting test database..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true
	@echo "Running API integration tests..."
	cd backend && go test -v -tags=integration ./tests/integration/api/...
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ API tests complete"

test-integration-clips: ## Run clip management integration tests only
	@echo "Starting test database..."
	docker compose -f docker-compose.test.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Running database migrations..."
	migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable" up || true
	@echo "Running clip integration tests..."
	cd backend && go test -v -tags=integration ./tests/integration/clips/...
	@echo "Stopping test database..."
	docker compose -f docker-compose.test.yml down
	@echo "✓ Clip tests complete"

test-e2e: ## Run frontend E2E tests
	@echo "Running frontend E2E tests..."
	cd frontend && npm run test:e2e
	@echo "✓ E2E tests complete"

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
		k6 run backend/tests/load/scenarios/authentication.js; \
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

test-load-auth: ## Run authentication load test
	@k6 run backend/tests/load/scenarios/authentication.js

test-load-report: ## Generate comprehensive load test report
	@if command -v k6 > /dev/null; then \
		echo "Generating comprehensive load test report..."; \
		cd backend/tests/load && ./generate_report.sh; \
	else \
		echo "Error: k6 is not installed"; \
		echo "Install it with: brew install k6 (macOS) or visit https://k6.io/docs/getting-started/installation/"; \
		exit 1; \
	fi

test-load-mixed: ## Run mixed user behavior load test
	@k6 run backend/tests/load/scenarios/mixed_behavior.js

test-load-baseline-capture: ## Capture performance baselines (requires VERSION env var)
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION environment variable required in semantic versioning format"; \
		echo "Usage: make test-load-baseline-capture VERSION=vX.Y.Z"; \
		echo "Example: make test-load-baseline-capture VERSION=v1.0.0"; \
		exit 1; \
	fi
	@echo "Capturing baseline for version $(VERSION)..."; \
	cd backend/tests/load && ./scripts/capture_baseline.sh $(VERSION)

test-load-baseline-compare: ## Compare against baseline (requires VERSION env var)
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION environment variable required in semantic versioning format"; \
		echo "Usage: make test-load-baseline-compare VERSION=vX.Y.Z"; \
		echo "       make test-load-baseline-compare VERSION=current"; \
		echo "Example: make test-load-baseline-compare VERSION=v1.0.0"; \
		exit 1; \
	fi
	@echo "Comparing against baseline $(VERSION)..."; \
	cd backend/tests/load && ./scripts/compare_baseline.sh $(VERSION)

test-load-html: ## Generate HTML reports for all load tests
	@if command -v k6 > /dev/null; then \
		echo "Generating HTML reports for all load tests..."; \
		cd backend/tests/load && ./scripts/generate_html_report.sh all; \
	else \
		echo "Error: k6 is not installed"; \
		echo "Install it with: brew install k6 (macOS) or visit https://k6.io/docs/getting-started/installation/"; \
		exit 1; \
	fi

# API Endpoint Benchmarks (Top 20 Endpoints with SLO Enforcement)

test-benchmark-feed-list: ## Run feed list endpoint benchmark (p50<20ms, p95<75ms)
	@if command -v k6 > /dev/null; then \
		echo "Running feed list endpoint benchmark..."; \
		k6 run backend/tests/load/scenarios/benchmarks/feed_list.js; \
	else \
		echo "Error: k6 is not installed"; \
		exit 1; \
	fi

test-benchmark-clip-detail: ## Run clip detail endpoint benchmark (p50<15ms, p95<50ms)
	@if command -v k6 > /dev/null; then \
		echo "Running clip detail endpoint benchmark..."; \
		k6 run backend/tests/load/scenarios/benchmarks/clip_detail.js; \
	else \
		echo "Error: k6 is not installed"; \
		exit 1; \
	fi

test-benchmark-search: ## Run search endpoint benchmark (p50<30ms, p95<100ms)
	@if command -v k6 > /dev/null; then \
		echo "Running search endpoint benchmark..."; \
		k6 run backend/tests/load/scenarios/benchmarks/search.js; \
	else \
		echo "Error: k6 is not installed"; \
		exit 1; \
	fi

test-benchmarks-all: ## Run all endpoint benchmarks
	@if command -v k6 > /dev/null; then \
		echo "Running all endpoint benchmarks..."; \
		cd backend/tests/load && ./run_all_benchmarks.sh; \
	else \
		echo "Error: k6 is not installed"; \
		exit 1; \
	fi

test-benchmarks-with-profiling: ## Run benchmarks with query profiling
	@if command -v k6 > /dev/null; then \
		echo "Running benchmarks with database query profiling..."; \
		for script in backend/tests/load/scenarios/benchmarks/*.js; do \
			endpoint=$$(basename "$$script" .js); \
			echo ""; \
			echo "Profiling endpoint: $$endpoint"; \
			cd backend/tests/load && ./profile_queries.sh "$$endpoint" 60 || true; \
		done; \
		echo "✓ All benchmarks with profiling complete"; \
		echo "View reports in backend/tests/load/profiles/benchmarks/ and profiles/queries/"; \
	else \
		echo "Error: k6 is not installed"; \
		exit 1; \
	fi

test-profile-queries: ## Profile queries for a specific endpoint (usage: make test-profile-queries ENDPOINT=feed_list DURATION=60)
	@if [ -z "$(ENDPOINT)" ]; then \
		echo "Error: ENDPOINT required"; \
		echo "Usage: make test-profile-queries ENDPOINT=feed_list DURATION=60"; \
		echo "Available endpoints: feed_list, clip_detail, search, etc."; \
		exit 1; \
	fi
	@DURATION=$${DURATION:-60}; \
	echo "Profiling endpoint $(ENDPOINT) for $$DURATION seconds..."; \
	cd backend/tests/load && ./profile_queries.sh $(ENDPOINT) $$DURATION

test-stress: ## Run stress test (push system beyond capacity)
	@if command -v k6 > /dev/null; then \
		echo "Running stress test (20 min full)..."; \
		k6 run backend/tests/load/scenarios/stress.js; \
	else \
		echo "Error: k6 is not installed"; \
		echo "Install it with: brew install k6 (macOS) or visit https://k6.io/docs/getting-started/installation/"; \
		exit 1; \
	fi

test-stress-lite: ## Run stress test lite version (5 min for CI)
	@if command -v k6 > /dev/null; then \
		echo "Running stress test lite (5 min)..."; \
		k6 run -e DURATION_MULTIPLIER=0.25 backend/tests/load/scenarios/stress.js; \
	else \
		echo "Error: k6 is not installed"; \
		echo "Install it with: brew install k6 (macOS) or visit https://k6.io/docs/getting-started/installation/"; \
		exit 1; \
	fi

test-soak: ## Run 24-hour soak test
	@if command -v k6 > /dev/null; then \
		echo "Running 24-hour soak test..."; \
		echo "This will take approximately 24 hours to complete."; \
		k6 run backend/tests/load/scenarios/soak.js; \
	else \
		echo "Error: k6 is not installed"; \
		echo "Install it with: brew install k6 (macOS) or visit https://k6.io/docs/getting-started/installation/"; \
		exit 1; \
	fi

test-soak-short: ## Run 1-hour soak test (for testing)
	@if command -v k6 > /dev/null; then \
		echo "Running 1-hour soak test..."; \
		k6 run -e DURATION_HOURS=1 backend/tests/load/scenarios/soak.js; \
	else \
		echo "Error: k6 is not installed"; \
		echo "Install it with: brew install k6 (macOS) or visit https://k6.io/docs/getting-started/installation/"; \
		exit 1; \
	fi

test-security: ## Run all security tests (IDOR, authorization)
	@echo "Running IDOR security tests..."
	cd backend && go test -v ./tests/security/
	@echo "Running authorization middleware tests..."
	cd backend && go test -v ./internal/middleware/ -run "TestCanAccessResource|TestPermissionMatrix|TestUserOwnership"
	@echo "✓ All security tests passed"

test-idor: ## Run IDOR vulnerability tests only
	@echo "Running IDOR security tests..."
	cd backend && go test -v ./tests/security/ -run TestIDOR
	@echo "✓ IDOR tests complete"

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

docker-dev-up: ## Start Docker services for development (PostgreSQL + Redis)
	@echo "Starting Docker services..."
	docker compose -f docker-compose.yml up -d
	@echo "✓ Docker services started"

docker-dev-build: ## Build & start Docker services for development (PostgreSQL + Redis)
	@echo "Starting Docker build..."
	docker compose -f docker-compose.yml up -d --build --remove-orphans
	@echo "✓ Docker build complete, and services started"

docker-dev-down: ## Stop Docker services for development
	@echo "Stopping Docker services..."
	docker compose -f docker-compose.yml down
	@echo "✓ Docker services stopped"

docker-dev-logs: ## View Docker service logs for development
	@echo "Tailing Docker service logs..."
	docker compose -f docker-compose.yml logs -f --tail 500
	@echo "✓ Docker logs ended"

docker-logs-backend: ## Stream backend container logs
	docker logs -f clipper-backend

docker-logs-frontend: ## Stream frontend container logs
	docker logs -f clipper-frontend

docker-logs-postgres: ## Stream postgres container logs
	docker logs -f clipper-postgres

docker-logs-redis: ## Stream redis container logs
	docker logs -f clipper-redis

docker-logs-vault: ## Stream vault-agent container logs
	docker logs -f clipper-vault-agent

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
