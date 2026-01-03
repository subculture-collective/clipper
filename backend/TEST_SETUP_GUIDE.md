# Backend Test Setup Guide

This guide explains how to run backend tests with all necessary configurations to avoid skipped tests.

## Quick Start

Run all tests (unit, integration, and E2E) with automatic environment setup:

```bash
cd backend
INTEGRATION=1 E2E=1 ./run-tests-verbose.sh
```

The script will automatically:
1. Generate necessary encryption keys and secrets
2. Configure test database and Redis
3. Run all test packages in order
4. Stop on the first failure with detailed output
5. Save output to `test-output.log`

## Manual Setup

If you want to setup the environment separately:

```bash
# 1. Setup test environment
./setup-test-env.sh

# 2. Load environment variables
set -a
source .env.test
set +a

# 3. Run tests
INTEGRATION=1 E2E=1 ./run-tests-verbose.sh
```

## What Gets Configured

The `setup-test-env.sh` script generates and configures:

### Required for MFA Tests
- `MFA_ENCRYPTION_KEY` - 32-byte AES-256 encryption key for TOTP secrets
- Enables MFA enrollment, verification, backup codes, and disable tests

### Required for Stripe Webhook Tests
- `TEST_STRIPE_WEBHOOK_SECRET` - Webhook signature secret
- `STRIPE_WEBHOOK_SECRET` - Main Stripe webhook secret
- Enables webhook signature validation tests

### Required for Search Tests
- `OPENSEARCH_URL` - OpenSearch endpoint (default: http://localhost:9200)
- Enables semantic search and hybrid search tests

### Database & Redis
- `TEST_DATABASE_HOST`, `TEST_DATABASE_PORT`, `TEST_DATABASE_USER`, etc.
- `TEST_REDIS_HOST`, `TEST_REDIS_PORT`

### Authentication
- `JWT_SECRET` - JWT signing key
- `JWT_REFRESH_SECRET` - Refresh token signing key
- `SESSION_SECRET` - Session encryption key

All generated values are saved to `.env.test` for reuse across test runs.

## Test Categories

### Unit Tests
Run automatically with any test command. No special setup required.

```bash
./run-tests-verbose.sh
```

### Integration Tests
Require test database (PostgreSQL, Redis, OpenSearch). Use `make test-setup` to start containers.

```bash
INTEGRATION=1 ./run-tests-verbose.sh
```

### E2E Tests
Full end-to-end tests requiring all services and test data seeding.

```bash
E2E=1 ./run-tests-verbose.sh
```

### All Tests
```bash
INTEGRATION=1 E2E=1 ./run-tests-verbose.sh
```

## Skipped Tests

Some tests are still skipped because they're placeholders without implementation:

### MFA Tests (`auth_integration_test.go`)
- `MFA_EnrollmentFlow_Structure` - Placeholder only
- `MFA_VerificationFlow_Structure` - Placeholder only
- `MFA_BackupCodes_Structure` - Placeholder only
- `MFA_DisableFlow_Structure` - Placeholder only

**Status**: Placeholders for future implementation. Contains comments outlining test structure but no actual test code.

### Account Deletion Tests (`user_data_integration_test.go`)
- `AccountDeletion_PreventsDuplicateRequests` - Needs account deletion table
- Data export tests - Need export service implementation
- `PersonalData_Retention` - Needs retention policy implementation

**Status**: Requires service implementation, not just configuration.

### Premium/Stripe Tests (`premium_integration_test.go`)
- `WebhookEndpoint_ValidSignature` - Needs actual Stripe signature generation

**Status**: Partially testable. Most webhook tests run but use invalid signatures (expected to fail). Full testing requires Stripe SDK integration for signature generation.

### Search Tests (`search_integration_test.go`)
- `TestSemanticSearch` - Needs vector embeddings and OpenSearch kNN

**Status**: Requires OpenSearch with vector support plugin configured. Can be enabled if OpenSearch cluster has kNN plugin.

### Engagement Tests (`engagement_integration_test.go`)
- Some comment tests - Conditional skips based on runtime state
- Follow/Vote tests - Need full service setup

**Status**: Partially testable. Some tests run conditionally based on whether previous steps succeeded.

## Disabling Auto-Setup

If you want to use existing environment variables without regenerating:

```bash
SETUP_ENV=0 INTEGRATION=1 E2E=1 ./run-tests-verbose.sh
```

## Environment Variables

All test configuration can be overridden via environment variables:

```bash
# Use specific database
TEST_DATABASE_HOST=my-test-db.local \
TEST_DATABASE_PORT=5432 \
INTEGRATION=1 ./run-tests-verbose.sh

# Use existing MFA key
MFA_ENCRYPTION_KEY="your-base64-key" \
INTEGRATION=1 ./run-tests-verbose.sh
```

## Troubleshooting

### "MFA enrollment requires MFAService configuration"
- Ensure `MFA_ENCRYPTION_KEY` is set (32 bytes, base64 encoded)
- Run `./setup-test-env.sh` to generate automatically

### "OpenSearch connection refused"
- Start OpenSearch: `make test-setup`
- Verify OpenSearch is running: `curl http://localhost:9200`

### "Webhook signature verification failed"
- This is expected for most webhook tests
- Full webhook signature testing requires Stripe SDK integration

### Tests Pass But Some Show as Skipped
- Some skips are intentional (placeholder tests)
- Some skips are conditional (depend on previous test success)
- Check the skip message to determine if it's a configuration issue or expected

## Test Output

The script provides:
- **Color-coded output**: Green (pass), Red (fail), Yellow (info)
- **Progress tracking**: `[3/36] Testing package: ./internal/handlers`
- **Verbose test output**: See individual test cases as they run
- **Summary on failure**: Shows how many packages passed before failure
- **Complete log file**: All output saved to `test-output.log`

## Example Output

```
Setting up test environment...
✓ Generated MFA_ENCRYPTION_KEY
✓ Generated TEST_STRIPE_WEBHOOK_SECRET
✓ Set OPENSEARCH_URL=http://localhost:9200
✓ Test database configured
✓ Created .env.test file

Finding test packages...
INTEGRATION=1, E2E=1

Running 36 test packages...

[1/36] Testing package: ./internal/handlers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
=== RUN   TestAuthHandler
=== RUN   TestAuthHandler/Login_Success
--- PASS: TestAuthHandler (0.05s)
✓ PASSED
...
```

## Integration with Make

The Makefile already includes test setup:

```bash
# Run with make
make test INTEGRATION=1 E2E=1

# Or use verbose script
cd backend && INTEGRATION=1 E2E=1 ./run-tests-verbose.sh
```

## CI/CD Integration

For CI pipelines, ensure these are set:

```yaml
env:
  MFA_ENCRYPTION_KEY: ${{ secrets.MFA_ENCRYPTION_KEY }}
  STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
  TEST_DATABASE_HOST: localhost
  TEST_DATABASE_PORT: 5437
```

Then run:
```bash
./backend/setup-test-env.sh
INTEGRATION=1 E2E=1 ./backend/run-tests-verbose.sh
```
