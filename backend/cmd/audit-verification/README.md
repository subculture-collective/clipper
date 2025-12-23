# Creator Verification Audit Job

This job performs periodic audits of verified creator accounts to ensure they maintain eligibility for verified status.

## Overview

The audit job checks verified users against multiple criteria:
- Account ban status
- Trust score thresholds
- Karma points
- DMCA strikes/termination
- Time since verification

## Usage

### Command Line Options

```bash
go run ./cmd/audit-verification/main.go [options]
```

**Options:**
- `--dry-run`: Run without saving audit results to database (default: false)
- `--limit`: Maximum number of users to audit per run (default: 100)
- `--audit-period`: Audit users who haven't been audited in N days (default: 90)

### Examples

**Dry run to preview results:**
```bash
go run ./cmd/audit-verification/main.go --dry-run --limit=10
```

**Production run with default settings:**
```bash
go run ./cmd/audit-verification/main.go
```

**Audit specific number of users:**
```bash
go run ./cmd/audit-verification/main.go --limit=50 --audit-period=60
```

## Audit Criteria

### Passed
- User is not banned
- Trust score >= 50
- Karma points >= 0
- No DMCA termination
- Less than 2 DMCA strikes

### Flagged for Review
- Trust score < 50
- Negative karma points
- 2 or more DMCA strikes

### Revoked
- User account is banned
- DMCA terminated

## Automated Actions

Based on audit results, the following actions may be taken:
- **none**: Audit passed, no action needed
- **further_review_required**: Flagged for manual admin review
- **verification_revoked**: Verification status automatically revoked
- **warning_sent**: Warning notification sent to user (future enhancement)

## Scheduling

### Using Cron

Add to your crontab to run daily at 2 AM:

```cron
0 2 * * * cd /path/to/clipper/backend && ./bin/audit-verification >> /var/log/clipper/audit-verification.log 2>&1
```

Or weekly on Sunday at 3 AM:

```cron
0 3 * * 0 cd /path/to/clipper/backend && ./bin/audit-verification >> /var/log/clipper/audit-verification.log 2>&1
```

### Building the Binary

```bash
cd backend
go build -o bin/audit-verification ./cmd/audit-verification
```

## Monitoring

Audit logs are stored in the `verification_audit_logs` table and can be viewed via:

**Admin API Endpoints:**
- `GET /admin/verification/audit-logs` - View all flagged audits
- `GET /admin/verification/audit-logs?user_id={uuid}` - View audits for specific user
- `GET /admin/verification/users/{user_id}/audit-logs` - View full audit history

## Output

The job produces detailed logs showing:
- Number of users audited
- Audit results (passed/flagged/revoked)
- Individual user audit details
- Execution time and statistics

Example output:
```
Starting creator verification audit job...
Configuration: dry_run=false, limit=100, audit_period=90 days
Database connection established

--- Retrieving verified users for audit ---
Found 25 verified users requiring audit

--- Auditing verified users ---

[1/25] Auditing user: johndoe (ID: 123e4567-e89b-12d3-a456-426614174000)
  ✓ Audit passed
  Audit log saved (ID: 789e4567-e89b-12d3-a456-426614174001)

=== Audit Summary ===
Users audited: 25
  - Passed: 23
  - Flagged: 2
  - Revoked: 0
Duration: 1.234s

✓ Audit completed successfully!
```

## Database Schema

Audit results are stored in the `verification_audit_logs` table:

```sql
CREATE TABLE verification_audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    audit_type VARCHAR(50),  -- 'periodic_check', 'manual_review', 'abuse_detection'
    status VARCHAR(20),       -- 'passed', 'flagged', 'revoked'
    findings JSONB,           -- Detailed audit findings
    notes TEXT,
    audited_by UUID,          -- NULL for automated audits
    action_taken VARCHAR(50), -- 'none', 'warning_sent', 'verification_revoked', etc.
    created_at TIMESTAMP
);
```

## Troubleshooting

**No users found for audit:**
- Check if there are verified users in the database
- Verify the `audit-period` setting isn't too restrictive
- Ensure users have `is_verified = true`

**Database connection errors:**
- Verify `.env` file has correct database credentials
- Ensure database is running and accessible
- Check migrations are up to date

**Audit logs not saving:**
- Verify you're not running in `--dry-run` mode
- Check database permissions for the audit_logs table
- Review application logs for specific errors
