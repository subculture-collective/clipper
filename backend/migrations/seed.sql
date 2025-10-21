-- Seed data for development environment
-- This file should be run after the initial schema migration

-- Insert sample users
INSERT INTO users (twitch_id, username, display_name, email, avatar_url, bio, karma_points, role) VALUES
('12345', 'testuser1', 'Test User 1', 'testuser1@example.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar1.png', 'This is a test user bio', 100, 'user'),
('12346', 'testuser2', 'Test User 2', 'testuser2@example.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar2.png', 'Another test user', 50, 'user'),
('12347', 'testmod', 'Test Moderator', 'testmod@example.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar3.png', 'I am a moderator', 500, 'moderator'),
('12348', 'testadmin', 'Test Admin', 'testadmin@example.com', 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar4.png', 'I am an admin', 1000, 'admin');

-- Insert sample tags
INSERT INTO tags (name, slug, description, color, usage_count) VALUES
('Funny', 'funny', 'Humorous and entertaining clips', '#FFD700', 0),
('Epic', 'epic', 'Epic moments and achievements', '#FF6B6B', 0),
('Fail', 'fail', 'Funny fails and mishaps', '#4ECDC4', 0),
('Highlight', 'highlight', 'Best gameplay moments', '#95E1D3', 0),
('Creative', 'creative', 'Creative and artistic content', '#F38181', 0),
('Speedrun', 'speedrun', 'Speedrunning moments', '#AA96DA', 0),
('PvP', 'pvp', 'Player vs Player action', '#FCBAD3', 0),
('Tutorial', 'tutorial', 'Educational and tutorial content', '#FFFFD2', 0);

-- Insert sample clips
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
) VALUES
(
    'AwkwardHelplessSalamanderSwiftRage',
    'https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage',
    'https://clips.twitch.tv/embed?clip=AwkwardHelplessSalamanderSwiftRage',
    'Amazing play!',
    'testuser1',
    '12345',
    'xQc',
    '71092938',
    '32982',
    'Grand Theft Auto V',
    'en',
    'https://clips-media-assets2.twitch.tv/thumbnail.jpg',
    30.5,
    1000,
    NOW() - INTERVAL '2 hours',
    0,
    0,
    0
),
(
    'ClumsyBrightGorillaJebaited',
    'https://clips.twitch.tv/ClumsyBrightGorillaJebaited',
    'https://clips.twitch.tv/embed?clip=ClumsyBrightGorillaJebaited',
    'Epic fail moment',
    'testuser2',
    '12346',
    'Shroud',
    '37402112',
    '511224',
    'Valorant',
    'en',
    'https://clips-media-assets2.twitch.tv/thumbnail2.jpg',
    25.0,
    2500,
    NOW() - INTERVAL '5 hours',
    0,
    0,
    0
),
(
    'EnchantingAttractiveSandwichGingerPower',
    'https://clips.twitch.tv/EnchantingAttractiveSandwichGingerPower',
    'https://clips.twitch.tv/embed?clip=EnchantingAttractiveSandwichGingerPower',
    'Insane clutch!',
    'testmod',
    '12347',
    's1mple',
    '67700072',
    '32399',
    'Counter-Strike 2',
    'en',
    'https://clips-media-assets2.twitch.tv/thumbnail3.jpg',
    45.0,
    5000,
    NOW() - INTERVAL '1 day',
    0,
    0,
    0
),
(
    'DifficultRepleteCheetahNomNom',
    'https://clips.twitch.tv/DifficultRepleteCheetahNomNom',
    'https://clips.twitch.tv/embed?clip=DifficultRepleteCheetahNomNom',
    'Funny moment',
    'testuser1',
    '12345',
    'Pokimane',
    '23936415',
    '509658',
    'Just Chatting',
    'en',
    'https://clips-media-assets2.twitch.tv/thumbnail4.jpg',
    20.0,
    3500,
    NOW() - INTERVAL '3 days',
    0,
    0,
    0
);

-- Get clip IDs for seeding relationships
DO $$
DECLARE
    clip1_id UUID;
    clip2_id UUID;
    clip3_id UUID;
    clip4_id UUID;
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
    user4_id UUID;
    tag1_id UUID;
    tag2_id UUID;
    tag3_id UUID;
    tag4_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO user1_id FROM users WHERE twitch_id = '12345';
    SELECT id INTO user2_id FROM users WHERE twitch_id = '12346';
    SELECT id INTO user3_id FROM users WHERE twitch_id = '12347';
    SELECT id INTO user4_id FROM users WHERE twitch_id = '12348';
    
    -- Get clip IDs
    SELECT id INTO clip1_id FROM clips WHERE twitch_clip_id = 'AwkwardHelplessSalamanderSwiftRage';
    SELECT id INTO clip2_id FROM clips WHERE twitch_clip_id = 'ClumsyBrightGorillaJebaited';
    SELECT id INTO clip3_id FROM clips WHERE twitch_clip_id = 'EnchantingAttractiveSandwichGingerPower';
    SELECT id INTO clip4_id FROM clips WHERE twitch_clip_id = 'DifficultRepleteCheetahNomNom';
    
    -- Get tag IDs
    SELECT id INTO tag1_id FROM tags WHERE slug = 'funny';
    SELECT id INTO tag2_id FROM tags WHERE slug = 'epic';
    SELECT id INTO tag3_id FROM tags WHERE slug = 'fail';
    SELECT id INTO tag4_id FROM tags WHERE slug = 'highlight';
    
    -- Insert votes
    INSERT INTO votes (user_id, clip_id, vote_type) VALUES
        (user1_id, clip2_id, 1),
        (user1_id, clip3_id, 1),
        (user2_id, clip1_id, 1),
        (user2_id, clip3_id, 1),
        (user2_id, clip4_id, -1),
        (user3_id, clip1_id, 1),
        (user3_id, clip2_id, 1),
        (user3_id, clip3_id, 1),
        (user4_id, clip3_id, 1);
    
    -- Insert comments
    INSERT INTO comments (clip_id, user_id, content) VALUES
        (clip1_id, user2_id, 'This is an amazing clip!'),
        (clip1_id, user3_id, 'Wow, so good!'),
        (clip2_id, user1_id, 'LOL that was hilarious'),
        (clip3_id, user2_id, 'Best play I have ever seen'),
        (clip3_id, user4_id, 'Insane skills!');
    
    -- Insert favorites
    INSERT INTO favorites (user_id, clip_id) VALUES
        (user1_id, clip2_id),
        (user1_id, clip3_id),
        (user2_id, clip3_id),
        (user3_id, clip1_id),
        (user3_id, clip3_id);
    
    -- Insert clip tags
    INSERT INTO clip_tags (clip_id, tag_id) VALUES
        (clip1_id, tag2_id), -- Epic
        (clip1_id, tag4_id), -- Highlight
        (clip2_id, tag1_id), -- Funny
        (clip2_id, tag3_id), -- Fail
        (clip3_id, tag2_id), -- Epic
        (clip3_id, tag4_id), -- Highlight
        (clip4_id, tag1_id); -- Funny
END $$;
