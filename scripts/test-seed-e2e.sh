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

# ========== Seed Subscription for test user ==========
echo "[E2E Seed] Seeding premium subscription for user1_e2e..."

USER1_ID=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM users WHERE username = 'user1_e2e' LIMIT 1;")
USER2_ID=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM users WHERE username = 'user2_e2e' LIMIT 1;")

if [ -n "$USER1_ID" ]; then
  USER1_ID=$(echo "$USER1_ID" | xargs)
  run_sql "
    INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, tier, current_period_start, current_period_end)
    VALUES ('$USER1_ID', 'cus_e2e_test', 'sub_e2e_test', 'price_e2e_monthly', 'active', 'pro', NOW() - INTERVAL '1 day', NOW() + INTERVAL '27 days')
    ON CONFLICT (user_id) DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_price_id = EXCLUDED.stripe_price_id,
      status = EXCLUDED.status,
      tier = EXCLUDED.tier,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = FALSE,
      canceled_at = NULL,
      trial_start = NULL,
      trial_end = NULL;
  "
else
  echo "[E2E Seed] Warning: user1_e2e not found; subscription seed skipped."
fi

# ========== Seed Chat Channel ==========
echo "[E2E Seed] Seeding chat channel for test users..."

CHANNEL_NAME="e2e-general"
run_sql "
INSERT INTO chat_channels (name, description, creator_id, channel_type, max_participants, is_active, created_at, updated_at)
SELECT '$CHANNEL_NAME', 'E2E seeded general channel', '$USER1_ID', 'public', 200, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM chat_channels WHERE name = '$CHANNEL_NAME');
"

CHANNEL_ID=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM chat_channels WHERE name = '$CHANNEL_NAME' LIMIT 1;")
CHANNEL_ID=$(echo "$CHANNEL_ID" | xargs)

if [ -n "$CHANNEL_ID" ]; then
  run_sql "INSERT INTO channel_members (channel_id, user_id, role, joined_at) VALUES ('$CHANNEL_ID', '$USER1_ID', 'owner', NOW()) ON CONFLICT DO NOTHING;"
  if [ -n "$USER2_ID" ]; then
    USER2_ID=$(echo "$USER2_ID" | xargs)
    run_sql "INSERT INTO channel_members (channel_id, user_id, role, joined_at) VALUES ('$CHANNEL_ID', '$USER2_ID', 'member', NOW()) ON CONFLICT DO NOTHING;"
  fi
fi

# ========== Seed Premium Subscriptions ==========
echo "[E2E Seed] Skipping premium subscriptions (Stripe schema varies by deployment)..."

echo "[E2E Seed] Premium subscriptions skipped."

# ========== Seed Clips ==========
echo "[E2E Seed] Seeding clips..."

CREATOR_ID=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM users WHERE username = 'creator_e2e' LIMIT 1;")

# Insert 5 sample clips with keyword-rich titles for E2E search assertions
clip_data=(
  "11111111-1111-1111-1111-111111111111|clip_e2e_1|Gaming Highlights - E2E Clip 1|https://clips.twitch.tv/test-clip-1|https://embed.test/clip-1|valorant|Valorant|https://thumb.test/clip-1.jpg"
  "22222222-2222-2222-2222-222222222222|clip_e2e_2|High-Octane Gaming Clutch - E2E Clip 2|https://clips.twitch.tv/test-clip-2|https://embed.test/clip-2|apex_legends|Apex Legends|https://thumb.test/clip-2.jpg"
  "33333333-3333-3333-3333-333333333333|clip_e2e_3|Popular Game Montage - E2E Clip 3|https://clips.twitch.tv/test-clip-3|https://embed.test/clip-3|fortnite|Fortnite|https://thumb.test/clip-3.jpg"
  "44444444-4444-4444-4444-444444444444|clip_e2e_4|Recent Gaming Play - E2E Clip 4|https://clips.twitch.tv/test-clip-4|https://embed.test/clip-4|league_of_legends|League of Legends|https://thumb.test/clip-4.jpg"
  "55555555-5555-5555-5555-555555555555|clip_e2e_5|Test Clip Highlights - E2E Clip 5|https://clips.twitch.tv/test-clip-5|https://embed.test/clip-5|csgo|CS:GO|https://thumb.test/clip-5.jpg"
)

for idx in "${!clip_data[@]}"; do
  IFS='|' read -r CLIP_ID TWITCH_CLIP_ID TITLE URL EMBED_URL GAME_ID GAME_NAME THUMB_URL <<< "${clip_data[$idx]}"
  VIEW_COUNT=$((200 - (10 * idx)))
  VOTE_SCORE=$((10 - idx))
  DAYS_AGO=$((idx + 1))
  BROADCASTER_ID="twitch_broadcaster_$((idx + 1))"

  run_sql "
  INSERT INTO clips (id, twitch_clip_id, twitch_clip_url, embed_url, title, creator_name, creator_id, broadcaster_name, broadcaster_id, game_id, game_name, language, thumbnail_url, duration, view_count, created_at, imported_at, vote_score, is_featured, is_nsfw, is_removed)
  VALUES ('$CLIP_ID', '$TWITCH_CLIP_ID', '$URL', '$EMBED_URL', '$TITLE', 'creator_e2e', '$CREATOR_ID', 'test_broadcaster', '$BROADCASTER_ID', '$GAME_ID', '$GAME_NAME', 'en', '$THUMB_URL', 60, $VIEW_COUNT, NOW() - INTERVAL '${DAYS_AGO} days', NOW() - INTERVAL '${DAYS_AGO} days', $VOTE_SCORE, false, false, false)
  ON CONFLICT (twitch_clip_id) DO UPDATE SET
    title = EXCLUDED.title,
    twitch_clip_url = EXCLUDED.twitch_clip_url,
    embed_url = EXCLUDED.embed_url,
    game_id = EXCLUDED.game_id,
    game_name = EXCLUDED.game_name,
    thumbnail_url = EXCLUDED.thumbnail_url,
    view_count = EXCLUDED.view_count,
    vote_score = EXCLUDED.vote_score,
    broadcaster_name = EXCLUDED.broadcaster_name,
    broadcaster_id = EXCLUDED.broadcaster_id,
    creator_id = EXCLUDED.creator_id,
    creator_name = EXCLUDED.creator_name,
    language = EXCLUDED.language,
    is_featured = false,
    is_nsfw = false,
    is_removed = false;
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

# ========== Seed Submission Fixtures ==========
echo "[E2E Seed] Seeding submission fixtures for duplicate/rate-limit tests..."

if [ -n "$USER1_ID" ]; then
  USER1_ID=$(echo "$USER1_ID" | xargs)
  run_sql "
    INSERT INTO clip_submissions (
      id, user_id, twitch_clip_id, twitch_clip_url, title, custom_title,
      tags, is_nsfw, submission_reason, status,
      creator_name, creator_id, broadcaster_name, broadcaster_id, broadcaster_name_override,
      game_id, game_name, thumbnail_url, duration, view_count,
      created_at, updated_at
    ) VALUES (
      '66666666-6666-6666-6666-666666666666', '$USER1_ID', 'dup_pending_e2e', 'https://clips.twitch.tv/dup_pending_e2e',
      'E2E Pending Duplicate Clip', NULL, ARRAY['e2e','pending'], false, 'E2E pending duplicate fixture', 'pending',
      'creator_e2e', NULL, 'test_broadcaster', NULL, NULL,
      NULL, 'Valorant', 'https://thumb.test/pending.jpg', 60, 10,
      NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
    )
    ON CONFLICT (id) DO NOTHING;
  "
fi

# ========== Seed Social Fixtures ==========
echo "[E2E Seed] Seeding social fixtures (relationships, votes, playlists)..."

CLIP1_ID="11111111-1111-1111-1111-111111111111"
CLIP2_ID="22222222-2222-2222-2222-222222222222"
PLAYLIST_ID="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

if [ -n "$USER1_ID" ]; then
  USER1_ID=$(echo "$USER1_ID" | xargs)

  # Seed a vote for user1 on the first clip (upvote)
  run_sql "
    INSERT INTO votes (user_id, clip_id, vote_type, created_at)
    VALUES ('$USER1_ID', '$CLIP1_ID', 1, NOW())
    ON CONFLICT (user_id, clip_id) DO UPDATE SET vote_type = EXCLUDED.vote_type, created_at = LEAST(votes.created_at, EXCLUDED.created_at);
  "

  # Seed a stream follow relationship for notifications
  run_sql "
    INSERT INTO stream_follows (user_id, streamer_username, notifications_enabled, created_at, updated_at)
    VALUES ('$USER1_ID', 'streamer_e2e', true, NOW(), NOW())
    ON CONFLICT (user_id, streamer_username) DO UPDATE SET notifications_enabled = EXCLUDED.notifications_enabled, updated_at = NOW();
  "

  # Seed a public playlist with two clips
  run_sql "
    INSERT INTO playlists (id, user_id, title, description, cover_url, visibility, share_token, view_count, share_count, like_count, created_at, updated_at)
    VALUES ('$PLAYLIST_ID', '$USER1_ID', 'E2E Favorites', 'Seeded playlist for social flows', 'https://images.test/playlist-cover.jpg', 'public', 'e2e-share-token', 5, 1, 1, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      cover_url = EXCLUDED.cover_url,
      visibility = EXCLUDED.visibility,
      share_token = EXCLUDED.share_token,
      updated_at = NOW();
  "

  # Add clips to the playlist with deterministic ordering
  run_sql "INSERT INTO playlist_items (playlist_id, clip_id, order_index, added_at) VALUES ('$PLAYLIST_ID', '$CLIP1_ID', 1, NOW()) ON CONFLICT DO NOTHING;"
  run_sql "INSERT INTO playlist_items (playlist_id, clip_id, order_index, added_at) VALUES ('$PLAYLIST_ID', '$CLIP2_ID', 2, NOW()) ON CONFLICT DO NOTHING;"

  # Seed a playlist like for user1
  run_sql "
    INSERT INTO playlist_likes (user_id, playlist_id, created_at)
    VALUES ('$USER1_ID', '$PLAYLIST_ID', NOW())
    ON CONFLICT (user_id, playlist_id) DO NOTHING;
  "

  # Sync aggregate counts
  run_sql "
    UPDATE playlists
    SET like_count = (SELECT COUNT(*) FROM playlist_likes WHERE playlist_id = '$PLAYLIST_ID'),
        view_count = GREATEST(view_count, 5),
        share_count = GREATEST(share_count, 1),
        updated_at = NOW()
    WHERE id = '$PLAYLIST_ID';
  "
fi

echo "[E2E Seed] ✓ Test data seeding complete."
