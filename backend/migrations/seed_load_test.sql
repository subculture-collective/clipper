-- Enhanced seed data for load testing
-- This file generates realistic test data for K6 load testing scenarios
-- Run after migrations: make migrate-up && psql ... -f backend/migrations/seed_load_test.sql

-- Start a transaction
BEGIN;

-- Insert test users with varying karma levels
INSERT INTO users (twitch_id, username, display_name, email, avatar_url, bio, karma_points, role) VALUES
-- Regular users
('100001', 'gamer_pro', 'Pro Gamer', 'gamer_pro@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar1.png', 'Professional gamer and streamer', 250, 'user'),
('100002', 'clip_hunter', 'Clip Hunter', 'clip_hunter@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar2.png', 'I hunt for the best clips', 180, 'user'),
('100003', 'speedrun_king', 'Speedrun King', 'speedrun_king@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar3.png', 'Speedrun enthusiast', 320, 'user'),
('100004', 'casual_viewer', 'Casual Viewer', 'casual_viewer@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar4.png', 'Just here for fun', 45, 'user'),
('100005', 'esports_fan', 'Esports Fan', 'esports_fan@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar5.png', 'Love competitive gaming', 150, 'user'),
('100006', 'variety_streamer', 'Variety Streamer', 'variety_streamer@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar6.png', 'Plays everything', 200, 'user'),
('100007', 'meme_lord', 'Meme Lord', 'meme_lord@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar7.png', 'Master of memes', 90, 'user'),
('100008', 'tournament_watch', 'Tournament Watcher', 'tournament_watch@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar8.png', 'Never miss a tournament', 175, 'user'),
('100009', 'irl_enjoyer', 'IRL Enjoyer', 'irl_enjoyer@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar9.png', 'IRL streams are the best', 65, 'user'),
('100010', 'music_lover', 'Music Lover', 'music_lover@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar10.png', 'Here for music streams', 110, 'user'),
-- Moderators
('100011', 'community_mod', 'Community Mod', 'community_mod@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar11.png', 'Keeping the community safe', 600, 'moderator'),
('100012', 'clip_curator', 'Clip Curator', 'clip_curator@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar12.png', 'Curating the best content', 550, 'moderator'),
-- Admin
('100013', 'site_admin', 'Site Admin', 'site_admin@test.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar13.png', 'Site administrator', 1200, 'admin')
ON CONFLICT (twitch_id) DO NOTHING;

-- Insert additional tags for variety
INSERT INTO tags (name, slug, description, color, usage_count) VALUES
('Clutch', 'clutch', 'Amazing clutch moments', '#FF4444', 0),
('Comeback', 'comeback', 'Epic comeback plays', '#44FF44', 0),
('Rage', 'rage', 'Funny rage moments', '#FF8800', 0),
('Wholesome', 'wholesome', 'Heartwarming content', '#FFB6C1', 0),
('Skill', 'skill', 'High skill plays', '#4169E1', 0),
('Luck', 'luck', 'Lucky moments', '#FFD700', 0),
('Glitch', 'glitch', 'Game glitches and bugs', '#8B008B', 0),
('Stream Sniping', 'stream-sniping', 'Stream sniper moments', '#DC143C', 0),
('First Time', 'first-time', 'First time achievements', '#00CED1', 0),
('World Record', 'world-record', 'World record attempts', '#FF1493', 0)
ON CONFLICT (slug) DO NOTHING;

-- Popular games for realistic data
DO $$
DECLARE
    games TEXT[][] := ARRAY[
        ARRAY['League of Legends', '21779'],
        ARRAY['Valorant', '516575'],
        ARRAY['Counter-Strike 2', '32399'],
        ARRAY['Fortnite', '33214'],
        ARRAY['Minecraft', '27471'],
        ARRAY['Grand Theft Auto V', '32982'],
        ARRAY['Dota 2', '29595'],
        ARRAY['Apex Legends', '511224'],
        ARRAY['Call of Duty: Warzone', '512710'],
        ARRAY['Overwatch 2', '515025'],
        ARRAY['Rocket League', '30921'],
        ARRAY['Just Chatting', '509658'],
        ARRAY['Elden Ring', '512953'],
        ARRAY['World of Warcraft', '18122'],
        ARRAY['Teamfight Tactics', '513143']
    ];
    
    broadcasters TEXT[][] := ARRAY[
        ARRAY['xQc', '71092938'],
        ARRAY['Pokimane', '23936415'],
        ARRAY['Shroud', '37402112'],
        ARRAY['s1mple', '67700072'],
        ARRAY['TenZ', '408892348'],
        ARRAY['Tyler1', '37984782'],
        ARRAY['summit1g', '26490481'],
        ARRAY['TimTheTatman', '35740721'],
        ARRAY['DrDisrespect', '157723493'],
        ARRAY['Sykkuno', '38649914'],
        ARRAY['Valkyrae', '141104404'],
        ARRAY['HasanAbi', '130185352'],
        ARRAY['Ludwig', '27994674'],
        ARRAY['Myth', '36639292'],
        ARRAY['Ninja', '19571641']
    ];
    
    titles TEXT[] := ARRAY[
        'Insane clutch!',
        'Epic fail moment',
        'You won''t believe this',
        'Perfect timing',
        'Best play of the day',
        'This is why I love this game',
        'Unbelievable shot',
        'Huge comeback',
        'Most intense moment',
        'Watch till the end',
        'Pro level play',
        'Can''t stop laughing',
        'This guy is too good',
        'RNG at its finest',
        'Calculated.',
        'What just happened?',
        'Instant karma',
        'Big brain play',
        'That was lucky',
        'Absolutely destroyed',
        'Tournament winning play',
        'Fastest speedrun',
        'New world record?',
        'Chat going wild',
        'Streamer got owned',
        'Amazing teamwork',
        'Solo carry',
        'One in a million',
        'Pure skill on display',
        'Broken mechanic',
        'Developers hate this',
        'Wholesome moment',
        'Rage quit incoming',
        'How is that even possible?',
        'Perfectly executed',
        'Stream highlight',
        'This deserves more views',
        'Underrated clip',
        'Viral moment',
        'Hall of fame worthy'
    ];
    
    i INT;
    game_idx INT;
    broadcaster_idx INT;
    title_idx INT;
    clip_id_str TEXT;
    view_count_val INT;
    duration_val NUMERIC;
    hours_ago INT;
BEGIN
    -- Generate 60 clips with realistic variety
    FOR i IN 1..60 LOOP
        game_idx := (i % 15) + 1;
        broadcaster_idx := (i % 15) + 1;
        title_idx := (i % 40) + 1;
        clip_id_str := 'LoadTest' || LPAD(i::TEXT, 5, '0') || 'ClipID';
        view_count_val := (RANDOM() * 10000 + 500)::INT;
        duration_val := (RANDOM() * 50 + 15)::NUMERIC(5,2);
        hours_ago := (RANDOM() * 168)::INT; -- Random time within last week
        
        INSERT INTO clips (
            twitch_clip_id,
            twitch_clip_url,
            embed_url,
            title,
            creator_name,
            creator_id,
            broadcaster_name,
            broadcaster_id,
            game_id,
            game_name,
            language,
            thumbnail_url,
            duration,
            view_count,
            created_at,
            vote_score,
            comment_count,
            favorite_count
        ) VALUES (
            clip_id_str,
            'https://clips.twitch.tv/' || clip_id_str,
            'https://clips.twitch.tv/embed?clip=' || clip_id_str,
            titles[title_idx],
            'testuser' || ((i % 10) + 1),
            '10000' || ((i % 10) + 1),
            broadcasters[broadcaster_idx][1],
            broadcasters[broadcaster_idx][2],
            games[game_idx][2],
            games[game_idx][1],
            'en',
            'https://clips-media-assets2.twitch.tv/thumbnail-' || i || '.jpg',
            duration_val,
            view_count_val,
            NOW() - (hours_ago || ' hours')::INTERVAL,
            0,
            0,
            0
        ) ON CONFLICT (twitch_clip_id) DO NOTHING;
    END LOOP;
END $$;

-- Add votes, comments, favorites, and tags to clips
DO $$
DECLARE
    clip_record RECORD;
    user_record RECORD;
    tag_record RECORD;
    num_votes INT;
    num_comments INT;
    num_favorites INT;
    num_tags INT;
    i INT;
    vote_type_val INT;
    comment_texts TEXT[] := ARRAY[
        'Amazing!',
        'This is so good!',
        'LOL',
        'Insane play',
        'How did they do that?',
        'Best clip today',
        'Underrated',
        'This deserves more upvotes',
        'Chat was going crazy',
        'I was there PogChamp',
        'Wow just wow',
        'No way this is real',
        'Calculated',
        'Pure skill',
        'That was lucky',
        'So wholesome',
        'Made my day',
        'Thanks for sharing',
        'Epic moment',
        'I can''t stop watching this'
    ];
BEGIN
    -- For each clip, add random votes, comments, favorites, and tags
    FOR clip_record IN SELECT id FROM clips WHERE twitch_clip_id LIKE 'LoadTest%' LOOP
        -- Add 5-20 random votes per clip
        num_votes := (RANDOM() * 15 + 5)::INT;
        FOR i IN 1..num_votes LOOP
            -- Random user
            SELECT id INTO user_record FROM users WHERE twitch_id LIKE '1000%' ORDER BY RANDOM() LIMIT 1;
            -- Random vote type (more upvotes than downvotes)
            vote_type_val := CASE WHEN RANDOM() < 0.75 THEN 1 ELSE -1 END;
            
            INSERT INTO votes (user_id, clip_id, vote_type)
            VALUES (user_record.id, clip_record.id, vote_type_val)
            ON CONFLICT (user_id, clip_id) DO NOTHING;
        END LOOP;
        
        -- Add 0-8 random comments per clip
        num_comments := (RANDOM() * 8)::INT;
        FOR i IN 1..num_comments LOOP
            SELECT id INTO user_record FROM users WHERE twitch_id LIKE '1000%' ORDER BY RANDOM() LIMIT 1;
            
            INSERT INTO comments (clip_id, user_id, content)
            VALUES (clip_record.id, user_record.id, comment_texts[(RANDOM() * 19 + 1)::INT]);
        END LOOP;
        
        -- Add 0-5 favorites per clip
        num_favorites := (RANDOM() * 5)::INT;
        FOR i IN 1..num_favorites LOOP
            SELECT id INTO user_record FROM users WHERE twitch_id LIKE '1000%' ORDER BY RANDOM() LIMIT 1;
            
            INSERT INTO favorites (user_id, clip_id)
            VALUES (user_record.id, clip_record.id)
            ON CONFLICT (user_id, clip_id) DO NOTHING;
        END LOOP;
        
        -- Add 1-4 random tags per clip
        num_tags := (RANDOM() * 3 + 1)::INT;
        FOR i IN 1..num_tags LOOP
            SELECT id INTO tag_record FROM tags ORDER BY RANDOM() LIMIT 1;
            
            INSERT INTO clip_tags (clip_id, tag_id)
            VALUES (clip_record.id, tag_record.id)
            ON CONFLICT (clip_id, tag_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Update clip statistics
UPDATE clips SET
    vote_score = (SELECT COALESCE(SUM(vote_type), 0) FROM votes WHERE clip_id = clips.id),
    comment_count = (SELECT COUNT(*) FROM comments WHERE clip_id = clips.id),
    favorite_count = (SELECT COUNT(*) FROM favorites WHERE clip_id = clips.id)
WHERE twitch_clip_id LIKE 'LoadTest%';

-- Update tag usage counts
UPDATE tags SET usage_count = (
    SELECT COUNT(*) FROM clip_tags WHERE tag_id = tags.id
);

-- Add some comment votes
DO $$
DECLARE
    comment_record RECORD;
    user_record RECORD;
    num_votes INT;
    i INT;
BEGIN
    FOR comment_record IN SELECT id FROM comments LIMIT 30 LOOP
        num_votes := (RANDOM() * 5)::INT;
        FOR i IN 1..num_votes LOOP
            SELECT id INTO user_record FROM users WHERE twitch_id LIKE '1000%' ORDER BY RANDOM() LIMIT 1;
            
            INSERT INTO comment_votes (user_id, comment_id, vote_type)
            VALUES (user_record.id, comment_record.id, CASE WHEN RANDOM() < 0.8 THEN 1 ELSE -1 END)
            ON CONFLICT (user_id, comment_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Commit the transaction
COMMIT;

-- Display seeded data summary
SELECT 
    'Users' as entity,
    COUNT(*) as count
FROM users WHERE twitch_id LIKE '1000%'
UNION ALL
SELECT 
    'Clips',
    COUNT(*)
FROM clips WHERE twitch_clip_id LIKE 'LoadTest%'
UNION ALL
SELECT 
    'Tags',
    COUNT(*)
FROM tags
UNION ALL
SELECT 
    'Votes',
    COUNT(*)
FROM votes
UNION ALL
SELECT 
    'Comments',
    COUNT(*)
FROM comments
UNION ALL
SELECT 
    'Favorites',
    COUNT(*)
FROM favorites
UNION ALL
SELECT 
    'Clip Tags',
    COUNT(*)
FROM clip_tags;
