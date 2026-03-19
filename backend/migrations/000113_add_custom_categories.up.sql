-- Add custom topic categories alongside existing game categories
INSERT INTO categories (name, slug, description, icon, position, category_type, is_custom, is_featured)
VALUES
    ('News', 'news', 'Breaking news and current events from streams', 'newspaper', 100, 'topic', true, true),
    ('Politics', 'politics', 'Political commentary and discussion', 'landmark', 101, 'topic', true, true),
    ('Drama', 'drama', 'Streamer drama and community moments', 'flame', 102, 'topic', true, true),
    ('IRL', 'irl', 'Real life streaming moments', 'camera', 103, 'topic', true, true),
    ('Music', 'music-topic', 'Music performances and reactions', 'music', 104, 'topic', true, false),
    ('Esports', 'esports', 'Competitive gaming and tournaments', 'trophy', 105, 'topic', true, true),
    ('Highlights', 'highlights', 'Best plays and standout moments', 'star', 106, 'topic', true, true),
    ('Fails', 'fails', 'Epic fails and funny mistakes', 'skull', 107, 'topic', true, false),
    ('Creative', 'creative-topic', 'Art, music production, and creative streams', 'palette', 108, 'topic', true, false)
ON CONFLICT (slug) DO UPDATE SET
    category_type = EXCLUDED.category_type,
    is_custom = EXCLUDED.is_custom,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    position = EXCLUDED.position;
