# Playwright E2E Test Setup Guide

This guide covers the Playwright E2E test infrastructure for the Clipper frontend application.

## Overview

Playwright tests are separate from Vitest unit tests and provide end-to-end testing across the full application stack:

- **Unit Tests**: Vitest (1,086 tests) - Component and utility testing
- **E2E Tests**: Playwright (in `e2e/` directory) - Full application workflows

## Quick Start

### Running Playwright Tests

```bash
# Run all E2E tests
make test-frontend-e2e

# Run with UI (interactive)
make test-frontend-e2e-ui

# View test report
make test-frontend-e2e-report

# Run verbose with debugging
cd frontend && bash run-playwright-tests.sh --debug
```

### Running All Frontend Tests

```bash
# Run unit + E2E
make test-frontend-all

# Or individually
make test-frontend              # Vitest only
make test-frontend-e2e          # Playwright only
```

## Prerequisites

### 1. Install Playwright Browsers

```bash
cd frontend
npx playwright install
```

This installs Chromium, Firefox, and WebKit browsers required for E2E testing.

### 2. Backend API Running

Playwright tests require the backend API to be available at `http://localhost:8080`:

```bash
# Start the full development environment
make docker-dev-build
make docker-dev

# Or start just the backend
cd backend && go run cmd/api/main.go
```

### 3. Frontend Dev Server (Optional)

Some tests may require the frontend running at `http://localhost:3000`:

```bash
cd frontend
npm run dev
```

Note: Most tests should use the baseURL from `playwright.config.ts`.

## Configuration

### playwright.config.ts

Located in [frontend/playwright.config.ts](playwright.config.ts), this file controls:

- **baseURL**: `http://localhost:3000` - Frontend base URL
- **use.baseURL**: API endpoint configuration
- **webServer**: Auto-start/stop commands
- **testDir**: Location of test files (`e2e/`)
- **testMatch**: Pattern for test files (`*.spec.ts`)
- **timeout**: Individual test timeout (30s)
- **globalTimeout**: Total timeout (30m)

Key settings:

```typescript
use: {
  baseURL: 'http://localhost:3000',
  trace: 'on-first-retry',           // Trace failures
  screenshot: 'only-on-failure',     // Screenshot failures
  video: 'retain-on-failure',        // Video of failures
}
```

### Test File Organization

```
frontend/
├── e2e/                           # E2E test directory
│   ├── auth.spec.ts              # Authentication flows
│   ├── feed.spec.ts              # Feed browsing
│   ├── clips.spec.ts             # Clip management
│   └── search.spec.ts            # Search functionality
├── playwright.config.ts          # Playwright configuration
└── test-results/                 # Test output directory
```

## Running Tests

### Basic Commands

| Command | Purpose |
|---------|---------|
| `npm run test:e2e` | Run all E2E tests |
| `npm run test:e2e:ui` | Interactive UI mode |
| `make test-frontend-e2e` | Makefile wrapper with checks |
| `make test-frontend-e2e-report` | View last test report |

### Verbose Test Runner

The [run-playwright-tests.sh](run-playwright-tests.sh) script provides enhanced output:

```bash
cd frontend
bash run-playwright-tests.sh [OPTIONS]
```

**Options:**

- `--headed` - Show browser window during tests
- `--debug` - Open debugging UI
- `--browsers <list>` - Specify browsers (chromium, firefox, webkit)
- `--no-report` - Skip report generation
- `--stop-on-failure` - Stop at first failure
- `--quiet` - Minimal output

**Examples:**

```bash
# Run with browser visible
bash run-playwright-tests.sh --headed

# Debug a specific test
bash run-playwright-tests.sh --debug --browsers chromium

# Quick run without report
bash run-playwright-tests.sh --quiet --no-report
```

## Test Reports

### Viewing Results

```bash
# View HTML report
npx playwright show-report

# Or open directly
open playwright-report/index.html
```

The report includes:
- Test status and duration
- Screenshots of failures
- Video recordings of failures
- Error traces with browser logs
- Test timing breakdown

### Report Location

- **Report HTML**: `playwright-report/index.html`
- **Test Results**: `test-results/` (raw data)

## Debugging

### Interactive Debugging

```bash
# Open Playwright Inspector with UI
npm run test:e2e:ui

# Or with specific test
npx playwright test --debug e2e/auth.spec.ts
```

### Headed Mode

Run tests with visible browser window:

```bash
bash run-playwright-tests.sh --headed
```

### Trace Viewer

Playwright automatically captures traces on first failure. View them:

```bash
npx playwright show-trace test-results/trace.zip
```

### Debugging Tips

1. **Add debug breaks**: Use `await page.pause()` in test code
2. **Check configuration**: Verify `baseURL` and test environment variables
3. **View browser logs**: Check report for console messages
4. **Screenshot on failure**: Enabled in config
5. **Use headed mode**: See what the browser is doing

## Integration with CI/CD

For continuous integration, tests run without headed mode:

```bash
# CI command
npm run test:e2e

# Or with Makefile
make test-frontend-e2e
```

Environment variables available in CI:

- `CI=true` - Signals running in CI environment
- `BASE_URL` - Override default base URL
- `API_URL` - Override API endpoint

## Troubleshooting

### Browser crashes or hangs

```bash
# Reinstall browsers
npx playwright install

# Clear cache
rm -rf ~/.cache/ms-playwright
```

### Tests timeout

Check that:
1. Frontend is running (or webServer in config will start it)
2. Backend API is accessible at `http://localhost:8080`
3. Database is seeded with test data
4. Network connectivity is stable

### Cannot find elements

1. Enable headed mode: `bash run-playwright-tests.sh --headed`
2. Use debug mode to inspect: `bash run-playwright-tests.sh --debug`
3. Check if page selectors match actual HTML
4. Verify baseURL in playwright.config.ts

### API connection failures

If tests can't reach backend:

```bash
# Check backend is running
curl http://localhost:8080/health

# Start backend
make docker-dev

# Or run directly
cd backend && go run cmd/api/main.go
```

## Best Practices

### Writing Tests

```typescript
import { test, expect } from '@playwright/test';

test('should load home page', async ({ page }) => {
  // Use baseURL from config
  await page.goto('/');
  
  // Wait for content
  await expect(page.locator('h1')).toContainText('Welcome');
});

test('should authenticate user', async ({ page }) => {
  await page.goto('/login');
  
  // Fill form
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Check navigation
  await expect(page).toHaveURL('/feed');
});
```

### Test Organization

- One feature/workflow per test file
- Clear test names describing the scenario
- Use meaningful selectors (avoid fragile XPath)
- Clean up test data between runs
- Use fixtures for common setup

### Performance

- Use `test.only()` for single test during development
- Parallelize tests with `--workers` option
- Cache static assets in test config
- Use `storageState` for auth persistence

## Makefile Commands Summary

```bash
make test-frontend              # Unit tests
make test-frontend-ui           # Unit tests with UI
make test-frontend-headed       # Unit tests with browser visible
make test-frontend-coverage     # Unit tests with coverage

make test-frontend-e2e          # Playwright E2E tests
make test-frontend-e2e-ui       # Playwright with UI
make test-frontend-e2e-report   # View test report

make test-frontend-all          # All tests (unit + E2E)
make test-frontend-help         # Show test options
```

## See Also

- [Playwright Documentation](https://playwright.dev)
- [Vitest Unit Tests](../docs/frontend/UNIT_TEST_SETUP.md)
- [Backend Test Setup](../backend/TEST_SETUP_GUIDE.md)
- [playwright.config.ts](playwright.config.ts) - Configuration details

---

**Last Updated**: December 2024
**Test Suite**: Playwright 1.56.1
**Node**: v18+ required
