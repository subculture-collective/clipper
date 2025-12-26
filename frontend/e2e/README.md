# Playwright E2E Testing Framework

Comprehensive end-to-end testing framework for the Clipper application using Playwright and TypeScript.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Directory Structure](#directory-structure)
- [Page Object Model](#page-object-model)
- [Fixtures](#fixtures)
- [Utilities](#utilities)
- [Writing Tests](#writing-tests)
- [Test Suites](#test-suites)
- [Best Practices](#best-practices)
- [Debugging](#debugging)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

This E2E testing framework provides:

- **Page Object Model (POM)** pattern for maintainable tests
- **Custom fixtures** for test data and authentication
- **Helper utilities** for auth, database seeding, and API mocking
- **TypeScript** support with strict type checking
- **Multi-browser** testing (Chromium, Firefox, WebKit)
- **CI/CD integration** with GitHub Actions
- **Automatic artifacts** (screenshots, videos, traces) on failure

### Tech Stack

- **Playwright** v1.56+ - E2E testing framework
- **TypeScript** - Type-safe test development
- **Node.js** 20+ - Runtime environment

## Setup

### Prerequisites

- Node.js 20 or higher
- npm 9 or higher

### Installation

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install --with-deps
   ```
   
   Or for CI/CD (Chromium only):
   ```bash
   npx playwright install --with-deps chromium
   ```

3. **Verify installation:**
   ```bash
   npm run test:e2e -- --list
   ```

### Environment Configuration

Configure the base URL via environment variables:

```bash
# Local development (default)
export PLAYWRIGHT_BASE_URL=http://localhost:5173

# Staging
export PLAYWRIGHT_BASE_URL=https://staging.clipper.example.com

# Production (use with caution!)
export PLAYWRIGHT_BASE_URL=https://clipper.example.com
```

## Running Tests

### Basic Commands

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/framework-demo.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run tests matching a pattern
npx playwright test --grep "should display clips"

# Run tests in debug mode
npx playwright test --debug
```

### Watch Mode

```bash
# Run tests in watch mode (re-run on file changes)
npx playwright test --ui
```

### Parallel Execution

```bash
# Run with 4 workers (parallel execution)
npx playwright test --workers=4

# Run serially (one test at a time)
npx playwright test --workers=1
```

## Directory Structure

```
frontend/e2e/
├── fixtures/           # Test fixtures and data
│   └── index.ts       # Custom test fixtures
├── pages/             # Page Object Models
│   ├── BasePage.ts    # Base class for all pages
│   ├── LoginPage.ts   # Login page object
│   ├── HomePage.ts    # Home page object
│   ├── ClipPage.ts    # Clip detail page object
│   └── index.ts       # Page objects export
├── tests/             # Test files
│   ├── framework-demo.spec.ts
│   ├── clips.spec.ts
│   ├── integration.spec.ts
│   └── ...
├── utils/             # Helper utilities
│   ├── auth.ts        # Authentication helpers
│   ├── db-seed.ts     # Database seeding
│   ├── api-mock.ts    # API mocking utilities
│   └── index.ts       # Utilities export
├── tsconfig.json      # TypeScript configuration
└── README.md          # This file
```

## Page Object Model

### Overview

The Page Object Model (POM) pattern encapsulates page structure and behavior into reusable objects, making tests more maintainable and readable.

### BasePage Class

All page objects extend `BasePage`, which provides common functionality:

```typescript
import { BasePage } from './BasePage';
import { Page, Locator } from '@playwright/test';

export class MyPage extends BasePage {
  private readonly myButton: Locator;

  constructor(page: Page) {
    super(page, '/my-path');
    this.myButton = page.getByTestId('my-button');
  }

  async clickMyButton(): Promise<void> {
    await this.click(this.myButton);
  }
}
```

### BasePage Methods

Key methods available in `BasePage`:

| Method | Description |
|--------|-------------|
| `goto()` | Navigate to the page |
| `waitForPageLoad()` | Wait for page to fully load |
| `waitForElement(selector)` | Wait for specific element |
| `getByTestId(testId)` | Get element by data-testid |
| `getByRole(role, options)` | Get element by ARIA role |
| `getByText(text)` | Get element by text content |
| `click(selector)` | Click an element |
| `fillInput(selector, value)` | Fill an input field |
| `verifyElementVisible(selector)` | Assert element is visible |
| `verifyUrl(pattern)` | Assert URL matches pattern |
| `takeScreenshot(name)` | Capture screenshot |

### Creating Page Objects

1. **Create a new page object file:**
   ```bash
   touch frontend/e2e/pages/MyNewPage.ts
   ```

2. **Implement the page object:**
   ```typescript
   import { Page, Locator } from '@playwright/test';
   import { BasePage } from './BasePage';

   export class MyNewPage extends BasePage {
     // Define locators
     private readonly heading: Locator;
     private readonly submitBtn: Locator;

     constructor(page: Page) {
       super(page, '/my-new-page');
       
       // Initialize locators
       this.heading = page.locator('h1');
       this.submitBtn = page.getByRole('button', { name: 'Submit' });
     }

     // Define page actions
     async submit(): Promise<void> {
       await this.click(this.submitBtn);
       await this.waitForNavigation();
     }

     // Define page verifications
     async verifyHeading(text: string): Promise<void> {
       await this.verifyElementText(this.heading, text);
     }
   }
   ```

3. **Export from pages/index.ts:**
   ```typescript
   export { MyNewPage } from './MyNewPage';
   ```

### Using Page Objects in Tests

```typescript
import { test, expect } from '../fixtures';
import { MyNewPage } from '../pages';

test('should interact with my page', async ({ page }) => {
  const myPage = new MyNewPage(page);
  
  await myPage.goto();
  await myPage.verifyHeading('Welcome');
  await myPage.submit();
});
```

## Fixtures

Fixtures provide reusable test context and automatic setup/teardown.

### Available Fixtures

| Fixture | Description |
|---------|-------------|
| `loginPage` | LoginPage instance |
| `homePage` | HomePage instance |
| `clipPage` | ClipPage instance |
| `authenticatedPage` | Page with authenticated user |
| `authenticatedUser` | Authenticated user data |
| `testUser` | Test user (auto-cleanup) |
| `testClip` | Test clip (auto-cleanup) |

### Using Fixtures

```typescript
import { test, expect } from '../fixtures';

test('use fixtures', async ({ homePage, testClip }) => {
  // homePage and testClip are automatically provided
  await homePage.goto();
  // testClip will be cleaned up automatically
});
```

### Creating Custom Fixtures

Edit `fixtures/index.ts`:

```typescript
export const test = base.extend<CustomFixtures>({
  myCustomFixture: async ({ page }, use) => {
    // Setup
    const data = await setupMyData(page);
    
    // Use in test
    await use(data);
    
    // Teardown
    await cleanupMyData(data);
  },
});
```

## Utilities

### Authentication Helpers

```typescript
import { login, logout, isAuthenticated, getAuthToken } from '../utils/auth';

// Login
await login(page, { username: 'test', password: 'pass' });

// Check authentication
const isAuth = await isAuthenticated(page);

// Logout
await logout(page);

// Get auth token
const token = await getAuthToken(page);
```

### Database Seeding

```typescript
import { createUser, createClip, deleteUser } from '../utils/db-seed';

// Create test data
const user = await createUser(page, { username: 'testuser' });
const clip = await createClip(page, { title: 'Test Clip' });

// Cleanup
await deleteUser(page, user.id);
```

### Social Features Helpers

```typescript
import { 
  createComment, 
  voteOnClip, 
  followUser, 
  createPlaylist,
  blockUser,
  triggerRateLimit,
  createWatchParty,
  joinWatchParty,
} from '../utils/social-features';

// Comments
const comment = await createComment(page, { 
  clipId: 'clip-id', 
  content: 'Great clip!' 
});
await voteOnComment(page, comment.id, 1); // upvote

// Voting
await voteOnClip(page, 'clip-id', 1); // upvote
await voteOnClip(page, 'clip-id', -1); // downvote
await removeClipVote(page, 'clip-id');

// Following
await followUser(page, 'user-id');
await unfollowUser(page, 'user-id');
const isFollowing = await getFollowingStatus(page, 'user-id');

// Playlists
const playlist = await createPlaylist(page, {
  title: 'My Playlist',
  visibility: 'public'
});
await addClipsToPlaylist(page, playlist.id, ['clip-1', 'clip-2']);
const shareLink = await getPlaylistShareLink(page, playlist.id);
await updatePlaylistVisibility(page, playlist.id, 'private');

// Watch Parties (Theatre Queue)
const watchParty = await createWatchParty(page, {
  title: 'Movie Night',
  playlistId: playlist.id,
  visibility: 'public',
  maxParticipants: 10,
});
await joinWatchParty(page, watchParty.invite_code);
const participants = await getWatchPartyParticipants(page, watchParty.id);
await leaveWatchParty(page, watchParty.id);

// Blocking
await blockUser(page, 'user-id', 'spam');
await unblockUser(page, 'user-id');
const isBlocked = await isUserBlocked(page, 'user-id');

// Rate Limiting
const result = await triggerRateLimit(page, 'comment', 'clip-id', 20);
if (result.triggered) {
  await waitForRateLimitClear(page);
}
```

### API Mocking

```typescript
import { mockClipsEndpoint, mockAuthEndpoint } from '../utils/api-mock';

// Mock clips API
await mockClipsEndpoint(page, {
  clips: [/* mock data */],
});

// Mock authentication
await mockAuthEndpoint(page, {
  authenticated: true,
  user: { /* mock user */ },
});
```

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '../fixtures';

test.describe('Feature Name', () => {
  // Setup hooks
  test.beforeEach(async ({ page }) => {
    // Runs before each test
  });

  test.afterEach(async ({ page }) => {
    // Runs after each test
  });

  test('should do something', async ({ homePage }) => {
    // Arrange
    await homePage.goto();
    
    // Act
    await homePage.search('test');
    
    // Assert
    await expect(page).toHaveURL(/search/);
  });

  test('should do something else', async ({ page }) => {
    // Test implementation
  });
});
```

### Assertions

```typescript
// Element assertions
await expect(page.locator('h1')).toBeVisible();
await expect(page.locator('h1')).toHaveText('Title');
await expect(page.locator('button')).toBeEnabled();

// Page assertions
await expect(page).toHaveURL(/expected-path/);
await expect(page).toHaveTitle('Expected Title');

// Custom assertions with page objects
await homePage.verifyElementVisible('[data-testid="clip-card"]');
await homePage.verifyUrl(/\//);
```

### Waiting Strategies

```typescript
// Wait for navigation
await page.waitForLoadState('networkidle');

// Wait for element
await page.waitForSelector('[data-testid="clip-card"]');

// Wait with timeout
await page.locator('button').waitFor({ timeout: 5000 });

// Wait for API call
await page.waitForResponse(resp => resp.url().includes('/api/clips'));
```

## Test Suites

### Social Features Tests (`social-features.spec.ts`)

Comprehensive E2E tests for all social features with ≥95% target pass rate:

**Comments CRUD:**
- Create, edit, delete comments
- Reply to comments (nested threads)
- Retrieve comments with sorting
- Moderation states and content hiding

**Voting System:**
- Upvote/downvote clips and comments
- Vote persistence across sessions
- Vote changes (upvote → downvote)
- Duplicate vote prevention (anti-abuse)
- Immediate UI reflection

**Following System:**
- Follow/unfollow users
- Check following status
- Feed updates from followed users
- Notification triggers

**Playlists:**
- Create, update, delete playlists
- Add/remove clips from playlists
- Share link generation
- Visibility controls (private/public/unlisted)
- Permission enforcement

**User Blocking:**
- Block/unblock users
- Content hiding for blocked users
- Interaction prevention
- Blocked users list management

**Rate Limiting:**
- Trigger rate limits safely
- Error message verification
- Retry-after handling
- Exponential backoff
- Countdown timer display

**Cross-User Scenarios:**
- Multiple users on same content
- Blocked user visibility
- Follower notifications

**Performance Tests:**
- Comment pagination
- Vote handling under load
- Concurrent access stability

Run the full suite:
```bash
npm run test:e2e -- tests/social-features.spec.ts
```

Run specific test group:
```bash
npm run test:e2e -- tests/social-features.spec.ts --grep "Comments - CRUD"
npm run test:e2e -- tests/social-features.spec.ts --grep "Voting"
npm run test:e2e -- tests/social-features.spec.ts --grep "Playlists"
```

### Search & Discovery Tests (`search-discovery.spec.ts`)

Comprehensive E2E tests for search functionality with ≥95% target pass rate and performance SLAs:

**Text Search & Relevance:**
- Query handling and result display
- Special character and case handling
- Result count validation
- Query persistence

**Filters:**
- Language, game, date range, tags filters
- Multiple filter combinations
- Filter persistence through navigation
- Clear filters functionality

**Autocomplete/Suggestions:**
- Suggestion display and quality
- Keyboard navigation
- Selection and search
- Latency validation (< 300ms p95)

**Search History:**
- localStorage persistence
- History display and selection
- History clearing
- Recent items limit (10)

**Pagination:**
- Multi-page navigation
- State preservation
- Filter/query persistence

**Performance:**
- Search latency measurement
- p50/p95/p99 metrics calculation
- SLA validation (p95 < 500ms)
- Regression detection

**Empty States:**
- No results handling
- Error messaging
- Recovery actions

**Accessibility:**
- Keyboard navigation
- Screen reader support
- ARIA attributes

Run the full suite:
```bash
npm run test:e2e -- tests/search-discovery.spec.ts
```

Run specific test group:
```bash
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Performance"
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Filters"
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Suggestions"
```

**Documentation:** See [SEARCH_DISCOVERY_TESTS.md](./SEARCH_DISCOVERY_TESTS.md) for detailed information.

### Playlist Sharing & Theatre Queue Tests (`playlist-sharing-theatre-queue.spec.ts`)

Comprehensive E2E tests for playlist sharing and theatre queue (watch party) features with ≥95% target pass rate:

**Playlist Sharing:**
- Share link generation for public/unlisted/private playlists
- Access control and permission enforcement
- Visibility changes and access revocation
- Error handling for invalid/unauthorized requests

**Theatre Queue (Watch Party):**
- Creation with/without playlists
- Invite-based joining with codes
- Participant management (list, leave, kick)
- Host permissions and settings
- Multi-user synchronization scenarios

**Integration:**
- Creating watch parties from shared playlists
- Invite link sharing flows
- Playlist visibility affecting watch party access

Run the full suite:
```bash
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts
```

Run specific test group:
```bash
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts --grep "Playlist Sharing"
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts --grep "Theatre Queue"
npm run test:e2e -- tests/playlist-sharing-theatre-queue.spec.ts --grep "Integration"
```

**Documentation:** See [PLAYLIST_SHARING_THEATRE_QUEUE_TESTS.md](./tests/PLAYLIST_SHARING_THEATRE_QUEUE_TESTS.md) for detailed information.

### Other Test Suites

- `framework-demo.spec.ts` - Framework validation and examples
- `clips.spec.ts` - Clip feed and detail pages
- `auth-*.spec.ts` - Authentication flows (OAuth, MFA, sessions)
- `premium-*.spec.ts` - Subscription and payment features
- `chat.spec.ts` - Chat functionality
- `channel-management.spec.ts` - Channel operations

## Best Practices

### 1. Use Page Objects

✅ **Good:**
```typescript
const homePage = new HomePage(page);
await homePage.search('test');
```

❌ **Bad:**
```typescript
await page.locator('input[type="search"]').fill('test');
await page.keyboard.press('Enter');
```

### 2. Use Test IDs

✅ **Good:**
```typescript
await page.getByTestId('submit-button').click();
```

❌ **Bad:**
```typescript
await page.locator('div > button.btn-primary:nth-child(2)').click();
```

### 3. Use Fixtures for Setup

✅ **Good:**
```typescript
test('test', async ({ testClip }) => {
  // Clip already created
});
```

❌ **Bad:**
```typescript
test('test', async ({ page }) => {
  const clip = await createClip(page);
  // ... test ...
  await deleteClip(page, clip.id); // Easy to forget!
});
```

### 4. Keep Tests Independent

Each test should:
- Set up its own data
- Clean up after itself
- Not depend on other tests

### 5. Use Meaningful Test Names

✅ **Good:**
```typescript
test('should display error message when submitting invalid clip URL', ...)
```

❌ **Bad:**
```typescript
test('test 1', ...)
```

### 6. Mock External Dependencies

Use API mocking for:
- Third-party services
- Slow endpoints
- Unreliable services
- Testing error scenarios

### 7. Use Auto-Waiting

Playwright auto-waits for elements. Avoid explicit waits:

✅ **Good:**
```typescript
await page.click('button');
```

❌ **Bad:**
```typescript
await page.waitForTimeout(5000);
await page.click('button');
```

## Debugging

### Debug Mode

```bash
# Run with Playwright Inspector
npx playwright test --debug

# Debug specific test
npx playwright test tests/my-test.spec.ts --debug

# Debug from specific line
npx playwright test --debug --grep "test name"
```

### Browser Tools

```bash
# Run in headed mode to see browser
npx playwright test --headed

# Slow down execution
npx playwright test --headed --slow-mo=1000
```

### Console Logs

Add console logs in tests:

```typescript
console.log('Current URL:', page.url());
console.log('Clip count:', await homePage.getClipCount());
```

### Screenshots

```typescript
// Manual screenshot
await page.screenshot({ path: 'debug.png' });

// Screenshot on failure (automatic via config)
// Check playwright-report/ or test-results/
```

### Traces

View traces for failed tests:

```bash
# After test run
npx playwright show-trace test-results/.../trace.zip
```

### VSCode Debugging

1. Install "Playwright Test for VSCode" extension
2. Set breakpoints in tests
3. Click "Debug Test" in editor

## CI/CD Integration

### GitHub Actions

The framework integrates with GitHub Actions via `.github/workflows/ci.yml`.

**Configuration:**
- Runs on: push to `main`/`develop`
- Uses: Ubuntu latest
- Browsers: Chromium only (for speed)
- Artifacts: Reports, screenshots, videos (7-day retention)

**Viewing Results:**
1. Go to Actions tab in GitHub
2. Select workflow run
3. Download artifacts:
   - `playwright-report` - HTML report
   - Test results include screenshots/videos

### Running Locally Like CI

```bash
# Set CI environment variable
export CI=true

# Run tests
npm run test:e2e
```

This enables:
- 2 retries (vs 0 locally)
- 4 parallel workers
- Stricter mode (fails on test.only)

## Troubleshooting

### Common Issues

**Issue: "Playwright not found"**
```bash
# Solution: Install Playwright
npm install
npx playwright install --with-deps
```

**Issue: "Browser not found"**
```bash
# Solution: Install browsers
npx playwright install chromium firefox webkit
```

**Issue: "Timeout waiting for element"**
```typescript
// Solution: Increase timeout
await page.locator('button').waitFor({ timeout: 10000 });

// Or in config
timeout: 60 * 1000,
```

**Issue: "Tests flaky in CI"**
- Add explicit waits for network: `waitForLoadState('networkidle')`
- Use `toPass()` for eventually-true assertions
- Mock unstable APIs
- Increase retries in CI

**Issue: "Authentication not working"**
- Check if OAuth endpoints are mocked
- Verify auth tokens are set correctly
- Use stored authentication state
- Check cookies/localStorage

### Getting Help

1. Check [Playwright Documentation](https://playwright.dev)
2. Review test examples in `tests/framework-demo.spec.ts`
3. Enable debug mode: `npx playwright test --debug`
4. Check CI logs in GitHub Actions
5. Open an issue in the repository

## Advanced Topics

### Storage State

Save authenticated state for reuse:

```typescript
// Login once and save state
await page.goto('/');
await login(page);
await page.context().storageState({ path: 'auth.json' });

// Reuse in tests
test.use({ storageState: 'auth.json' });
```

### Custom Matchers

Create custom assertions:

```typescript
expect.extend({
  async toHaveClipCount(page: Page, expected: number) {
    const count = await page.getByTestId('clip-card').count();
    return {
      pass: count === expected,
      message: () => `Expected ${expected} clips, got ${count}`,
    };
  },
});
```

### Parallel Test Execution

```typescript
// Mark tests as serial (run one at a time)
test.describe.serial('Serial tests', () => {
  test('test 1', ...);
  test('test 2', ...);
});

// Mark tests as parallel (default)
test.describe.parallel('Parallel tests', () => {
  test('test 1', ...);
  test('test 2', ...);
});
```

### Test Retries

```typescript
// Retry specific test
test('flaky test', async ({ page }) => {
  test.info().retry(3);
  // ...
});
```

## Contributing

When adding new tests:

1. Use existing page objects or create new ones
2. Add fixtures if needed
3. Follow naming conventions
4. Add comments explaining complex logic
5. Ensure tests are independent
6. Test locally before committing
7. Check CI passes

## License

This testing framework is part of the Clipper project.

---

**Need Help?** Check the [Playwright Documentation](https://playwright.dev) or open an issue.
