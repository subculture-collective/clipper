-- Add full-text search support for clips, users, and tags

-- Add tsvector columns for searchable content
ALTER TABLE clips ADD COLUMN search_vector tsvector;
ALTER TABLE users ADD COLUMN search_vector tsvector;
ALTER TABLE tags ADD COLUMN search_vector tsvector;

-- Create function to update clip search vector
CREATE OR REPLACE FUNCTION clips_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.creator_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.broadcaster_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.game_name, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user search vector
CREATE OR REPLACE FUNCTION users_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.username, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update tag search vector
CREATE OR REPLACE FUNCTION tags_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update search vectors automatically
CREATE TRIGGER clips_search_vector_trigger
BEFORE INSERT OR UPDATE ON clips
FOR EACH ROW EXECUTE FUNCTION clips_search_vector_update();

CREATE TRIGGER users_search_vector_trigger
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION users_search_vector_update();

CREATE TRIGGER tags_search_vector_trigger
BEFORE INSERT OR UPDATE ON tags
FOR EACH ROW EXECUTE FUNCTION tags_search_vector_update();

-- Populate existing data with search vectors
UPDATE clips SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(creator_name, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(broadcaster_name, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(game_name, '')), 'C');

UPDATE users SET search_vector = 
  setweight(to_tsvector('english', COALESCE(username, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(display_name, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(bio, '')), 'C');

UPDATE tags SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B');

-- Create GIN indexes for fast full-text search
CREATE INDEX idx_clips_search_vector ON clips USING GIN(search_vector);
CREATE INDEX idx_users_search_vector ON users USING GIN(search_vector);
CREATE INDEX idx_tags_search_vector ON tags USING GIN(search_vector);

-- Create table for search analytics (tracking searches)
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    filters JSONB,
    result_count INT DEFAULT 0,
    clicked_result_id UUID,
    clicked_result_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_search_queries_created ON search_queries(created_at DESC);
CREATE INDEX idx_search_queries_query ON search_queries(query);
CREATE INDEX idx_search_queries_user ON search_queries(user_id);
