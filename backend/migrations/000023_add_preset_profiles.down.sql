-- Drop preset_profiles table
DROP INDEX IF EXISTS idx_preset_profiles_is_system;
DROP INDEX IF EXISTS idx_preset_profiles_created_by;
DROP INDEX IF EXISTS idx_preset_profiles_name;
DROP TABLE IF EXISTS preset_profiles;
