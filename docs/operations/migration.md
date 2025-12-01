---
title: "Database Migrations"
summary: "Schema migration procedures using golang-migrate."
tags: ["operations", "migrations", "database"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["migrations", "schema changes"]
---

# Database Migrations

Database schema migration procedures using golang-migrate.

## Overview

Migrations use [golang-migrate](https://github.com/golang-migrate/migrate) with:

- Migration files in `backend/migrations/`
- Versioned SQL files: `000001_initial_schema.up.sql`, `000001_initial_schema.down.sql`
- Tracking table: `_schema_migrations`

See [[../backend/database|Database Schema]] for table details.

## Migration Files

Format: `{version}_{description}.{up|down}.sql`

Example:

```
backend/migrations/
├── 000001_initial_schema.up.sql
├── 000001_initial_schema.down.sql
├── 000002_add_favorites.up.sql
├── 000002_add_favorites.down.sql
```

## Creating Migrations

```bash
# Create new migration
migrate create -ext sql -dir backend/migrations -seq add_collections

# Creates:
# backend/migrations/000003_add_collections.up.sql
# backend/migrations/000003_add_collections.down.sql
```

Write SQL in generated files:

**up.sql** (apply migration):

```sql
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_collections_user_id ON collections(user_id);
```

**down.sql** (rollback migration):

```sql
DROP TABLE IF EXISTS collections;
```

## Running Migrations

### Development

```bash
# Apply all pending migrations
make migrate-up

# Or with Docker Compose
docker compose exec backend migrate up

# Apply specific version
migrate -path backend/migrations -database "$DATABASE_URL" goto 5

# Check status
make migrate-status
```

### Production

**Pre-deployment**:

1. Test migration on staging with production-like data
2. Measure migration time
3. Review down migration for rollback
4. Create database backup

**Deployment**:

```bash
# SSH to production
ssh deploy@production

# Backup
./scripts/backup.sh

# Run migration
docker compose exec backend migrate up

# Verify
docker compose exec backend migrate version
```

**Rollback** (if needed):

```bash
# Rollback last migration
docker compose exec backend migrate down 1

# Or rollback to specific version
docker compose exec backend migrate goto 4
```

## CI/CD Integration

GitHub Actions runs migrations during production deployment:

```yaml
- name: Run Migrations
  run: |
    ssh $PRODUCTION_HOST "cd /opt/clipper && docker compose exec -T backend migrate up"
```

## Best Practices

1. **Always provide down migration** for rollback capability
2. **Test migrations on staging** with production data snapshot
3. **Backward-compatible migrations** when possible:
   - Add nullable columns
   - Create indexes concurrently: `CREATE INDEX CONCURRENTLY`
   - Avoid blocking DDL during peak hours
4. **Batch large data migrations** to avoid long locks
5. **Coordinate with application deployments**:
   - Migration adds column → deploy new code
   - New code uses column → safe
   - Migration removes column → deploy code that doesn't use it first

## Troubleshooting

### Migration Fails

```bash
# Check current version
migrate -path backend/migrations -database "$DATABASE_URL" version

# Force to specific version (use carefully!)
migrate -path backend/migrations -database "$DATABASE_URL" force 4

# Fix dirty state
migrate -path backend/migrations -database "$DATABASE_URL" force VERSION
```

### Locked Table

Long-running migrations can lock tables. To monitor:

```sql
-- Check blocking queries
SELECT pid, query, state, wait_event_type, query_start 
FROM pg_stat_activity 
WHERE state != 'idle' AND query_start < now() - interval '1 minute';

-- Kill blocking query (if safe)
SELECT pg_terminate_backend(12345);  -- Replace with pid
```

### Performance Impact

Minimize impact:

- Run during low-traffic hours
- Use `CONCURRENTLY` for index creation
- Batch data updates: `UPDATE ... WHERE id IN (SELECT ... LIMIT 1000)`
- Monitor query execution time

---

Related: [[../backend/database|Database]] · [[deployment|Deployment]] · [[preflight|Preflight]]

[[../index|← Back to Index]]
