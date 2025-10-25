# Database Documentation

This document provides comprehensive information about database management, migrations, and maintenance for Clipper.

## Table of Contents

1. [Database Schema](#database-schema)
2. [Migration Guide](#migration-guide)
3. [Database Maintenance](#database-maintenance)
4. [Query Optimization](#query-optimization)
5. [Backup and Recovery](#backup-and-recovery)

## Database Schema

For detailed schema information including tables, relationships, and ERD, see [DATABASE-SCHEMA.md](DATABASE-SCHEMA.md).

### Quick Reference

**Core Tables**:

- `users`: User accounts and profiles
- `clips`: Twitch clip metadata and stats
- `comments`: User comments on clips
- `votes`: Clip and comment voting records
- `favorites`: User-saved clips
- `tags`: Clip categorization tags

**Relationships**:

- Users → Clips (one-to-many via user_id)
- Users → Comments (one-to-many via user_id)
- Users → Votes (one-to-many via user_id)
- Clips → Comments (one-to-many via clip_id)
- Clips → Tags (many-to-many via clip_tags junction table)

### Connection Details

**Development**:

```
Host: localhost
Port: 5432
Database: clipper
User: clipper
Password: clipper_password
SSL Mode: disable
```

**Production**:

```
Host: <your-production-host>
Port: 5432
Database: clipper_prod
User: clipper_prod
Password: <secure-password>
SSL Mode: require
```

## Migration Guide

### Overview

Migrations are version-controlled database schema changes that can be applied or rolled back in a consistent manner.

### Migration Files

Migrations are stored in `backend/migrations/` with the naming convention:

```
YYYYMMDDHHMMSS_description.up.sql    # Apply migration
YYYYMMDDHHMMSS_description.down.sql  # Rollback migration
```

### Creating Migrations

#### Using Migration Script

```bash
cd backend

# Create a new migration
./scripts/create-migration.sh add_user_preferences

# This creates two files:
# migrations/20250124120000_add_user_preferences.up.sql
# migrations/20250124120000_add_user_preferences.down.sql
```

#### Manual Creation

1. Create the up migration file:

    ```sql
    -- migrations/20250124120000_add_user_preferences.up.sql
    CREATE TABLE user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'dark',
        notifications_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
    );

    CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
    ```

2. Create the down migration file:

    ```sql
    -- migrations/20250124120000_add_user_preferences.down.sql
    DROP TABLE IF EXISTS user_preferences;
    ```

### Running Migrations

#### Apply All Pending Migrations

```bash
# Using Go application
cd backend
go run cmd/api/main.go migrate

# Using migration tool
migrate -path ./migrations -database "postgres://clipper:clipper_password@localhost:5436/clipper_db?sslmode=disable" up
```

#### Apply Specific Number of Migrations

```bash
# Apply next 2 migrations
migrate -path ./migrations -database "<connection-string>" up 2
```

#### Check Migration Status

```bash
# Show current version
migrate -path ./migrations -database "<connection-string>" version

# Or using application
go run cmd/api/main.go migrate-status
```

### Rolling Back Migrations

#### Rollback Last Migration

```bash
# Using Go application
go run cmd/api/main.go migrate-down

# Using migration tool
migrate -path ./migrations -database "<connection-string>" down 1
```

#### Rollback to Specific Version

```bash
migrate -path ./migrations -database "<connection-string>" goto 20250124120000
```

#### Rollback All Migrations

```bash
# WARNING: This will drop all tables!
migrate -path ./migrations -database "<connection-string>" down -all
```

### Migration Best Practices

**DO**:

- ✅ Test migrations on a copy of production data
- ✅ Make migrations reversible when possible
- ✅ Include both up and down migrations
- ✅ Keep migrations small and focused
- ✅ Add comments explaining complex changes
- ✅ Use transactions for data migrations
- ✅ Test rollback procedures

**DON'T**:

- ❌ Modify existing migration files after they've been applied
- ❌ Delete migration files from the repository
- ❌ Make destructive changes without backups
- ❌ Skip version numbers
- ❌ Combine unrelated schema changes
- ❌ Assume migrations will run instantly on large tables

### Handling Migration Failures

**If a Migration Fails**:

1. Check the error message:

    ```bash
    tail -f logs/migration.log
    ```

2. Fix the migration file

3. Force to the previous version:

    ```bash
    migrate -path ./migrations -database "<connection-string>" force <previous-version>
    ```

4. Rerun the fixed migration:

    ```bash
    migrate -path ./migrations -database "<connection-string>" up 1
    ```

## Database Maintenance

### Regular Maintenance Tasks

#### Vacuum and Analyze

```sql
-- Vacuum all tables (reclaim storage)
VACUUM VERBOSE ANALYZE;

-- Vacuum specific table
VACUUM VERBOSE ANALYZE clips;

-- Full vacuum (more thorough, locks table)
VACUUM FULL clips;
```

**Schedule**: Run weekly during low-traffic periods

#### Update Statistics

```sql
-- Update query planner statistics
ANALYZE;

-- Update statistics for specific table
ANALYZE clips;
```

**Schedule**: Run after large data imports or bulk changes

#### Reindex

```sql
-- Reindex all tables
REINDEX DATABASE clipper;

-- Reindex specific table
REINDEX TABLE clips;

-- Reindex specific index
REINDEX INDEX idx_clips_created_at;
```

**Schedule**: Monthly or after significant data changes

### Monitoring Queries

#### Active Connections

```sql
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query,
    query_start
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```

#### Long-Running Queries

```sql
SELECT
    pid,
    now() - query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE state != 'idle'
    AND (now() - query_start) > interval '5 minutes'
ORDER BY duration DESC;
```

#### Kill Long-Running Query

```sql
-- Terminate specific query
SELECT pg_terminate_backend(12345);  -- Replace with actual PID

-- Cancel specific query (gentler)
SELECT pg_cancel_backend(12345);
```

#### Database Size

```sql
-- Total database size
SELECT pg_size_pretty(pg_database_size('clipper'));

-- Size by table
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Index Usage

```sql
-- Unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Index hit ratio (should be > 99%)
SELECT
    sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0) * 100 AS index_hit_ratio
FROM pg_statio_user_indexes;
```

## Query Optimization

### Analyzing Query Performance

#### Using EXPLAIN

```sql
-- Show query plan
EXPLAIN SELECT * FROM clips WHERE broadcaster_id = 'abc123';

-- Show actual execution statistics
EXPLAIN ANALYZE SELECT * FROM clips WHERE broadcaster_id = 'abc123';

-- Show more details
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM clips WHERE broadcaster_id = 'abc123';
```

#### Reading EXPLAIN Output

Look for:

- **Seq Scan**: Full table scan (slow on large tables)
- **Index Scan**: Using an index (fast)
- **Nested Loop**: Join method (varies in performance)
- **Cost**: Estimated query cost
- **Actual time**: Real execution time

### Common Optimizations

#### Add Missing Indexes

```sql
-- Find columns frequently used in WHERE clauses
CREATE INDEX idx_clips_broadcaster_id ON clips(broadcaster_id);
CREATE INDEX idx_comments_clip_id ON comments(clip_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- Composite indexes for multiple columns
CREATE INDEX idx_clips_created_broadcaster ON clips(created_at DESC, broadcaster_id);
```

#### Optimize Queries

**Before**:

```sql
-- Slow: Using LIKE on large table
SELECT * FROM clips WHERE title LIKE '%funny%';
```

**After**:

```sql
-- Fast: Using full-text search
CREATE INDEX idx_clips_title_fts ON clips USING gin(to_tsvector('english', title));

SELECT * FROM clips
WHERE to_tsvector('english', title) @@ to_tsquery('english', 'funny');
```

#### Use Proper Data Types

```sql
-- Bad: Storing timestamps as strings
ALTER TABLE events DROP COLUMN event_time;
ALTER TABLE events ADD COLUMN event_time TIMESTAMP WITH TIME ZONE;

-- Good: Using native timestamp type
```

#### Limit Result Sets

```sql
-- Bad: Loading all results
SELECT * FROM clips ORDER BY created_at DESC;

-- Good: Using pagination
SELECT * FROM clips
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

### Query Performance Checklist

- [ ] Indexes exist on foreign keys
- [ ] Indexes exist on frequently filtered columns
- [ ] WHERE clauses use indexed columns
- [ ] Queries use LIMIT when appropriate
- [ ] JOINs are on indexed columns
- [ ] Avoid SELECT \* when possible
- [ ] Use prepared statements for repeated queries
- [ ] Cache frequently accessed data

## Backup and Recovery

### Backup Procedures

#### Full Database Backup

```bash
# Create backup
pg_dump -h localhost -U clipper -d clipper -F c -f clipper_backup_$(date +%Y%m%d).dump

# With compression
pg_dump -h localhost -U clipper -d clipper -F c -Z 9 -f clipper_backup_$(date +%Y%m%d).dump
```

#### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/clipper_$TIMESTAMP.dump"

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U clipper -d clipper -F c -f $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "clipper_*.dump" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

#### Schedule Automated Backups

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/backup.log 2>&1

# Hourly backups during business hours
0 9-17 * * 1-5 /path/to/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### Recovery Procedures

#### Restore Full Database

```bash
# Drop existing database (WARNING: This deletes all data!)
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS clipper;"
psql -h localhost -U postgres -c "CREATE DATABASE clipper;"

# Restore from backup
pg_restore -h localhost -U clipper -d clipper clipper_backup_20250124.dump

# Or with verbose output
pg_restore -v -h localhost -U clipper -d clipper clipper_backup_20250124.dump
```

#### Restore Specific Table

```bash
# Restore only the clips table
pg_restore -h localhost -U clipper -d clipper -t clips clipper_backup_20250124.dump
```

#### Point-in-Time Recovery (PITR)

For production environments, configure WAL archiving:

```bash
# In postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f'
```

### Disaster Recovery Plan

**Recovery Time Objective (RTO)**: 1 hour  
**Recovery Point Objective (RPO)**: 1 hour (hourly backups)

**Steps**:

1. Assess the situation and damage extent
2. Notify team and stakeholders
3. Switch to backup infrastructure if available
4. Restore database from most recent backup
5. Apply transaction logs if available (PITR)
6. Verify data integrity
7. Resume operations
8. Conduct post-mortem analysis

### Backup Best Practices

- ✅ Test backups regularly (monthly)
- ✅ Store backups in multiple locations
- ✅ Encrypt sensitive backups
- ✅ Document recovery procedures
- ✅ Monitor backup job success/failure
- ✅ Keep backups for appropriate retention period
- ✅ Practice disaster recovery drills

---

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Schema](DATABASE-SCHEMA.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Runbook](RUNBOOK.md)

For questions or issues, open a GitHub issue with the `database` label.
