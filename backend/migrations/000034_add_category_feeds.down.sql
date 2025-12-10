-- Drop views
DROP VIEW IF EXISTS trending_games;
DROP VIEW IF EXISTS games_with_stats;

-- Drop tables in reverse order (respecting foreign key dependencies)
DROP TABLE IF EXISTS game_follows;
DROP TABLE IF EXISTS category_games;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS categories;
