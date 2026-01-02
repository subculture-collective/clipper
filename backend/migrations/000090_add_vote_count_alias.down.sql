-- Rollback: remove vote_count alias column and trigger

DROP TRIGGER IF EXISTS sync_vote_count_trigger ON clips;
DROP FUNCTION IF EXISTS sync_vote_count();

ALTER TABLE clips DROP COLUMN IF EXISTS vote_count;
