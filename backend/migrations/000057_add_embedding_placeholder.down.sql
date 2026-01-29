-- Drop the placeholder embedding column
ALTER TABLE clips DROP COLUMN IF EXISTS embedding;
