
# Database Migration Plan

This document outlines the comprehensive strategy for executing database schema migrations and data migrations in production environments with minimal risk and downtime.

## Table of Contents

- [Overview](#overview)
- [Migration Strategy](#migration-strategy)
- [Pre-Migration Checklist](#pre-migration-checklist)
- [Backup Strategy](#backup-strategy)
- [Migration Execution](#migration-execution)
- [Rollback Procedures](#rollback-procedures)
- [Zero-Downtime Migrations](#zero-downtime-migrations)
- [Data Migration Patterns](#data-migration-patterns)
- [Testing Strategy](#testing-strategy)
- [Monitoring and Validation](#monitoring-and-validation)
- [Migration Runbook Templates](#migration-runbook-templates)

## Overview

### Current State

- **Database**: PostgreSQL 17
- **Migration Tool**: golang-migrate (v4.17.0+)
- **Current Version**: 000020 (performance indexes)
- **Location**: `backend/migrations/`
- **Naming Convention**: `NNNNNN_description.up.sql` / `NNNNNN_description.down.sql`

### Migration Types

1. **Schema Migrations**: DDL changes (tables, columns, indexes, constraints)
2. **Data Migrations**: DML changes (data transformation, backfills)
3. **Hybrid Migrations**: Combination of schema and data changes

### Risk Assessment

| Risk Level | Criteria | Downtime Required | Approval Needed |
|------------|----------|-------------------|-----------------|
| **Low** | New table, new index (CONCURRENTLY), add nullable column | No | Tech Lead |
| **Medium** | Add NOT NULL column, modify data types, large indexes | No (with strategy) | Engineering Manager |
| **High** | Drop table/column, change constraints, breaking changes | Yes (or complex strategy) | VP Engineering + CTO |
| **Critical** | Major schema refactor, data archival, breaking API changes | Yes | Executive Team |

## Migration Strategy

### Principles

1. **Safety First**: Always have a tested rollback plan
2. **Incremental Changes**: Break large migrations into small, deployable units
3. **Backward Compatibility**: New code should work with old schema during transition
4. **Zero Downtime**: Strive for zero-downtime deployments when possible
5. **Test Everything**: Test on staging with production-like data before production
6. **Monitor Closely**: Watch metrics during and after migration

### Three-Phase Deployment Pattern

For complex migrations, use a three-phase approach:

#### Phase 1: Expand
- Add new schema elements (tables, columns, indexes)
- Deploy new application code that writes to both old and new schema
- Old code continues to work

#### Phase 2: Migrate
- Backfill data from old to new schema
- Validate data consistency
- Switch reads to new schema gradually

#### Phase 3: Contract
- Remove old schema elements after verification
- Clean up deprecated code
- Archive old data if needed

## Pre-Migration Checklist

Complete this checklist before **every** production migration:

### Planning

- [ ] Migration plan documented and reviewed
- [ ] Risk assessment completed
- [ ] Downtime requirement identified (if any)
- [ ] Rollback plan documented
- [ ] Success criteria defined
- [ ] Failure recovery procedures ready

### Testing

- [ ] Migration tested on local development database
- [ ] Migration tested on staging with production-like data volume
- [ ] Migration time measured on staging
- [ ] Rollback tested on staging
- [ ] Application tested with new schema on staging
- [ ] Performance impact measured

### Backup

- [ ] Database backup created and verified
  ```bash
  ./scripts/backup.sh
  ls -lh /var/backups/clipper/
  gunzip -t /var/backups/clipper/db-latest.sql.gz
  ```
- [ ] Backup restoration procedure tested
- [ ] Point-in-time recovery available (if supported)
- [ ] Backup retention verified (30 days)

### Communication

- [ ] Team notified of migration schedule
- [ ] Maintenance window communicated (if needed)
- [ ] On-call engineer assigned
- [ ] Stakeholders informed
- [ ] Support team briefed

### Environment Validation

- [ ] Production database version matches staging
- [ ] Current migration version verified
  ```bash
  migrate -path backend/migrations -database "$DATABASE_URL" version
  ```
- [ ] Database health check passed
  ```bash
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f backend/migrations/health_check.sql
  ```
- [ ] No long-running transactions
  ```bash
  psql -d $DB_NAME -c "SELECT * FROM pg_stat_activity WHERE state != 'idle' AND query_start < now() - interval '1 minute';"
  ```
- [ ] Sufficient disk space (>30% free)
- [ ] Connection pool capacity available

## Backup Strategy

### Automated Backups

Production databases should have automated backups configured:

```bash
# Daily backups at 2 AM (configured in cron)
0 2 * * * /opt/clipper/scripts/backup.sh

# Verify backup configuration
crontab -l | grep backup
```

### Pre-Migration Backup

Always create a fresh backup immediately before migration:

```bash
# SSH to production server
ssh deploy@production-server

# Navigate to deployment directory
cd /opt/clipper

# Create backup with migration marker
export BACKUP_TAG="pre-migration-$(date +%Y%m%d-%H%M%S)"
./scripts/backup.sh

# Verify backup
ls -lh /var/backups/clipper/ | grep $BACKUP_TAG
gunzip -t /var/backups/clipper/db-${BACKUP_TAG}.sql.gz

# Record backup location for rollback
echo "Backup created: db-${BACKUP_TAG}.sql.gz" >> migration.log
```

### Backup Verification

```bash
# Test backup integrity
gunzip -c /var/backups/clipper/db-${BACKUP_TAG}.sql.gz | head -100

# Verify backup size (should be similar to previous backups)
du -h /var/backups/clipper/db-${BACKUP_TAG}.sql.gz

# Optional: Test restore on isolated database
createdb clipper_backup_test
gunzip < /var/backups/clipper/db-${BACKUP_TAG}.sql.gz | psql -d clipper_backup_test
psql -d clipper_backup_test -c "SELECT COUNT(*) FROM users;"
dropdb clipper_backup_test
```

### Backup Retention

- **Daily backups**: Retained for 30 days
- **Pre-migration backups**: Retained for 90 days
- **Major release backups**: Retained for 1 year

## Migration Execution

### Standard Migration (Low Risk)

For non-breaking changes like adding nullable columns or new tables:

```bash
# 1. SSH to production server
ssh deploy@production-server
cd /opt/clipper

# 2. Create backup
./scripts/backup.sh
BACKUP_TAG=$(ls -t /var/backups/clipper/db-*.sql.gz | head -1 | sed 's/.*db-\(.*\).sql.gz/\1/')
echo "Backup: $BACKUP_TAG"

# 3. Check current migration version
docker-compose exec postgres psql -U clipper -d clipper_db -c "SELECT version, dirty FROM schema_migrations;"

# 4. Run migration
# Use PGPASSWORD environment variable for secure authentication
export PGPASSWORD="$DB_PASSWORD"
migrate -path backend/migrations \
  -database "postgresql://clipper@localhost:5436/clipper_db?sslmode=disable" \
  up
unset PGPASSWORD

# 5. Verify new version
docker-compose exec postgres psql -U clipper -d clipper_db -c "SELECT version, dirty FROM schema_migrations;"

# 6. Verify schema changes
docker-compose exec postgres psql -U clipper -d clipper_db -c "\dt"  # List tables
docker-compose exec postgres psql -U clipper -d clipper_db -c "\d table_name"  # Describe specific table

# 7. Run health check
./scripts/health-check.sh

# 8. Monitor application logs
docker-compose logs -f backend --tail=100
```

### Migration with Downtime (High Risk)

For breaking changes that require downtime:

```bash
# 1. Put application in maintenance mode
# (Update load balancer or use maintenance page)

# 2. Stop application servers
docker-compose stop backend frontend

# 3. Verify no active connections
docker-compose exec postgres psql -U clipper -d clipper_db -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'clipper_db' AND pid != pg_backend_pid();"

# 4. Create backup
./scripts/backup.sh
BACKUP_TAG=$(ls -t /var/backups/clipper/db-*.sql.gz | head -1 | sed 's/.*db-\(.*\).sql.gz/\1/')

# 5. Run migration
# Use PGPASSWORD environment variable for secure authentication
export PGPASSWORD="$DB_PASSWORD"
migrate -path backend/migrations \
  -database "postgresql://clipper@localhost:5436/clipper_db?sslmode=disable" \
  up
unset PGPASSWORD

# 6. Verify migration
docker-compose exec postgres psql -U clipper -d clipper_db -c "SELECT version, dirty FROM schema_migrations;"

# 7. Start application
docker-compose start backend frontend

# 8. Health check
sleep 10
./scripts/health-check.sh

# 9. Remove maintenance mode

# 10. Monitor closely for 30 minutes
docker-compose logs -f --tail=100
```

### Migration Monitoring

During migration execution, monitor:

```bash
# Terminal 1: Database activity
watch -n 1 "docker-compose exec postgres psql -U clipper -d clipper_db -c \"SELECT pid, query, state, wait_event_type FROM pg_stat_activity WHERE state != 'idle';\""

# Terminal 2: Database locks
watch -n 1 "docker-compose exec postgres psql -U clipper -d clipper_db -c \"SELECT locktype, relation::regclass, mode, granted FROM pg_locks WHERE NOT granted;\""

# Terminal 3: Application logs
docker-compose logs -f backend

# Terminal 4: System resources
docker stats
```

## Rollback Procedures

### Automatic Rollback

If migration fails with `dirty` state:

```bash
# Check migration state
export PGPASSWORD="$DB_PASSWORD"
migrate -path backend/migrations \
  -database "postgresql://clipper@localhost:5436/clipper_db?sslmode=disable" \
  version

# If dirty, force to previous version
migrate -path backend/migrations \
  -database "postgresql://clipper@localhost:5436/clipper_db?sslmode=disable" \
  force PREVIOUS_VERSION

# Run down migration
migrate -path backend/migrations \
  -database "postgresql://clipper@localhost:5436/clipper_db?sslmode=disable" \
  down 1
unset PGPASSWORD
```

### Manual Rollback to Backup

If migration succeeds but causes application issues:

```bash
# 1. Stop application
docker-compose stop backend frontend

# 2. Identify backup to restore
ls -lh /var/backups/clipper/ | grep pre-migration
BACKUP_FILE="/var/backups/clipper/db-${BACKUP_TAG}.sql.gz"

# 3. Drop current database (DANGEROUS - ensure backup is valid!)
docker-compose exec postgres psql -U clipper -d postgres -c "DROP DATABASE clipper_db;"

# 4. Create fresh database
docker-compose exec postgres psql -U clipper -d postgres -c "CREATE DATABASE clipper_db OWNER clipper;"

# 5. Restore from backup
gunzip < $BACKUP_FILE | docker-compose exec -T postgres psql -U clipper -d clipper_db

# 6. Verify restoration
docker-compose exec postgres psql -U clipper -d clipper_db -c "SELECT COUNT(*) FROM users;"
docker-compose exec postgres psql -U clipper -d clipper_db -c "SELECT version FROM schema_migrations;"

# 7. Start application with old code version
# (Rollback application deployment as well)
docker tag clipper-backend:backup clipper-backend:latest
docker-compose up -d

# 8. Verify health
./scripts/health-check.sh
```

### Partial Rollback (Down Migration)

For reversible migrations:

```bash
# Run down migration to revert last migration
# Use PGPASSWORD environment variable for secure authentication
export PGPASSWORD="$DB_PASSWORD"
migrate -path backend/migrations \
  -database "postgresql://clipper@localhost:5436/clipper_db?sslmode=disable" \
  down 1

# Verify version rolled back
migrate -path backend/migrations \
  -database "postgresql://clipper@localhost:5436/clipper_db?sslmode=disable" \
  version
unset PGPASSWORD

# Restart application
docker-compose restart backend

# Verify health
./scripts/health-check.sh
```

### Rollback Decision Tree

```
Migration Issue Detected
    ├─> Application errors >5%
    │   └─> IMMEDIATE ROLLBACK (restore backup)
    │
    ├─> Performance degradation >50%
    │   └─> ROLLBACK within 15 minutes
    │
    ├─> Non-critical feature broken
    │   └─> Evaluate: Fix forward or rollback?
    │
    └─> Minor issues
        └─> Monitor and fix forward
```

## Zero-Downtime Migrations

### Adding a Column (Nullable)

Safe - can be done without downtime:

```sql
-- Migration up
ALTER TABLE clips ADD COLUMN new_field VARCHAR(255);

-- Application code handles NULL values
-- Later migration can add NOT NULL constraint after backfill
```

### Adding a Column (NOT NULL)

Requires multi-phase approach:

```sql
-- Phase 1: Add nullable column
ALTER TABLE clips ADD COLUMN required_field VARCHAR(255);

-- Deploy application code that writes to new column
-- Wait 1-2 days to ensure all new records have value

-- Phase 2: Backfill existing records
UPDATE clips SET required_field = 'default_value' WHERE required_field IS NULL;

-- Phase 3: Add NOT NULL constraint
ALTER TABLE clips ALTER COLUMN required_field SET NOT NULL;
```

### Renaming a Column

Use three-phase deployment:

```sql
-- Phase 1: Add new column
ALTER TABLE clips ADD COLUMN new_name VARCHAR(255);

-- Deploy code that writes to both columns
UPDATE clips SET new_name = old_name WHERE new_name IS NULL;

-- Phase 2: Switch reads to new column
-- Deploy code that reads from new_name

-- Phase 3: Drop old column
ALTER TABLE clips DROP COLUMN old_name;
```

### Adding an Index

Use `CONCURRENTLY` to avoid locks:

```sql
-- Creates index without locking table for writes
CREATE INDEX CONCURRENTLY idx_clips_created_at ON clips(created_at);

-- Note: Cannot be run in a transaction
-- Check index status after creation
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE indexname = 'idx_clips_created_at';
```

### Changing a Data Type

Complex - requires careful planning:

```sql
-- Phase 1: Add new column with new type
ALTER TABLE clips ADD COLUMN duration_ms INTEGER;

-- Deploy code that writes to both columns
UPDATE clips SET duration_ms = CAST(duration_seconds * 1000 AS INTEGER);

-- Phase 2: Backfill and validate
-- Verify data consistency
SELECT COUNT(*) FROM clips WHERE duration_ms IS NULL;
SELECT COUNT(*) FROM clips WHERE duration_ms != duration_seconds * 1000;

-- Phase 3: Switch application to new column
-- Drop old column
ALTER TABLE clips DROP COLUMN duration_seconds;
ALTER TABLE clips RENAME COLUMN duration_ms TO duration;
```

## Data Migration Patterns

### Large Data Backfill

For backfilling millions of records:

```sql
-- Don't: Single UPDATE (locks table, might timeout)
-- UPDATE clips SET embeddings_generated = false;

-- Do: Batch updates with progress tracking
DO $$
DECLARE
    batch_size INTEGER := 1000;
    processed INTEGER := 0;
    total INTEGER;
BEGIN
    SELECT COUNT(*) INTO total FROM clips WHERE embeddings_generated IS NULL;
    RAISE NOTICE 'Total records to process: %', total;
    
    LOOP
        UPDATE clips
        SET embeddings_generated = false
        WHERE id IN (
            SELECT id FROM clips 
            WHERE embeddings_generated IS NULL 
            LIMIT batch_size
        );
        
        processed := processed + batch_size;
        RAISE NOTICE 'Processed: % / %', processed, total;
        
        EXIT WHEN NOT FOUND;
        
        -- Brief pause to avoid overwhelming database
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;
```

### Data Transformation

For complex data transformations:

```sql
-- Example: Migrating JSON structure
CREATE TEMP TABLE migration_progress (
    id UUID PRIMARY KEY,
    status VARCHAR(20),
    error TEXT
);

-- Transform in batches with error handling
DO $$
DECLARE
    rec RECORD;
    transformed_data JSONB;
BEGIN
    FOR rec IN 
        SELECT id, metadata FROM clips 
        WHERE metadata IS NOT NULL
        LIMIT 1000
    LOOP
        BEGIN
            -- Transform data
            transformed_data := jsonb_set(
                rec.metadata,
                '{version}',
                '2'
            );
            
            -- Update record
            UPDATE clips 
            SET metadata = transformed_data 
            WHERE id = rec.id;
            
            -- Track success
            INSERT INTO migration_progress VALUES (rec.id, 'success', NULL);
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error and continue
            INSERT INTO migration_progress VALUES (rec.id, 'error', SQLERRM);
        END;
    END LOOP;
END $$;

-- Review errors
SELECT * FROM migration_progress WHERE status = 'error';
```

### Archive and Purge

For removing old data:

```sql
-- Step 1: Create archive table
CREATE TABLE clips_archive (LIKE clips INCLUDING ALL);

-- Step 2: Copy old data to archive
INSERT INTO clips_archive
SELECT * FROM clips
WHERE created_at < NOW() - INTERVAL '2 years';

-- Step 3: Verify archive
SELECT COUNT(*) FROM clips_archive;

-- Step 4: Delete from main table (in batches)
DELETE FROM clips
WHERE id IN (
    SELECT id FROM clips
    WHERE created_at < NOW() - INTERVAL '2 years'
    LIMIT 1000
);

-- Repeat deletion in batches
-- Monitor: SELECT COUNT(*) FROM clips WHERE created_at < NOW() - INTERVAL '2 years';
```

## Testing Strategy

### Local Testing

```bash
# 1. Start local database
docker-compose up -d postgres

# 2. Run migrations up
make migrate-up

# 3. Verify schema
psql -h localhost -U clipper -d clipper_db -c "\dt"

# 4. Test application
make backend-dev

# 5. Test rollback
make migrate-down
make migrate-up

# 6. Clean up
docker-compose down -v
```

### Staging Testing

```bash
# 1. Copy production data to staging (anonymized)
# (Use separate procedure for data anonymization)

# 2. Test migration on staging
ssh deploy@staging-server
cd /opt/clipper
./scripts/backup.sh
migrate -path backend/migrations -database "$DATABASE_URL" up

# 3. Measure migration time
time migrate -path backend/migrations -database "$DATABASE_URL" up

# 4. Test application with new schema
curl https://staging.clpr.tv/health

# 5. Test rollback
migrate -path backend/migrations -database "$DATABASE_URL" down 1
curl https://staging.clpr.tv/health
migrate -path backend/migrations -database "$DATABASE_URL" up

# 6. Load test after migration
make test-load
```

### Production-Like Testing

Use production snapshot for realistic testing:

```bash
# 1. Create production snapshot (read replica or backup)
# 2. Restore to isolated test environment
# 3. Run migration with production data volume
# 4. Measure performance impact
# 5. Validate data integrity
```

## Monitoring and Validation

### During Migration

Monitor these metrics:

```bash
# Database connections
psql -d clipper_db -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Active queries
psql -d clipper_db -c "SELECT pid, query, state, wait_event_type FROM pg_stat_activity WHERE state != 'idle';"

# Locks
psql -d clipper_db -c "SELECT locktype, relation::regclass, mode, granted FROM pg_locks WHERE NOT granted;"

# Table sizes
psql -d clipper_db -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"

# Replication lag (if applicable)
psql -d clipper_db -c "SELECT NOW() - pg_last_xact_replay_timestamp() AS replication_lag;"
```

### Post-Migration Validation

```bash
# 1. Verify migration version
migrate -path backend/migrations -database "$DATABASE_URL" version

# 2. Check schema_migrations table
psql -d clipper_db -c "SELECT * FROM schema_migrations;"

# 3. Verify table structure
psql -d clipper_db -c "\d clips"

# 4. Verify indexes
psql -d clipper_db -c "\di"

# 5. Verify constraints
psql -d clipper_db -c "SELECT conname, contype FROM pg_constraint WHERE conrelid = 'clips'::regclass;"

# 6. Verify data integrity
psql -d clipper_db -f backend/migrations/health_check.sql

# 7. Run application health checks
./scripts/health-check.sh

# 8. Test critical user flows
curl -X POST https://clpr.tv/api/v1/auth/login -d '...'
curl https://clpr.tv/api/v1/clips?sort=hot&limit=10

# 9. Monitor error rates in Sentry
# (Check Sentry dashboard for spike in errors)

# 10. Check application logs
docker-compose logs backend --tail=100 | grep -i error
```

## Migration Runbook Templates

### Template: Adding New Table

```markdown
# Migration: Add <table_name> Table

**Risk Level**: Low
**Estimated Time**: 2 minutes
**Downtime Required**: No

## Pre-Migration
- [ ] Backup completed
- [ ] Current version: NNNNNN
- [ ] Staging tested successfully

## Execution
```bash
migrate -path backend/migrations -database "$DATABASE_URL" up
```

## Validation
- [ ] Table created: `\dt <table_name>`
- [ ] Indexes created: `\di`
- [ ] Application healthy
- [ ] No errors in logs

## Rollback
```bash
migrate -path backend/migrations -database "$DATABASE_URL" down 1
```
```

### Template: Data Backfill

```markdown
# Migration: Backfill <field_name> Data

**Risk Level**: Medium
**Estimated Time**: 30 minutes (depends on data volume)
**Downtime Required**: No

## Pre-Migration
- [ ] Backup completed
- [ ] Migration tested on staging
- [ ] Backfill time measured: X minutes for Y records
- [ ] Application can handle NULL values

## Execution
```sql
-- Run in batches to avoid locks
DO $$
DECLARE
    batch_size INTEGER := 1000;
BEGIN
    LOOP
        UPDATE <table_name>
        SET <field_name> = <default_value>
        WHERE <field_name> IS NULL
        LIMIT batch_size;
        
        EXIT WHEN NOT FOUND;
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;
```

## Monitoring
```bash
# Watch progress
watch -n 5 "psql -d clipper_db -c 'SELECT COUNT(*) FROM <table_name> WHERE <field_name> IS NULL;'"
```

## Validation
- [ ] All records backfilled: `SELECT COUNT(*) FROM <table_name> WHERE <field_name> IS NULL;` = 0
- [ ] Data looks correct: `SELECT * FROM <table_name> LIMIT 10;`
- [ ] Application healthy

## Rollback
```bash
# Set field back to NULL if needed
UPDATE <table_name> SET <field_name> = NULL;
```
```

### Template: Adding Index

```markdown
# Migration: Add Index on <table_name>(<column_name>)

**Risk Level**: Low-Medium
**Estimated Time**: 5-30 minutes (depends on table size)
**Downtime Required**: No (using CONCURRENTLY)

## Pre-Migration
- [ ] Backup completed
- [ ] Index creation time measured on staging
- [ ] Table size: <X GB>
- [ ] Index size estimate: <Y GB>
- [ ] Sufficient disk space: >30% free

## Execution
```sql
CREATE INDEX CONCURRENTLY idx_<table_name>_<column_name> 
ON <table_name>(<column_name>);
```

## Monitoring
```bash
# Watch index creation progress
watch -n 5 "psql -d clipper_db -c \"SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes WHERE indexname = 'idx_<table_name>_<column_name>';\""
```

## Validation
- [ ] Index created: `\di idx_<table_name>_<column_name>`
- [ ] Index valid: `SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'idx_<table_name>_<column_name>';`
- [ ] Query uses index: `EXPLAIN SELECT * FROM <table_name> WHERE <column_name> = 'value';`
- [ ] Application healthy

## Rollback
```sql
DROP INDEX CONCURRENTLY idx_<table_name>_<column_name>;
```
```

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|-------------|
| Primary On-Call | TBD | +1-XXX-XXX-XXXX | 24/7 |
| Backup On-Call | TBD | +1-XXX-XXX-XXXX | 24/7 |
| Database Admin | TBD | db-admin@clipper.gg | Business Hours |
| DevOps Lead | TBD | devops@clipper.gg | Business Hours |
| CTO | TBD | cto@clipper.gg | Escalation Only |

## References

- [Preflight Checklist](./PREFLIGHT_CHECKLIST.md)
- [Runbook](./RUNBOOK.md)
- [Database Documentation](./database.md)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/ddl.html)
- [golang-migrate Documentation](https://github.com/golang-migrate/migrate)

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-14 | Initial migration plan | DevOps Team |

---

**Remember**: A failed migration is better than a corrupted database. Take your time and verify each step.
