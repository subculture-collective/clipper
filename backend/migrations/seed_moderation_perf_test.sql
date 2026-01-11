-- Seed data for moderation performance and load testing
-- This file generates large datasets for testing moderation systems at scale
-- Run after migrations: psql ... -f backend/migrations/seed_moderation_perf_test.sql

BEGIN;

-- Step 1: Create test users for moderation testing
-- We need moderators, regular users, and banned users
INSERT INTO users (twitch_id, username, display_name, email, avatar_url, role, karma_points)
SELECT 
    'perf_mod_' || generate_series::text,
    'moderator_' || generate_series::text,
    'Moderator ' || generate_series::text,
    'moderator_' || generate_series::text || '@perftest.com',
    'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar' || (generate_series % 100)::text || '.png',
    CASE 
        WHEN generate_series = 1 THEN 'admin'
        WHEN generate_series <= 10 THEN 'moderator'
        ELSE 'user'
    END,
    (random() * 1000)::int
FROM generate_series(1, 50)
ON CONFLICT (twitch_id) DO NOTHING;

-- Create users that will be banned
INSERT INTO users (twitch_id, username, display_name, email, avatar_url, role, karma_points)
SELECT 
    'perf_banned_' || generate_series::text,
    'banned_user_' || generate_series::text,
    'Banned User ' || generate_series::text,
    'banned_' || generate_series::text || '@perftest.com',
    'https://static-cdn.jtvnw.net/jtv_user_pictures/banned' || (generate_series % 100)::text || '.png',
    'user',
    0
FROM generate_series(1, 15000)
ON CONFLICT (twitch_id) DO NOTHING;

-- Create channel owners for ban testing
INSERT INTO users (twitch_id, username, display_name, email, avatar_url, role, karma_points)
SELECT 
    'perf_channel_' || generate_series::text,
    'channel_owner_' || generate_series::text,
    'Channel Owner ' || generate_series::text,
    'channel_' || generate_series::text || '@perftest.com',
    'https://static-cdn.jtvnw.net/jtv_user_pictures/channel' || (generate_series % 100)::text || '.png',
    'user',
    (random() * 5000)::int
FROM generate_series(1, 20)
ON CONFLICT (twitch_id) DO NOTHING;

-- Step 2: Create Twitch auth records for channel owners (needed for ban sync)
INSERT INTO twitch_auth (user_id, twitch_user_id, access_token, refresh_token, expires_at, scopes)
SELECT 
    u.id,
    u.twitch_id,
    'perf_test_access_token_' || u.twitch_id,
    'perf_test_refresh_token_' || u.twitch_id,
    NOW() + INTERVAL '30 days',
    ARRAY['moderator:read:banned_users', 'moderator:manage:banned_users']
FROM users u
WHERE u.twitch_id LIKE 'perf_channel_%'
ON CONFLICT (user_id) DO UPDATE SET
    access_token = EXCLUDED.access_token,
    expires_at = EXCLUDED.expires_at;

-- Step 3: Create 10,000+ ban records for testing ban sync performance
-- These will be distributed across multiple channels
INSERT INTO twitch_bans (channel_id, banned_user_id, reason, banned_at, expires_at, synced_from_twitch, twitch_ban_id, last_synced_at)
SELECT 
    channel_user.id,
    banned_user.id,
    CASE 
        WHEN (gs % 10) = 0 THEN 'Spam'
        WHEN (gs % 10) = 1 THEN 'Harassment'
        WHEN (gs % 10) = 2 THEN 'Hate speech'
        WHEN (gs % 10) = 3 THEN 'Self-harm or suicide threats'
        WHEN (gs % 10) = 4 THEN 'Violence or threats'
        WHEN (gs % 10) = 5 THEN 'Impersonation'
        WHEN (gs % 10) = 6 THEN 'Scam or fraud'
        WHEN (gs % 10) = 7 THEN 'Sexually explicit content'
        WHEN (gs % 10) = 8 THEN 'Ban evasion'
        ELSE 'Other violations'
    END,
    NOW() - (random() * INTERVAL '365 days'),
    -- 80% permanent bans, 20% temporary (expired)
    CASE 
        WHEN (gs % 5) = 0 THEN NOW() - (random() * INTERVAL '30 days')
        ELSE NULL
    END,
    true,
    'twitch_ban_' || gs::text,
    NOW() - (random() * INTERVAL '7 days')
FROM generate_series(1, 12000) gs
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE twitch_id LIKE 'perf_channel_%' 
    ORDER BY random() LIMIT 1
) channel_user
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE twitch_id LIKE 'perf_banned_%' 
    ORDER BY random() LIMIT 1
) banned_user
ON CONFLICT DO NOTHING;

-- Step 4: Create moderation queue items for testing
INSERT INTO moderation_queue (content_type, content_id, reason, priority, status, reported_by, report_count, auto_flagged, confidence_score, assigned_to, reviewed_by, reviewed_at)
SELECT 
    CASE 
        WHEN (gs % 4) = 0 THEN 'clip'
        WHEN (gs % 4) = 1 THEN 'comment'
        WHEN (gs % 4) = 2 THEN 'user'
        ELSE 'submission'
    END,
    gen_random_uuid(),
    CASE 
        WHEN (gs % 8) = 0 THEN 'Inappropriate content'
        WHEN (gs % 8) = 1 THEN 'Spam'
        WHEN (gs % 8) = 2 THEN 'Copyright violation'
        WHEN (gs % 8) = 3 THEN 'Harassment'
        WHEN (gs % 8) = 4 THEN 'Hate speech'
        WHEN (gs % 8) = 5 THEN 'Misleading title'
        WHEN (gs % 8) = 6 THEN 'Off-topic'
        ELSE 'Other'
    END,
    CASE 
        WHEN (gs % 4) = 0 THEN 'critical'
        WHEN (gs % 4) = 1 THEN 'high'
        WHEN (gs % 4) = 2 THEN 'medium'
        ELSE 'low'
    END,
    CASE 
        WHEN (gs % 3) = 0 THEN 'pending'
        WHEN (gs % 3) = 1 THEN 'approved'
        ELSE 'rejected'
    END,
    reporter.id,
    (random() * 10 + 1)::int,
    (gs % 2) = 0,
    (random() * 0.3 + 0.7)::numeric(3,2),
    moderator.id,
    CASE WHEN (gs % 3) != 0 THEN reviewer.id ELSE NULL END,
    CASE WHEN (gs % 3) != 0 THEN NOW() - (random() * INTERVAL '30 days') ELSE NULL END
FROM generate_series(1, 5000) gs
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE twitch_id LIKE 'perf_mod_%' OR twitch_id LIKE 'perf_banned_%'
    ORDER BY random() LIMIT 1
) reporter
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role IN ('moderator', 'admin')
    ORDER BY random() LIMIT 1
) moderator
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role IN ('moderator', 'admin')
    ORDER BY random() LIMIT 1
) reviewer;

-- Step 5: Create 50,000+ audit log entries for query performance testing
INSERT INTO moderation_decisions (queue_item_id, moderator_id, action, reason, notes)
SELECT 
    queue_item.id,
    moderator.id,
    CASE 
        WHEN (gs % 4) = 0 THEN 'approve'
        WHEN (gs % 4) = 1 THEN 'reject'
        WHEN (gs % 4) = 2 THEN 'escalate'
        ELSE 'ban_user'
    END,
    CASE 
        WHEN (gs % 6) = 0 THEN 'Clear violation of guidelines'
        WHEN (gs % 6) = 1 THEN 'False report'
        WHEN (gs % 6) = 2 THEN 'Borderline case'
        WHEN (gs % 6) = 3 THEN 'Needs admin review'
        WHEN (gs % 6) = 4 THEN 'Repeated offense'
        ELSE 'Community reported'
    END,
    CASE 
        WHEN (gs % 10) = 0 THEN 'Additional context: ' || substr(md5(random()::text), 1, 50)
        ELSE NULL
    END
FROM generate_series(1, 55000) gs
CROSS JOIN LATERAL (
    SELECT id FROM moderation_queue 
    ORDER BY random() LIMIT 1
) queue_item
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role IN ('moderator', 'admin')
    ORDER BY random() LIMIT 1
) moderator;

-- Step 6: Create communities for moderation testing
INSERT INTO communities (name, slug, description, owner_id, is_public, member_count)
SELECT 
    'Perf Test Community ' || generate_series::text,
    'perf-test-community-' || generate_series::text,
    'Performance testing community for moderation features',
    owner.id,
    (generate_series % 2) = 0,
    (random() * 1000)::int
FROM generate_series(1, 20)
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE twitch_id LIKE 'perf_channel_%'
    ORDER BY random() LIMIT 1
) owner
ON CONFLICT (slug) DO NOTHING;

-- Step 7: Add community moderators for permission testing
INSERT INTO community_moderators (community_id, user_id, role, permissions, added_by)
SELECT 
    community.id,
    moderator.id,
    CASE 
        WHEN (gs % 3) = 0 THEN 'admin'
        WHEN (gs % 3) = 1 THEN 'moderator'
        ELSE 'contributor'
    END,
    ARRAY['manage_content', 'manage_members', 'view_reports']::text[],
    admin.id
FROM generate_series(1, 100) gs
CROSS JOIN LATERAL (
    SELECT id FROM communities WHERE slug LIKE 'perf-test-community-%'
    ORDER BY random() LIMIT 1
) community
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role IN ('moderator', 'admin')
    ORDER BY random() LIMIT 1
) moderator
CROSS JOIN LATERAL (
    SELECT id FROM users WHERE role = 'admin'
    ORDER BY random() LIMIT 1
) admin
ON CONFLICT (community_id, user_id) DO NOTHING;

-- Create indices to optimize performance testing queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_twitch_bans_channel_perf ON twitch_bans(channel_id, last_synced_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_twitch_bans_banned_user_perf ON twitch_bans(banned_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_decisions_moderator_perf ON moderation_decisions(moderator_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_decisions_action_perf ON moderation_decisions(action, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_queue_status_perf ON moderation_queue(status, priority, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_moderators_user_perf ON community_moderators(user_id);

-- Analyze tables for query optimization
ANALYZE twitch_bans;
ANALYZE moderation_decisions;
ANALYZE moderation_queue;
ANALYZE community_moderators;
ANALYZE users;

COMMIT;

-- Print summary
DO $$
DECLARE
    ban_count INTEGER;
    decision_count INTEGER;
    queue_count INTEGER;
    moderator_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ban_count FROM twitch_bans WHERE twitch_ban_id LIKE 'twitch_ban_%';
    SELECT COUNT(*) INTO decision_count FROM moderation_decisions;
    SELECT COUNT(*) INTO queue_count FROM moderation_queue;
    SELECT COUNT(*) INTO moderator_count FROM community_moderators;
    
    RAISE NOTICE '=== Moderation Performance Test Data Summary ===';
    RAISE NOTICE 'Ban records created: %', ban_count;
    RAISE NOTICE 'Audit log entries (decisions): %', decision_count;
    RAISE NOTICE 'Moderation queue items: %', queue_count;
    RAISE NOTICE 'Community moderators: %', moderator_count;
    RAISE NOTICE '============================================';
END $$;
