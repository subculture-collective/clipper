import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * This configuration sets up comprehensive E2E testing with:
 * - Configurable base URL for local/staging/production environments
 * - Proper timeouts for global (30s) and expect (5s) operations
 * - Retry logic (2 on CI, 0 locally)
 * - Parallel workers (4 on CI)
 * - Screenshot, video, and trace capture on failures
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/tests',

  /* Maximum time one test can run for */
  timeout: 30 * 1000,

  /* Maximum time expect() should wait for the condition to be met */
  expect: {
    timeout: 5 * 1000,
  },

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only - 2 retries as per requirements */
  retries: process.env.CI ? 2 : 0,

  /* Parallel workers - 4 on CI as per requirements, auto-detect locally */
  workers: process.env.CI ? 4 : undefined,

  /* Reporter to use - HTML format with CI-friendly list reporter */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL - configurable via environment variable for local/staging/production */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.VITE_APP_URL || 'http://localhost:5173',

    /* Collect trace on first retry as per requirements */
    trace: 'on-first-retry',

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /* Capture video on failure */
    video: 'retain-on-failure',

    /* Maximum time for each action */
    actionTimeout: 10 * 1000,

    /* Maximum time for navigation */
    navigationTimeout: 30 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Optionally test against mobile viewports - enable as needed */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'VITE_AUTO_CONSENT=true VITE_ENABLE_ANALYTICS=false VITE_API_URL=http://localhost:8080/api/v1 npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 120 seconds for CI environments
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
