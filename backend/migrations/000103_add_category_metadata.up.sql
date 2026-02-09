-- Add metadata fields to categories for featured/custom/type support

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS category_type VARCHAR(50) NOT NULL DEFAULT 'game',
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories (is_featured, position);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories (category_type);
