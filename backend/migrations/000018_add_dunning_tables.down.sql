-- Drop dunning tables in reverse order
DROP TABLE IF EXISTS dunning_attempts;
DROP TABLE IF EXISTS payment_failures;

-- Remove grace_period_end column from subscriptions
ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS grace_period_end;
