# Database Migrations

This directory contains database migration files for the Clipper application.

## Migration Tool

We use [golang-migrate](https://github.com/golang-migrate/migrate) for database migrations.

### Installation

```bash
# macOS
brew install golang-migrate

# Linux
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xvz
sudo mv migrate /usr/local/bin/

# Windows (using Scoop)
scoop install migrate

# Or using Go
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

## Database Schema

### Core Tables

#### Users
- **users**: User accounts with Twitch authentication
  - Stores user profiles, karma points, roles (user/moderator/admin)
  - Tracks ban status and login history

#### Clips
- **clips**: Twitch clips with metadata
  - Stores clip information from Twitch API
  - Tracks engagement metrics (votes, comments, favorites)
  - Supports moderation (featured, NSFW, removal)

#### Engagement
- **votes**: User votes on clips (upvote/downvote)
- **comments**: User comments on clips with nested support
- **comment_votes**: User votes on comments
- **favorites**: User favorited clips

#### Organization
- **tags**: Categorization tags for clips
- **clip_tags**: Many-to-many relationship between clips and tags

#### Moderation
- **reports**: User reports for clips, comments, or users
  - Tracks report status and review process

### Database Functions

#### `calculate_hot_score(score INT, created_at TIMESTAMP)`
Calculates a Reddit-style hot score for ranking clips:
- Combines vote score with time decay
- Uses logarithmic scaling for score component
- Returns higher values for recent, highly-voted content

#### Automated Triggers

1. **updated_at Timestamps**
   - Automatically updates `updated_at` field on users and comments

2. **Vote Score Updates**
   - Automatically updates clip `vote_score` when votes are added/removed/changed
   - Automatically updates comment `vote_score` when comment votes change

3. **Count Updates**
   - Automatically updates clip `comment_count` when comments are added/removed
   - Automatically updates clip `favorite_count` when favorites are added/removed
   - Automatically updates tag `usage_count` when clip_tags are added/removed

### Database Views

#### `hot_clips`
Clips ranked by hot score (combines recency and popularity)

#### `top_clips`
Clips ranked by total vote score (all-time popular)

#### `new_clips`
Clips sorted by creation time (most recent first)

#### `trending_clips`
Popular clips from the last 7 days ranked by hot score

## Usage

### Run Migrations Up

```bash
# Using Makefile
make migrate-up

# Or directly
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5432/clipper_db?sslmode=disable" up
```

### Run Migrations Down

```bash
# Using Makefile
make migrate-down

# Or directly
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5432/clipper_db?sslmode=disable" down
```

### Create New Migration

```bash
# Using Makefile
make migrate-create NAME=your_migration_name

# Or directly
migrate create -ext sql -dir backend/migrations -seq your_migration_name
```

### Check Migration Version

```bash
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5432/clipper_db?sslmode=disable" version
```

### Force Migration Version (use with caution)

```bash
migrate -path backend/migrations -database "postgresql://clipper:clipper_password@localhost:5432/clipper_db?sslmode=disable" force VERSION
```

## Seed Data

For development, you can seed the database with sample data:

```bash
# Using Makefile
make migrate-seed

# Or directly
psql -h localhost -U clipper -d clipper_db -f backend/migrations/seed.sql
```

This will create:
- 4 sample users (regular user, moderator, admin)
- 4 sample clips with various metadata
- Sample tags (Funny, Epic, Fail, Highlight, etc.)
- Sample votes, comments, favorites, and clip tags

## Database Connection

The database connection string format:
```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=[mode]
```

Default values (from `.env.example`):
- Host: `localhost`
- Port: `5432`
- User: `clipper`
- Password: `clipper_password`
- Database: `clipper_db`
- SSL Mode: `disable` (for local development)

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│    clips    │    │   reports   │
└──────┬──────┘    └─────────────┘
       │
       ├──────┬──────┬──────────┬──────────┐
       │      │      │          │          │
       ▼      ▼      ▼          ▼          ▼
┌──────────┐ │ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  votes   │ │ │favorites │ │ comments │ │clip_tags │
└──────────┘ │ └──────────┘ └────┬─────┘ └────┬─────┘
             │                   │            │
             │                   ▼            ▼
             │            ┌──────────────┐ ┌─────┐
             │            │comment_votes │ │tags │
             │            └──────────────┘ └─────┘
             │
             │ (self-reference for nested comments)
             └──────────────────┐
                               ▼
                        ┌──────────┐
                        │ comments │
                        │(parent)  │
                        └──────────┘
```

## Indexes

All tables have appropriate indexes for common query patterns:
- Primary keys (UUID)
- Foreign keys
- Frequently queried fields (username, twitch_id, vote_score, created_at)
- Composite indexes for common filter combinations

## Best Practices

1. **Always test migrations** in development before production
2. **Create backups** before running migrations in production
3. **Review down migrations** to ensure proper rollback
4. **Keep migrations atomic** - one logical change per migration
5. **Test rollback** - ensure down migrations work correctly
6. **Document changes** in commit messages and migration files

## Troubleshooting

### Migration Version Mismatch
If you see "Dirty database version" error:
```bash
# Check current version
migrate -path backend/migrations -database "postgresql://..." version

# Force to a specific version (use with caution)
migrate -path backend/migrations -database "postgresql://..." force VERSION
```

### Connection Issues
- Ensure PostgreSQL is running: `docker compose ps`
- Check connection settings in `.env` file
- Verify database exists: `psql -h localhost -U clipper -l`

### Reset Database
To completely reset the database:
```bash
# Stop and remove containers with volumes
docker compose down -v

# Start fresh
docker compose up -d

# Wait for PostgreSQL to be ready
sleep 5

# Run migrations
make migrate-up

# (Optional) Seed data
make migrate-seed
```
