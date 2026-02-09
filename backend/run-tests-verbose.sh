#!/bin/bash
set -e

# Load test environment if it exists
if [ -f .env.test ]; then
    set -a
    source .env.test
    set +a
fi

# Default to unit tests only
TEST_TAGS=""
TEST_PATHS="./..."

# Check for integration tests flag
if [ "$INTEGRATION" = "1" ]; then
    echo "Running unit + integration tests..."
    TEST_TAGS="-tags=integration"
    # Run all tests including integration
    TEST_PATHS="./..."
elif [ "$E2E" = "1" ]; then
    echo "Running unit + integration + E2E tests..."
    TEST_TAGS="-tags=integration,e2e"
    TEST_PATHS="./..."
else
    echo "Running unit tests only..."
    # Exclude integration and e2e tests
    TEST_PATHS=$(go list ./... | grep -v '/tests/integration' | grep -v '/tests/e2e')
fi

# Run tests with verbose output
echo "Test command: go test -v -race -parallel=4 $TEST_TAGS $TEST_PATHS"
go test -v -race -parallel=4 $TEST_TAGS $TEST_PATHS
