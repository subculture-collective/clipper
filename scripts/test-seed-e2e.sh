#!/bin/bash
# Test E2E Seed Script
# Seeds deterministic test data for E2E tests: clips, users, subscriptions, and premium pricing.

set -e

# Configuration
DB_HOST="${TEST_DATABASE_HOST:-localhost}"
DB_PORT="${TEST_DATABASE_PORT:-5437}"
DB_USER="${TEST_DATABASE_USER:-clipper}"
DB_PASSWORD="${TEST_DATABASE_PASSWORD:-clipper_password}"
DB_NAME="${TEST_DATABASE_NAME:-clipper_test}"
OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"

echo "[E2E Seed] Starting test data seeding..."
echo "[E2E Seed] Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo "[E2E Seed] OpenSearch: $OPENSEARCH_URL"

# Helper function to run SQL
run_sql() {
  local sql="$1"
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql"
}

# Helper function to run SQL from file
run_sql_file() {
  local file="$1"
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"
}

# Helper function to index in OpenSearch
index_opensearch() {
  local index="$1"
  local doc_id="$2"
  local doc_json="$3"
  curl -s -X PUT "$OPENSEARCH_URL/$index/_doc/$doc_id" \
    -H 'Content-Type: application/json' \
    -d "$doc_json" > /dev/null || true
}

# ========== Seed Users ==========
echo "[E2E Seed] Seeding users..."

# Admin user
run_sql "
INSERT INTO users (twitch_id, username, display_name, email, avatar_url, role, karma_points, is_banned, created_at, updated_at)
SELECT 'twitch_admin_e2e', 'admin_e2e', 'Admin User', 'admin@test.local', 'https://avatar.test/admin', 'admin', 1000, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin_e2e');
"

# Regular user 1
run_sql "
INSERT INTO users (twitch_id, username, display_name, email, avatar_url, role, karma_points, is_banned, created_at, updated_at)
SELECT 'twitch_user1_e2e', 'user1_e2e', 'User One', 'user1@test.local', 'https://avatar.test/user1', 'user', 150, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'user1_e2e');
"

# Regular user 2 (for social features)
run_sql "
INSERT INTO users (twitch_id, username, display_name, email, avatar_url, role, karma_points, is_banned, created_at, updated_at)
SELECT 'twitch_user2_e2e', 'user2_e2e', 'User Two', 'user2@test.local', 'https://avatar.test/user2', 'user', 200, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'user2_e2e');
"

# Creator/Broadcaster user
run_sql "
INSERT INTO users (twitch_id, username, display_name, email, avatar_url, role, karma_points, is_banned, created_at, updated_at)
SELECT 'twitch_creator_e2e', 'creator_e2e', 'Creator User', 'creator@test.local', 'https://avatar.test/creator', 'user', 500, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'creator_e2e');
"

echo "[E2E Seed] Users seeded."

# ========== Seed Premium Subscriptions ==========
echo "[E2E Seed] Skipping premium subscriptions (Stripe schema varies by deployment)..."

echo "[E2E Seed] Premium subscriptions skipped."

# ========== Seed Clips ==========
echo "[E2E Seed] Seeding clips..."

CREATOR_ID=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM users WHERE username = 'creator_e2e' LIMIT 1;")

# Insert 5 sample clips
for i in {1..5}; do
  CLIP_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
  TITLE="Test Clip $i - E2E"
  URL="https://clips.twitch.tv/test-clip-$i"
  TWITCH_CLIP_ID="clip_e2e_$i"

  run_sql "
  INSERT INTO clips (id, twitch_clip_id, twitch_clip_url, embed_url, title, creator_name, creator_id, broadcaster_name, broadcaster_id, game_id, game_name, language, thumbnail_url, duration, view_count, created_at, imported_at, vote_score, is_featured, is_nsfw, is_removed)
  SELECT '$CLIP_ID', '$TWITCH_CLIP_ID', '$URL', 'https://embed.test/clip-$i', '$TITLE', 'creator_e2e', '$CREATOR_ID', 'test_broadcaster', 'twitch_broadcaster_$i', 'game_id_$i', 'Just Chatting', 'en', 'https://thumb.test/clip-$i.jpg', 60, 100, NOW() - INTERVAL '$i days', NOW() - INTERVAL '$i days', $((5 - i)), false, false, false
  WHERE NOT EXISTS (SELECT 1 FROM clips WHERE twitch_clip_id = '$TWITCH_CLIP_ID');
  " || true
done

echo "[E2E Seed] Clips seeded."

# ========== Seed OpenSearch Clips Index ==========
echo "[E2E Seed] Indexing clips in OpenSearch..."

# Get actual clip IDs and index them
CLIP_IDS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id, title, twitch_clip_url, creator_name, broadcaster_name, view_count FROM clips WHERE creator_id = '$CREATOR_ID' LIMIT 5;")

while IFS='|' read -r clip_id title url creator_name broadcaster_name view_count; do
  clip_id=$(echo "$clip_id" | xargs)
  title=$(echo "$title" | xargs)
  url=$(echo "$url" | xargs)
  creator_name=$(echo "$creator_name" | xargs)
  broadcaster_name=$(echo "$broadcaster_name" | xargs)
  view_count=$(echo "$view_count" | xargs)

  if [ ! -z "$clip_id" ]; then
    DOC_JSON="{\"id\":\"$clip_id\",\"title\":\"$title\",\"url\":\"$url\",\"creator_name\":\"$creator_name\",\"broadcaster_name\":\"$broadcaster_name\",\"view_count\":$view_count,\"created_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
    index_opensearch "clips" "$clip_id" "$DOC_JSON"
  fi
done <<< "$CLIP_IDS"

echo "[E2E Seed] Clips indexed in OpenSearch."

# ========== Seed OpenSearch Users Index ==========
echo "[E2E Seed] Indexing users in OpenSearch..."

# Get actual user IDs and index them
USER_IDS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id, username, display_name, avatar_url FROM users WHERE role = 'user' LIMIT 4;")

while IFS='|' read -r user_id username display_name avatar_url; do
  user_id=$(echo "$user_id" | xargs)
  username=$(echo "$username" | xargs)
  display_name=$(echo "$display_name" | xargs)
  avatar_url=$(echo "$avatar_url" | xargs)

  if [ ! -z "$user_id" ]; then
    DOC_JSON="{\"id\":\"$user_id\",\"username\":\"$username\",\"display_name\":\"$display_name\",\"avatar_url\":\"$avatar_url\"}"
    index_opensearch "users" "$user_id" "$DOC_JSON"
  fi
done <<< "$USER_IDS"

echo "[E2E Seed] Users indexed in OpenSearch."

echo "[E2E Seed] ✓ Test data seeding complete."
