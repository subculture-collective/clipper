#!/bin/sh
# Pre-commit hook for running tests and linting

echo "Running pre-commit checks..."

# Check if we're in the backend directory or root
if [ -f "go.mod" ]; then
  echo "Running backend checks..."
  
  # Format Go code
  echo "  - Formatting Go code..."
  gofmt -w .
  
  # Run Go tests (fast only)
  echo "  - Running Go tests..."
  go test -short ./... || exit 1
fi

# Check if we're in the frontend directory or root
if [ -f "package.json" ]; then
  echo "Running frontend checks..."
  
  # Run ESLint
  echo "  - Running ESLint..."
  npm run lint || exit 1
  
  # Run frontend tests (if they exist)
  if grep -q '"test"' package.json; then
    echo "  - Running frontend tests..."
    npm test -- --run || exit 1
  fi
fi

echo "✓ Pre-commit checks passed"
exit 0
