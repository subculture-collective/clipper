# Load Tests CI Workflow

This GitHub Actions workflow provides automated load testing for the Clipper platform using K6.

## Features

- **Nightly Runs**: Automatically executes at 2 AM UTC every day
- **Manual Trigger**: Can be triggered on-demand via GitHub Actions UI
- **Multiple Test Types**: Run all tests or specific scenarios
- **Comprehensive Reports**: Generates detailed markdown reports with metrics
- **Artifact Storage**: Stores reports and JSON metrics for 90 days
- **Full Environment**: Sets up PostgreSQL, Redis, backend, and test data

## Running Load Tests

### Automatic (Nightly)

Load tests run automatically every night at 2 AM UTC. No action required.

### Manual Trigger

To run load tests manually:

1. Go to the **Actions** tab in GitHub
2. Select **Load Tests** workflow from the left sidebar
3. Click **Run workflow** button (top right)
4. Choose the test type:
   - `all` - Run all test scenarios (default)
   - `feed` - Feed browsing tests only
   - `clip` - Clip detail view tests only
   - `search` - Search functionality tests only
   - `comments` - Comments tests only
   - `auth` - Authentication tests only
   - `submit` - Clip submission tests only
   - `mixed` - Mixed behavior tests only (recommended for quick checks)
5. Click **Run workflow** to start

## Viewing Results

### GitHub Actions Summary

Each workflow run provides a summary directly in the GitHub Actions UI:

1. Navigate to the workflow run
2. View the **Summary** section
3. See key metrics and test status

### Downloading Reports

Reports and metrics are stored as artifacts:

1. Go to the workflow run page
2. Scroll to **Artifacts** section at the bottom
3. Download:
   - **load-test-reports-{run_number}** - Markdown reports and detailed text outputs
   - **load-test-metrics-{run_number}** - JSON metrics for analysis

Artifacts are retained for **90 days**.

### Grafana Dashboard

For real-time monitoring and historical trends:

- **URL**: `https://clpr.tv/grafana` (production)
- **Dashboard**: Search for "K6 Load Test Trends" or use UID `k6-load-test-trends`
- **Documentation**: See `monitoring/dashboards/LOAD_TEST_DASHBOARD.md`

## Test Scenarios

### All Scenarios (`all`)

Runs the comprehensive test suite including:
- Feed browsing (various sort options)
- Clip detail views
- Search functionality
- Comments (read operations)
- Authentication flows
- Clip submissions
- Mixed user behavior

Duration: ~25-30 minutes

### Individual Scenarios

| Scenario | Duration | Description |
|----------|----------|-------------|
| `feed` | ~4 min | Feed browsing with hot/new/top sorting |
| `clip` | ~4 min | Clip detail views, related clips, comments |
| `search` | ~4 min | Search queries with filters |
| `comments` | ~4 min | Comment listing and interactions |
| `auth` | ~5 min | Authentication workflows |
| `submit` | ~4 min | Clip submission flows |
| `mixed` | ~17 min | Realistic mixed user behavior (recommended) |

## Performance Targets

The workflow validates against these targets:

| Metric | Target | Threshold |
|--------|--------|-----------|
| p95 Response Time | < 100ms | Critical if > 200ms |
| p99 Response Time | < 200ms | Warning if > 150ms |
| Error Rate | < 1% | Critical if > 5% |
| Check Success Rate | > 98% | Warning if < 95% |

## Workflow Configuration

### Services

- **PostgreSQL**: pgvector/pgvector:pg17
- **Redis**: redis:7-alpine

### Environment Setup

1. Installs Go 1.22.x
2. Installs K6 load testing tool
3. Installs golang-migrate
4. Runs database migrations
5. Seeds test data (60+ clips, multiple users, etc.)
6. Builds and starts backend API

### Test Execution

Tests run against `http://localhost:8080` with full database and cache.

## Troubleshooting

### Workflow Fails at Setup

**Symptoms**: Workflow fails during service startup or migration
**Solution**: 
- Check if database migrations are up to date
- Verify seed data script exists: `backend/migrations/seed_load_test.sql`

### Tests Fail with Connection Errors

**Symptoms**: K6 reports connection refused or timeout errors
**Solution**:
- Check backend startup logs in workflow run
- Verify health check is passing before tests run
- May need to increase wait time in workflow

### High Error Rates

**Symptoms**: Tests complete but show >5% error rate
**Solution**:
- Review application logs for errors
- Check if recent code changes affected performance
- Verify database indexes are in place

### Artifacts Not Uploaded

**Symptoms**: No artifacts available after workflow completes
**Solution**:
- Check if reports directory was created
- Verify K6 generated output files
- Look for errors in "Upload artifacts" step

## Maintenance

### Updating Test Scenarios

1. Modify K6 scripts in `backend/tests/load/scenarios/`
2. Test locally: `make test-load-{scenario}`
3. Commit changes - workflow will use updated scripts

### Adjusting Performance Targets

1. Update thresholds in K6 test files
2. Update documentation in `backend/tests/load/README.md`
3. Update dashboard alert rules if needed

### Changing Schedule

To change the nightly run time, edit `.github/workflows/load-tests.yml`:

```yaml
schedule:
  - cron: '0 2 * * *'  # Runs at 2 AM UTC
```

Use [crontab.guru](https://crontab.guru/) to generate cron expressions.

## Related Documentation

- [Load Test README](../../backend/tests/load/README.md) - Detailed K6 documentation
- [Load Test Dashboard](../../monitoring/dashboards/LOAD_TEST_DASHBOARD.md) - Grafana dashboard guide
- [Performance Summary](../../backend/tests/load/PERFORMANCE_SUMMARY.md) - Performance targets and analysis

## Contributing

When adding new load test scenarios:

1. Create K6 script in `backend/tests/load/scenarios/`
2. Add Makefile target for convenience
3. Update this documentation
4. Consider adding to `all` test suite if applicable
5. Test manually before committing

## Security Notes

- Load tests use isolated test database (`clipper_load_test`)
- JWT secret is test-only value, not production secret
- Database credentials are masked in logs
- Artifacts may contain performance metrics but no sensitive data
