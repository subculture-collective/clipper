-- Rollback cookie consent tracking table

DROP INDEX IF EXISTS idx_user_cookie_consents_unique_user;
DROP INDEX IF EXISTS idx_user_cookie_consents_expires_at;
DROP INDEX IF EXISTS idx_user_cookie_consents_consent_date;
DROP INDEX IF EXISTS idx_user_cookie_consents_user_id;
DROP TABLE IF EXISTS user_cookie_consents;
