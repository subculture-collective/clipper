.PHONY: help install dev build test clean docker-up docker-down backend-dev frontend-dev

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
	@echo "✓ All dependencies installed"

dev: ## Start all services in development mode
	@echo "Starting development environment..."
	@make -j3 docker-up backend-dev frontend-dev

build: ## Build both frontend and backend
	@echo "Building backend..."
	cd backend && go build -o bin/api ./cmd/api
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "✓ Build complete"

test: ## Run all tests
	@echo "Running backend tests..."
	cd backend && go test ./...
	@echo "Running frontend tests..."
	cd frontend && npm test
	@echo "✓ Tests complete"

clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	rm -rf backend/bin
	rm -rf frontend/dist
	@echo "✓ Cleanup complete"

docker-up: ## Start Docker services (PostgreSQL + Redis)
	@echo "Starting Docker services..."
	docker compose up -d
	@echo "✓ Docker services started"

docker-down: ## Stop Docker services
	@echo "Stopping Docker services..."
	docker compose down
	@echo "✓ Docker services stopped"

backend-dev: ## Run backend in development mode
	@echo "Starting backend..."
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

lint: ## Run linters
	@echo "Linting backend..."
	cd backend && go fmt ./...
	@echo "Linting frontend..."
	cd frontend && npm run lint
	@echo "✓ Linting complete"
