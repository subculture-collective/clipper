DROP INDEX IF EXISTS idx_categories_type;
DROP INDEX IF EXISTS idx_categories_featured;

ALTER TABLE categories
    DROP COLUMN IF EXISTS created_by_user_id,
    DROP COLUMN IF EXISTS is_custom,
    DROP COLUMN IF EXISTS is_featured,
    DROP COLUMN IF EXISTS category_type;
