-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Categories table for high-level content categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for ordering categories
CREATE INDEX idx_categories_position ON categories(position);
CREATE INDEX idx_categories_slug ON categories(slug);

-- Games table for storing game information from Twitch
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twitch_game_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    box_art_url TEXT,
    igdb_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_games_twitch_id ON games(twitch_game_id);
CREATE INDEX idx_games_name ON games(name);

-- Junction table mapping games to categories
CREATE TABLE category_games (
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY(game_id, category_id)
);

CREATE INDEX idx_category_games_category ON category_games(category_id);
CREATE INDEX idx_category_games_game ON category_games(game_id);

-- Game follows table for users following games
CREATE TABLE game_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);

CREATE INDEX idx_game_follows_user ON game_follows(user_id, followed_at DESC);
CREATE INDEX idx_game_follows_game ON game_follows(game_id, followed_at DESC);

-- Trigger to update updated_at timestamp on categories
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at timestamp on games
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, slug, description, icon, position) VALUES
    ('Just Chatting', 'just-chatting', 'Real-life streams and conversations', '💬', 1),
    ('Music', 'music', 'Music performances and DJ sets', '🎵', 2),
    ('Creative', 'creative', 'Art, design, and creative content', '🎨', 3),
    ('Sports', 'sports', 'Sports games and athletic competitions', '⚽', 4),
    ('Strategy', 'strategy', 'Strategy and tactics games', '🧠', 5),
    ('FPS', 'fps', 'First-person shooter games', '🎯', 6),
    ('RPG', 'rpg', 'Role-playing games', '⚔️', 7),
    ('MOBA', 'moba', 'Multiplayer online battle arenas', '🏆', 8),
    ('Battle Royale', 'battle-royale', 'Battle royale games', '🎮', 9),
    ('Other', 'other', 'Other games and content', '🎲', 10);

-- View for games with clip count and follower count
CREATE VIEW games_with_stats AS
SELECT
    g.id,
    g.twitch_game_id,
    g.name,
    g.box_art_url,
    g.igdb_id,
    g.created_at,
    g.updated_at,
    COUNT(DISTINCT c.id) as clip_count,
    COUNT(DISTINCT gf.id) as follower_count
FROM games g
LEFT JOIN clips c ON c.game_id = g.twitch_game_id AND c.is_removed = false
LEFT JOIN game_follows gf ON gf.game_id = g.id
GROUP BY g.id, g.twitch_game_id, g.name, g.box_art_url, g.igdb_id, g.created_at, g.updated_at;

-- View for trending games (games with most recent clips in last 7 days)
CREATE VIEW trending_games AS
SELECT
    g.id,
    g.twitch_game_id,
    g.name,
    g.box_art_url,
    COUNT(c.id) as recent_clip_count,
    SUM(c.vote_score) as total_vote_score,
    COUNT(DISTINCT gf.id) as follower_count
FROM games g
LEFT JOIN clips c ON c.game_id = g.twitch_game_id
    AND c.is_removed = false
    AND c.created_at > NOW() - INTERVAL '7 days'
LEFT JOIN game_follows gf ON gf.game_id = g.id
GROUP BY g.id, g.twitch_game_id, g.name, g.box_art_url
HAVING COUNT(c.id) > 0
ORDER BY recent_clip_count DESC, total_vote_score DESC
LIMIT 100;
