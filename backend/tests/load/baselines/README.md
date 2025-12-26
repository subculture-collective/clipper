# Load Test Baselines

This directory stores baseline performance metrics for k6 load tests, organized by version and endpoint.

## Directory Structure

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
└── current/          # Symlink or copy of latest baseline
    └── ...
```

## Baseline Format

Each baseline file is a JSON document containing:

```json
{
  "version": "v1.0.0",
  "scenario": "feed_browsing",
  "timestamp": "2024-12-26T16:30:00Z",
  "git_commit": "abc123def456",
  "metrics": {
    "http_req_duration": {
      "p50": 25.5,
      "p95": 45.2,
      "p99": 89.5,
      "avg": 30.1,
      "min": 10.2,
      "max": 150.3
    },
    "http_req_failed": {
      "rate": 0.001,
      "count": 5,
      "total": 5000
    },
    "http_reqs": {
      "rate": 33.5,
      "count": 5000
    },
    "checks": {
      "rate": 0.995,
      "passes": 4975,
      "fails": 25
    },
    "iterations": {
      "rate": 11.5,
      "count": 1800
    },
    "vus": {
      "max": 100
    }
  },
  "thresholds": {
    "http_req_duration_p95": {
      "target": 100,
      "actual": 45.2,
      "passed": true
    },
    "http_req_failed_rate": {
      "target": 0.05,
      "actual": 0.001,
      "passed": true
    }
  },
  "environment": {
    "os": "linux",
    "k6_version": "0.49.0",
    "go_version": "1.22.x",
    "cpu_cores": 4,
    "memory_gb": 16
  }
}
```

## Usage

### Setting a Baseline

After validating a stable release, capture baseline metrics:

```bash
# Run the baseline capture script
./backend/tests/load/scripts/capture_baseline.sh v1.0.0

# This will:
# 1. Run all load test scenarios
# 2. Extract key metrics from results
# 3. Store in baselines/v1.0.0/
# 4. Update current/ symlink
```

### Comparing Against Baseline

To detect performance regressions:

```bash
# Compare current run against baseline
./backend/tests/load/scripts/compare_baseline.sh v1.0.0

# Or compare against current baseline
./backend/tests/load/scripts/compare_baseline.sh current
```

The comparison script will:
- Run all scenarios
- Compare results against baseline
- Report regressions (>10% degradation)
- Report improvements (>10% enhancement)
- Generate a comparison report

### Regression Detection Thresholds

Regressions are detected when:
- **p95 latency** increases by >10%
- **p99 latency** increases by >15%
- **Error rate** increases by >50%
- **Throughput** decreases by >10%
- **Check failure rate** increases by >50%

## CI Integration

The CI workflow automatically:
1. Downloads the baseline for the target version
2. Runs load tests
3. Compares results against baseline
4. Fails the build if regressions detected
5. Stores new results as artifacts for potential baseline updates

## Baseline Management

### When to Update Baselines

Update baselines when:
- A new major/minor version is released
- Significant performance improvements are merged
- Infrastructure changes occur (e.g., database upgrade)
- Test scenarios are substantially modified

### Do NOT Update Baselines When

Avoid updating baselines for:
- Failed optimization attempts
- Temporary fluctuations in test environment
- Bug fixes that should maintain performance
- Minor patches

## Best Practices

1. **Version Tagging**: Always tag baselines with semantic version numbers
2. **Git Commits**: Include the git commit hash in baseline metadata
3. **Environment Info**: Capture test environment details for reproducibility
4. **Multiple Runs**: Average 3-5 runs before setting a baseline
5. **Documentation**: Document any environmental changes in version notes
6. **Review**: Have performance baselines peer-reviewed before committing
7. **Archival**: Keep at least the last 3 major version baselines

## Troubleshooting

### Baseline Not Found

If a baseline doesn't exist:
```bash
# List available baselines
ls -la backend/tests/load/baselines/

# Create a new baseline for current version
./backend/tests/load/scripts/capture_baseline.sh v1.x.x
```

### Inconsistent Results

If results vary significantly between runs:
1. Ensure test environment is stable (no other processes)
2. Warm up the system with a preliminary run
3. Check database state (consistent seed data)
4. Run multiple times and average results

### False Positives

If regression detection reports false positives:
1. Adjust threshold percentages in comparison script
2. Consider environment differences
3. Review if baseline needs updating
4. Check for test data variations
