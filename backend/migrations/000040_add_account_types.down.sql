-- Drop account_type_conversions table
DROP TABLE IF EXISTS account_type_conversions;

-- Drop indices
DROP INDEX IF EXISTS idx_users_account_type;

-- Remove account type columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS account_type_updated_at;
ALTER TABLE users DROP COLUMN IF EXISTS account_type;
