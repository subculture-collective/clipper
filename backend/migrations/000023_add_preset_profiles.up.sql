-- Create preset_profiles table for storing named engagement scoring presets
CREATE TABLE IF NOT EXISTS preset_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    vote_weight DECIMAL(10, 4) NOT NULL DEFAULT 3.0,
    comment_weight DECIMAL(10, 4) NOT NULL DEFAULT 2.0,
    favorite_weight DECIMAL(10, 4) NOT NULL DEFAULT 1.5,
    view_weight DECIMAL(10, 4) NOT NULL DEFAULT 0.1,
    is_system BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_preset_profiles_name ON preset_profiles(name);
CREATE INDEX idx_preset_profiles_created_by ON preset_profiles(created_by);
CREATE INDEX idx_preset_profiles_is_system ON preset_profiles(is_system);

-- Seed system presets
INSERT INTO preset_profiles (name, description, vote_weight, comment_weight, favorite_weight, view_weight, is_system) VALUES
('Balanced', 'Default balanced engagement weights', 3.0, 2.0, 1.5, 0.1, TRUE),
('Comments Focus', 'Prioritizes comment engagement', 2.0, 3.5, 1.2, 0.08, TRUE),
('Votes Focus', 'Prioritizes vote engagement', 4.0, 1.5, 1.2, 0.08, TRUE),
('Favorites Focus', 'Prioritizes favorite engagement', 2.5, 1.8, 2.5, 0.05, TRUE),
('Views Light', 'Light weight on views', 3.0, 2.0, 1.5, 0.02, TRUE);
