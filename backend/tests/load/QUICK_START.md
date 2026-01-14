# k6 Load Testing Framework - Quick Start Guide

This guide provides a quick overview of the k6 load testing framework enhancements for the Clipper project.

## Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [HTML Report Generation](#html-report-generation)
4. [Baseline Management](#baseline-management)
5. [Regression Detection](#regression-detection)
6. [CI/CD Integration](#cicd-integration)
7. [Best Practices](#best-practices)

## Features

### 🎯 Core Testing Capabilities
- **Load Tests**: Standard performance testing with realistic user loads
- **Stress Tests**: Push system beyond capacity to find breaking points
- **Soak Tests**: Extended duration (24h) testing for memory leaks and stability

### 📊 New Enhancements
- **HTML Reports**: Beautiful, standalone HTML reports with visualizations
- **Baseline Storage**: Version-based baseline storage (`baselines/v1.0.0/`)
- **Regression Detection**: Automatic detection of performance degradations
- **CI Integration**: Full GitHub Actions integration with artifact storage

## Quick Start

### Prerequisites

```bash
# Install k6
brew install k6  # macOS
# or follow: https://k6.io/docs/getting-started/installation/

# Optional: Install dependencies for baseline comparison
brew install jq bc  # macOS
```

### Run Your First Load Test

```bash
# 1. Start the backend
make backend-dev

# 2. Run a simple load test
make test-load-feed

# 3. Run all load tests
make test-load

# 4. Run with HTML report generation
make test-load-html
```

## HTML Report Generation

### Using the HTML Reporter Module

Add HTML report generation to any scenario:

```javascript
// Import the HTML reporter
import { simpleHtmlReport } from '../config/html-reporter.js';

// Add handleSummary function
export function handleSummary(data) {
    return simpleHtmlReport(data, 'MyScenario');
}
```

### Generate HTML Reports

```bash
# Generate HTML reports for all scenarios
make test-load-html

# Generate for a specific scenario
./backend/tests/load/scripts/generate_html_report.sh feed_browsing

# View reports in browser
open backend/tests/load/reports/*.html
```

### HTML Report Features

- **Key Metrics Dashboard**: p50/p95/p99 latency, error rates, throughput
- **Visual Cards**: Color-coded metrics with pass/fail indicators
- **Detailed Tables**: Complete breakdown of all performance metrics
- **Standalone**: No external dependencies, works offline
- **Shareable**: Single HTML file, easy to share with team

## Baseline Management

### Capture a Baseline

After achieving stable performance, capture a baseline:

```bash
# Capture baseline for version v1.0.0
make test-load-baseline-capture VERSION=v1.0.0

# Or use the script directly
./backend/tests/load/scripts/capture_baseline.sh v1.0.0
```

This will:
1. Run all load test scenarios
2. Extract key metrics (p50, p95, p99, error rates, throughput)
3. Store in `baselines/v1.0.0/`
4. Include git commit and environment metadata
5. Create/update `current` symlink

### Baseline File Structure

```
baselines/
├── v1.0.0/
│   ├── feed_browsing.json
│   ├── clip_detail.json
│   ├── search.json
│   ├── comments.json
│   ├── authentication.json
│   ├── submit.json
│   └── mixed_behavior.json
├── v1.1.0/
│   └── ...
└── current -> v1.0.0
```

### Baseline Content

Each baseline file contains:
- Version and timestamp
- Git commit hash
- Key metrics (p50, p95, p99, error rates, throughput)
- Threshold pass/fail status
- Environment information (OS, k6 version, CPU, memory)

## Regression Detection

### Compare Against Baseline

```bash
# Compare against specific version
make test-load-baseline-compare VERSION=v1.0.0

# Compare against latest baseline
make test-load-baseline-compare VERSION=current
```

### Regression Thresholds

Regressions are detected when:

| Metric | Threshold | Impact |
|--------|-----------|--------|
| p95 Latency | >10% increase | ⚠️ Regression |
| p99 Latency | >15% increase | ⚠️ Regression |
| Error Rate | >50% increase | ⚠️ Regression |
| Throughput | >10% decrease | ⚠️ Regression |
| Check Failures | >50% increase | ⚠️ Regression |

### Comparison Report

The comparison generates a detailed markdown report:

```
backend/tests/load/reports/comparison_v1.0.0_TIMESTAMP.md
```

Report includes:
- Executive summary with regression count
- Per-scenario comparison tables
- Percentage changes for all metrics
- Pass/fail status for each metric
- Recommended actions if regressions found

### Exit Codes

- `0`: No regressions detected ✅
- `1`: Regressions detected ⚠️

## CI/CD Integration

### GitHub Actions Workflow

Load tests run automatically:
- **Nightly**: Every night at 2 AM UTC
- **Manual**: Trigger via GitHub Actions UI
- **On Demand**: Via workflow_dispatch event

### Test Types Available

- `all` - All standard load tests
- `feed` - Feed browsing test
- `clip` - Clip detail test
- `search` - Search functionality test
- `comments` - Comments test
- `auth` - Authentication test
- `submit` - Submission test
- `mixed` - Mixed behavior test (recommended)
- `stress-lite` - Stress test (5 min, CI-friendly)
- `soak-short` - Soak test (1 hour version)

### Artifacts Generated

| Artifact | Retention | Contents |
|----------|-----------|----------|
| `load-test-reports-*` | 90 days | Markdown, HTML reports, text outputs |
| `load-test-metrics-*` | 90 days | JSON metrics for analysis |
| `load-test-baselines-*` | 365 days | Baseline files per version |

### Accessing Results

**GitHub Actions:**
1. Navigate to Actions tab
2. Select "Load Tests" workflow
3. Click on a run
4. Scroll to "Artifacts" section
5. Download desired artifacts

**Grafana Dashboard:**
- URL: `https://clpr.tv/grafana`
- Dashboard: "K6 Load Test Trends"
- Real-time metrics and trends

## Best Practices

### When to Capture Baselines

✅ **Do capture when:**
- Releasing a new major/minor version
- After performance improvements
- After infrastructure upgrades
- When test scenarios change significantly

❌ **Don't capture when:**
- Tests fail or are unstable
- Temporary environment issues
- Bug fixes (should maintain performance)
- During active development

### Baseline Management

1. **Run multiple times**: Average 3-5 runs before setting baseline
2. **Stable environment**: Ensure no other processes affecting performance
3. **Document changes**: Note any infrastructure or code changes
4. **Peer review**: Have baselines reviewed before committing
5. **Version tagging**: Use semantic versioning for baseline directories
6. **Keep history**: Maintain at least last 3 major version baselines

### Regression Detection

1. **Review all regressions**: Don't ignore warnings
2. **Profile affected endpoints**: Use profiling tools to identify causes
3. **Compare code changes**: Review commits since baseline
4. **Update if intentional**: If changes are acceptable, update baseline
5. **Fail fast in CI**: Let CI catch regressions early

### HTML Reports

1. **Share with team**: HTML reports are standalone and shareable
2. **Archive important runs**: Save reports for major releases
3. **Compare visually**: Use HTML reports for before/after comparisons
4. **Include in documentation**: Link reports in release notes

## Troubleshooting

### Backend Not Running

```bash
# Error: Backend is not responding
# Solution: Start the backend
make backend-dev
```

### k6 Not Installed

```bash
# Error: k6 is not installed
# Solution: Install k6
brew install k6  # macOS
# or follow: https://k6.io/docs/getting-started/installation/
```

### Missing Dependencies

```bash
# Error: jq is not installed
# Solution: Install jq and bc
brew install jq bc  # macOS
apt-get install jq bc  # Linux
```

### Database Seed Data Missing

```bash
# Error: Tests fail with 404s
# Solution: Seed the database
make migrate-seed-load-test
```

### Baseline Not Found

```bash
# Error: Baseline not found
# Solution: List available baselines
ls -la backend/tests/load/baselines/

# Or create new baseline
make test-load-baseline-capture VERSION=v1.0.0
```

## Additional Resources

- [Main README](README.md) - Comprehensive documentation
- [Baseline Storage Guide](baselines/README.md) - Detailed baseline management
- [Stress & Soak Guide](STRESS_SOAK_GUIDE.md) - Advanced testing
- [Execution Guide](EXECUTION_GUIDE.md) - Step-by-step instructions
- [Performance Summary](PERFORMANCE_SUMMARY.md) - Target SLOs

## Support

For questions or issues:
1. Check the documentation in `backend/tests/load/`
2. Review existing load test results in GitHub Actions
3. Consult the team's performance engineering guidelines
4. Open an issue with the `performance` label

## Quick Reference Commands

```bash
# Basic testing
make test-load                    # Run all load tests
make test-load-feed              # Run feed test
make test-load-mixed             # Run mixed behavior (recommended)

# HTML reports
make test-load-html              # Generate HTML reports

# Baseline management
make test-load-baseline-capture VERSION=v1.0.0   # Capture baseline
make test-load-baseline-compare VERSION=v1.0.0   # Compare to baseline

# Advanced testing
make test-stress                 # Run stress test (20 min)
make test-stress-lite            # Run stress test (5 min)
make test-soak                   # Run soak test (24 hours)
```
