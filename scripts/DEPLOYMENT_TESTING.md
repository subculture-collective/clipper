# Deployment Testing Scripts

This directory contains automated testing scripts for validating deployment and rollback procedures.

## Scripts

### test-deployment-harness.sh

Comprehensive testing harness for deployment scripts. Tests deploy, rollback, and blue-green deployment scripts in safe DRY_RUN and MOCK modes.

**Usage:**

```bash
# Run all tests in MOCK mode (default)
./test-deployment-harness.sh

# Run with verbose logging
VERBOSE=true ./test-deployment-harness.sh

# Custom results directory
TEST_RESULTS_DIR=/tmp/my-tests ./test-deployment-harness.sh
```

**Environment Variables:**

- `DRY_RUN` (default: `true`) - Enable dry-run mode
- `MOCK` (default: `true`) - Use mock Docker/curl commands
- `VERBOSE` (default: `false`) - Enable detailed logging
- `TEST_RESULTS_DIR` (default: `/tmp/deployment-harness-results`) - Output directory

**What it tests:**

1. Validation checks (Docker, docker-compose, directories)
2. Backup mechanisms before deployment
3. Rollback restore logic
4. Blue-green environment detection
5. Error handling (set -e, exit codes)
6. Health check implementations
7. DRY_RUN support in scripts

**Exit Codes:**

- `0` - All tests passed
- `1` - One or more tests failed

### rollback-drill.sh

Simulates a complete deployment and rollback cycle to ensure reversibility and validate disaster recovery procedures.

**Usage:**

```bash
# Safe DRY_RUN mode (no containers)
DRY_RUN=true ./rollback-drill.sh

# LIVE mode with real containers
DRY_RUN=false ./rollback-drill.sh

# LIVE mode with automatic cleanup
DRY_RUN=false CLEANUP=true ./rollback-drill.sh
```

**Environment Variables:**

- `DRY_RUN` (default: `true`) - Safe simulation mode
- `DRILL_DIR` (default: `/tmp/rollback-drill`) - Drill workspace
- `ENVIRONMENT` (default: `drill`) - Environment identifier
- `CLEANUP` (default: `false`) - Auto-cleanup after drill

**Drill Phases:**

1. **Setup** - Create drill environment
2. **Initial State Capture** - Snapshot current state
3. **Deployment Simulation** - Deploy v2 with backups
4. **Deployment Verification** - Verify v2 healthy
5. **Rollback Execution** - Rollback to v1
6. **Rollback Verification** - Verify v1 restored
7. **Clean State Verification** - Compare states
8. **Data Integrity Check** - Verify no data loss

**Exit Codes:**

- `0` - Drill passed
- `1` - Drill failed

**Reports:**

Detailed drill report saved to: `$DRILL_DIR/state/drill-report.txt`

## CI/CD Integration

These tests run automatically in GitHub Actions:

- **Workflow:** `.github/workflows/deployment-tests.yml`
- **Triggers:**
  - **Harness Tests:** Push/PR to main/develop with deployment script changes
  - **Rollback Drills:** Weekly schedule (Monday 2 AM UTC), manual via workflow_dispatch, or commit message with `[rollback-drill]`
- **Jobs:**
  - `deployment-harness` - Runs test harness on script changes
  - `rollback-drill` - Runs drill (DRY_RUN and LIVE) on schedule/manual
  - `test-script-syntax` - Validates shell syntax
  - `integration-test` - Component integration tests

**Artifacts:**

Test results are published as GitHub Actions artifacts (30 day retention):
- `deployment-harness-results` - Harness logs
- `rollback-drill-results` - Drill reports and state files

## Best Practices

### Before Production Deployment

1. Run test harness:
   ```bash
   ./test-deployment-harness.sh
   ```

2. Run rollback drill (DRY_RUN):
   ```bash
   DRY_RUN=true ./rollback-drill.sh
   ```

3. Review staging rehearsal:
   ```bash
   ./staging-rehearsal.sh
   ```

### Regular Maintenance

- **Weekly:** Automated rollback drills (CI)
- **Monthly:** Manual drill in staging
- **Quarterly:** Review test scenarios
- **After Changes:** Run harness when modifying deployment scripts

### Troubleshooting

#### Test Harness Failures

| Error | Cause | Fix |
|-------|-------|-----|
| "missing docker validation" | No Docker check | Add `command_exists docker` |
| "missing backup mechanism" | No backup creation | Add `BACKUP_TAG` logic |
| "missing 'set -e'" | No error handling | Add `set -e` at top |

#### Drill Failures

| Phase | Cause | Fix |
|-------|-------|-----|
| Setup | Docker unavailable | Install Docker |
| Deployment | Compose errors | Fix docker-compose.yml |
| Rollback | Missing backup | Check backup creation |

## Documentation

Full documentation available in:
- [Operations Runbook](../docs/operations/runbook.md) - Deployment testing section
- [Testing Guide](../docs/testing/TESTING.md) - Overall testing strategy

## Examples

### Run harness locally

```bash
cd scripts
./test-deployment-harness.sh
```

### Run drill with cleanup

```bash
DRY_RUN=false CLEANUP=true ./rollback-drill.sh
```

### Trigger CI drill manually

```bash
gh workflow run deployment-tests.yml
```

### Download CI artifacts

```bash
gh run download <run-id>
cat deployment-harness-results/harness-output.log
```

## Support

For issues or questions:
1. Check [Operations Runbook](../docs/operations/runbook.md)
2. Review CI workflow logs
3. Consult deployment documentation
