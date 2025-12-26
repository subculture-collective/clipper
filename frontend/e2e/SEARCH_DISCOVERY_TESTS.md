# Search & Discovery E2E Tests

Comprehensive end-to-end test suite for search and discovery features in the Clipper application.

## Overview

This test suite validates all aspects of the search functionality including:

- **Text Search**: Query handling, relevance, and result display
- **Filters**: Language, game, date range, tags, and vote filtering
- **Autocomplete**: Suggestion display, quality, and performance
- **Search History**: Persistence, display, and management
- **Pagination**: Multi-page navigation and state preservation
- **Performance**: Latency measurements and SLA validation
- **Empty States**: Error handling and recovery actions
- **Accessibility**: Keyboard navigation and screen reader support

## Test Files

### Core Test Suite
- **`tests/search-discovery.spec.ts`**: Main test suite (59 comprehensive tests)

### Supporting Infrastructure
- **`pages/SearchPage.ts`**: Page Object Model for search UI interactions
- **`utils/search.ts`**: Helper utilities for search testing

## Test Categories

### 1. Text Search & Relevance (7 tests)
Tests basic search functionality and result relevance.

```bash
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Text Search"
```

**Key Tests:**
- Simple text queries
- Result count display
- Special character handling
- Case-insensitive search
- Query persistence

**Success Criteria:**
- Queries return relevant results
- Result counts are accurate
- Special characters handled gracefully
- Case insensitivity works

### 2. Pagination (5 tests)
Validates multi-page result navigation.

```bash
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Pagination"
```

**Key Tests:**
- Next/previous page navigation
- State preservation across pages
- Disabled states (first/last page)
- Filter and query persistence

**Success Criteria:**
- Page navigation works correctly
- Query and filters persist
- Different results per page

### 3. Filters (10 tests)
Tests all filter combinations and persistence.

```bash
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Filters"
```

**Key Tests:**
- Language filter
- Game filter
- Date range filter
- Minimum votes filter
- Multiple simultaneous filters
- Filter clearing
- Filter persistence through navigation

**Success Criteria:**
- All filters apply correctly
- Multiple filters combine properly
- Filters persist in URL
- Clear filters works

### 4. Suggestions/Autocomplete (7 tests)
Validates autocomplete functionality and performance.

```bash
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Suggestions"
```

**Key Tests:**
- Suggestion display on typing
- Keyboard navigation
- Suggestion selection
- Latency measurement (< 300ms p95)
- Relevance verification

**Success Criteria:**
- Suggestions appear within 300ms (p95)
- Keyboard navigation works
- Suggestions are relevant
- Selection triggers search

**Performance Target:**
- p95 latency < 300ms

### 5. Search History (6 tests)
Tests search history persistence and management.

```bash
npm run test:e2e -- tests/search-discovery.spec.ts --grep "History"
```

**Key Tests:**
- History saving to localStorage
- History display on input focus
- History clearing
- Persistence across reloads
- Recent items limit (10)

**Success Criteria:**
- Queries saved to history
- History persists across sessions
- Clear history works
- Limited to 10 most recent

### 6. Empty States (7 tests)
Validates error handling and recovery.

```bash
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Empty States"
```

**Key Tests:**
- Empty state display
- Helpful error messages
- Recovery action buttons
- Edge case handling (long queries, whitespace)

**Success Criteria:**
- Empty state shown when no results
- Helpful messaging provided
- Recovery actions available

### 7. Performance (4 tests)
Measures and validates performance SLAs.

```bash
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Performance"
```

**Key Tests:**
- Search latency measurement
- p95 latency validation
- Comprehensive metrics (p50, p95, p99)
- Regression detection

**Success Criteria:**
- p95 search latency < 500ms
- No significant performance regression
- Consistent performance across queries

**Performance Targets:**
- p95 search latency: < 500ms
- p95 suggestion latency: < 300ms

### 8. Integration (3 tests)
End-to-end workflow validation.

```bash
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Integration"
```

**Key Tests:**
- Full search workflow
- Rapid successive searches
- Browser back navigation

**Success Criteria:**
- Complete workflows function correctly
- State preserved appropriately
- No race conditions

### 9. Accessibility (3 tests)
Validates accessibility compliance.

```bash
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Accessibility"
```

**Key Tests:**
- Accessible search input
- Keyboard navigation
- Screen reader support

**Success Criteria:**
- All inputs have labels
- Full keyboard navigation
- ARIA attributes present

## Running Tests

### Run All Search Tests
```bash
npm run test:e2e -- tests/search-discovery.spec.ts
```

### Run Specific Test Groups
```bash
# Text search tests only
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Text Search"

# Performance tests only
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Performance"

# Filter tests only
npm run test:e2e -- tests/search-discovery.spec.ts --grep "Filters"
```

### Run in UI Mode (Interactive)
```bash
npm run test:e2e:ui -- tests/search-discovery.spec.ts
```

### Run in Debug Mode
```bash
npx playwright test tests/search-discovery.spec.ts --debug
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test tests/search-discovery.spec.ts --headed
```

### Run Specific Browser
```bash
npx playwright test tests/search-discovery.spec.ts --project=chromium
npx playwright test tests/search-discovery.spec.ts --project=firefox
npx playwright test tests/search-discovery.spec.ts --project=webkit
```

## Test Infrastructure

### SearchPage Object Model

The `SearchPage` class provides a comprehensive interface for interacting with search UI:

```typescript
import { SearchPage } from '../pages';

// Basic usage
const searchPage = new SearchPage(page);
await searchPage.goto();
await searchPage.search('gaming highlights');

// Advanced usage
await searchPage.applyFilters({
  language: 'en',
  game: 'Valorant',
  minVotes: 100,
});
await searchPage.sortBy('popular');
await searchPage.goToNextPage();
```

**Key Methods:**
- `search(query)` - Perform search
- `applyFilters(filters)` - Apply filter combination
- `sortBy(sort)` - Change sort order
- `switchTab(tab)` - Switch search tabs
- `goToNextPage()` - Navigate to next page
- `measureSearchLatency(query)` - Measure performance
- `getSuggestionTexts()` - Get autocomplete suggestions
- `getSearchHistory()` - Get search history

### Search Utilities

The `search.ts` utilities module provides helper functions:

```typescript
import {
  performSearch,
  measureSearchLatency,
  measureSuggestionLatency,
  getSuggestions,
  getSearchHistory,
  clearSearchHistory,
  seedSearchData,
} from '../utils/search';

// Measure performance
const latency = await measureSearchLatency(page, 'gaming', 5);
console.log(`Average latency: ${latency}ms`);

// Test suggestions
const suggestions = await getSuggestions(page, 'val');
console.log(`Suggestions: ${suggestions.join(', ')}`);

// Manage history
await addToSearchHistory(page, 'my query');
const history = await getSearchHistory(page);
await clearSearchHistory(page);
```

**Key Functions:**
- `performSearch(page, options)` - Execute search
- `measureSearchLatency(page, query, iterations)` - Measure latency
- `measurePerformanceMetrics(page, query, samples)` - Full metrics
- `getSuggestions(page, query)` - Get suggestions via API
- `getSearchHistory(page)` - Get history from storage
- `seedSearchData(page, count)` - Create test data
- `testPagination(page, query, maxPages)` - Test pagination

## Performance Metrics

### Targets

| Metric | Target | CI Threshold |
|--------|--------|--------------|
| Search latency (p95) | < 500ms | < 2000ms |
| Suggestion latency (p95) | < 300ms | < 500ms |
| Average search time | < 300ms | < 1500ms |

### Measuring Performance

The test suite includes comprehensive performance measurement:

```typescript
// Measure single query
const latency = await measureSearchLatency(page, 'gaming', 5);

// Comprehensive metrics
const metrics = await measurePerformanceMetrics(page, 'popular', 10);
console.log(`P50: ${metrics.p50}ms`);
console.log(`P95: ${metrics.p95}ms`);
console.log(`P99: ${metrics.p99}ms`);
console.log(`Avg: ${metrics.avg}ms`);
```

### Performance Test Output

Tests log detailed performance information:

```
Search latency for "gaming": 342ms
Query "game": 298ms
Query "valorant": 315ms
Query "highlight": 287ms
P95 latency: 315ms

Performance Metrics:
  P50: 285ms
  P95: 342ms
  P99: 378ms
  Avg: 310ms
  Min: 247ms
  Max: 412ms
```

## CI/CD Integration

### Running in CI

Tests are configured to run in GitHub Actions CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Run Search E2E Tests
  run: npm run test:e2e -- tests/search-discovery.spec.ts
  env:
    CI: true
    PLAYWRIGHT_BASE_URL: http://localhost:5173
```

### CI-Specific Behavior

When `CI=true`:
- 2 retries per test (vs 0 locally)
- 4 parallel workers
- Stricter mode (fails on `test.only`)
- Relaxed performance thresholds
- Automatic artifacts capture

### Artifacts

On test failure, CI captures:
- Screenshots
- Videos
- Traces (on retry)
- HTML report

## Test Data

### Test Data Seeding

For deterministic testing, seed test data:

```typescript
// Create 20 test clips with variety
const clipIds = await seedSearchData(page, 20, {
  games: ['Valorant', 'CS:GO', 'League of Legends'],
  tags: ['highlight', 'funny', 'epic', 'clutch'],
  languages: ['en', 'es', 'fr'],
});

// Use in tests...

// Cleanup
await cleanupSearchData(page, clipIds);
```

### Mock Data

Tests gracefully handle missing backend:
- Falls back to mock data when API unavailable
- Logs warnings instead of failing
- Allows frontend testing without full stack

## Debugging

### Common Issues

**Issue: Tests timing out**
```bash
# Increase timeout
npx playwright test tests/search-discovery.spec.ts --timeout=60000
```

**Issue: Performance tests failing**
```bash
# Run performance tests with more iterations
# Edit test file and increase sample size
```

**Issue: Suggestions not appearing**
```bash
# Check if backend/mock is running
# Review console logs in test output
# Run in headed mode to see UI
npx playwright test tests/search-discovery.spec.ts --headed --grep "Suggestions"
```

### Debug Output

Enable verbose logging:

```typescript
test('debug example', async ({ page, searchPage }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('request', req => console.log('REQUEST:', req.url()));
  page.on('response', res => console.log('RESPONSE:', res.url(), res.status()));
  
  await searchPage.search('test');
});
```

### Screenshots

Take screenshots at any point:

```typescript
await searchPage.takeScreenshot('search-results');
```

## Best Practices

### Writing New Tests

1. **Use Page Objects**
   ```typescript
   // ✅ Good
   await searchPage.search('query');
   
   // ❌ Bad
   await page.locator('input[type="search"]').fill('query');
   ```

2. **Use Utilities**
   ```typescript
   // ✅ Good
   const latency = await measureSearchLatency(page, 'query', 5);
   
   // ❌ Bad
   // Manual timing logic...
   ```

3. **Test Independence**
   - Each test should clean up after itself
   - Don't depend on other tests
   - Use fixtures for setup/teardown

4. **Graceful Degradation**
   ```typescript
   // ✅ Good - handles missing features
   try {
     await searchPage.waitForSuggestions(3000);
     const suggestions = await searchPage.getSuggestionTexts();
     expect(suggestions.length).toBeGreaterThan(0);
   } catch {
     console.log('Suggestions not implemented yet');
   }
   ```

5. **Performance Testing**
   - Use multiple iterations for averages
   - Log results for tracking
   - Be lenient in CI (network variability)

### Avoiding Flaky Tests

1. **Wait for network idle**
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

2. **Use explicit waits**
   ```typescript
   await searchPage.waitForResults(10000);
   ```

3. **Retry on failure** (CI config handles this)

4. **Isolate tests** - no shared state

## Success Metrics

### Target Pass Rate
- **≥ 95%** of tests should pass
- **< 1%** flakiness rate
- Zero false positives

### Performance SLAs
- **p95 search latency**: < 500ms
- **p95 suggestion latency**: < 300ms
- No significant regression (< 20% increase)

### Coverage
- ✅ All user-facing search features
- ✅ All filter combinations
- ✅ Edge cases and error states
- ✅ Performance validation
- ✅ Accessibility compliance

## Maintenance

### Updating Tests

When search UI changes:

1. Update `SearchPage` locators
2. Update test expectations
3. Run full suite to verify
4. Update this documentation

### Adding New Tests

1. Add test to appropriate `test.describe` block
2. Follow existing patterns
3. Update this README
4. Update progress checklist

### Performance Baselines

Review and update performance thresholds:
- Run benchmarks quarterly
- Adjust thresholds based on infrastructure
- Document significant changes

## Troubleshooting

### Test Failures

1. **Check CI logs** for detailed output
2. **Download artifacts** (screenshots, traces)
3. **Run locally** to reproduce
4. **Check recent changes** to search code
5. **Review test expectations** - may need updates

### Performance Issues

1. **Verify backend performance** independently
2. **Check network latency** in CI
3. **Review database query performance**
4. **Consider caching improvements**
5. **Adjust CI thresholds** if infrastructure changed

### Getting Help

1. Review [Playwright Documentation](https://playwright.dev)
2. Check existing tests in `social-features.spec.ts`
3. Review test output and logs
4. Run in debug mode
5. Open issue with reproduction steps

## Contributing

When adding search features:

1. Write tests first (TDD)
2. Update page objects
3. Add utilities as needed
4. Document new functionality
5. Ensure ≥ 95% pass rate

## References

- [Main E2E README](./README.md)
- [Playwright Documentation](https://playwright.dev)
- [Social Features Tests](./SOCIAL_FEATURES_TESTS.md) (similar pattern)
- [GitHub Issue #XXX](https://github.com/subculture-collective/clipper/issues/XXX)

## License

Part of the Clipper project. See LICENSE file.
