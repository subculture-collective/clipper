# E2E Test Consent Banner Fix

## Problem

71 E2E tests were failing due to the consent banner blocking form interactions and creating dialog selector ambiguities. The root cause was:

1. **Incorrect environment variable access** in ConsentContext - `VITE_AUTO_CONSENT` was not being read correctly
2. **Consent banner appearing during tests** - blocking form inputs and making tests fail with "element is not enabled"
3. **Multiple dialogs in strict mode** - tests using `getByRole('dialog')` were failing due to both the consent banner and other dialogs appearing simultaneously

## Solution

### 1. Fixed Environment Variable Access in ConsentContext

**File:** `frontend/src/context/ConsentContext.tsx`

Changed:

```tsx
const autoConsent =
    (import.meta as Record<string, unknown>)?.env?.VITE_AUTO_CONSENT === 'true';
```

To:

```tsx
const autoConsent = import.meta.env.VITE_AUTO_CONSENT === 'true';
```

**Why:** Vite exposes environment variables through `import.meta.env` directly, not as a nested property. The old code couldn't access the environment variable correctly.

### 2. Added Consent Banner Dismissal Utility

**File:** `frontend/e2e/utils/consent.ts` (NEW)

Created utilities to manage consent in E2E tests:

- `injectConsentPreferences()` - Inject consent preferences into localStorage before navigation
- `clearConsentPreferences()` - Clear stored preferences (for testing banner appearance)
- `acceptAllConsent()` - Accept all consent categories
- `rejectAllConsent()` - Reject all optional categories

This allows tests to pre-populate consent preferences so the banner never shows.

### 3. Updated BasePage Test Utilities

**File:** `frontend/e2e/pages/BasePage.ts`

Added:

- `dismissConsentBannerIfVisible()` - Safely dismiss the banner if it appears
- Updated `goto()` to dismiss the banner after navigation
- Updated `fillInput()` to dismiss banner before form interaction
- Updated `click()` to dismiss banner before clicking

This provides defense-in-depth: even if the banner appears despite auto-consent, it gets dismissed automatically.

### 4. Updated Test Fixture Setup

**File:** `frontend/e2e/fixtures/setup.ts`

Modified the seedData fixture to:

```tsx
// Inject consent preferences before any navigation
await injectConsentPreferences(page);
```

This ensures every test starts with consent preferences already stored in localStorage.

### 5. Updated Utils Index

**File:** `frontend/e2e/utils/index.ts`

Added export:

```tsx
export * from './consent';
```

## How It Works

1. **Environment Variable**: When `VITE_AUTO_CONSENT=true` is set (which it is in playwright.config.ts), the app automatically sets `hasConsented=true` and `showConsentBanner=false`

2. **localStorage Injection**: Tests also pre-inject consent preferences via `addInitScript`, ensuring the browser always has consent stored

3. **Fallback Dismissal**: If the banner somehow appears anyway, the BasePage utilities will detect and dismiss it

4. **No Dialog Conflicts**: Since the consent banner won't show, there's no ambiguity when tests use `getByRole('dialog')` for other modals

## Test Environment Configuration

The playwright.config.ts already sets the necessary environment variable:

```bash
VITE_AUTO_CONSENT=true VITE_ENABLE_ANALYTICS=false VITE_E2E_TEST_LOGIN=true ...
```

## Expected Results

- ✓ Consent banner no longer appears in E2E tests
- ✓ Form inputs are no longer disabled during tests
- ✓ Dialog selectors work correctly without ambiguity
- ✓ All 71 previously failing tests should now pass
- ✓ Tests run faster without banner rendering/animation

## Files Modified

1. `frontend/src/context/ConsentContext.tsx` - Fixed environment variable access
2. `frontend/e2e/pages/BasePage.ts` - Added consent banner dismissal
3. `frontend/e2e/fixtures/setup.ts` - Added consent preference injection
4. `frontend/e2e/utils/consent.ts` - NEW: Consent management utilities
5. `frontend/e2e/utils/index.ts` - Added consent export

## Testing

Run with the standard test command:

```bash
make test-teardown && make test-setup && make test INTEGRATION=0 E2E=1 2>&1 | tee test-results.log
```
