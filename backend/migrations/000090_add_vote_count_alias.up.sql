-- Add vote_count as alias/computed column for vote_score in clips table
-- Tests expect vote_count but schema uses vote_score for net vote count

ALTER TABLE clips ADD COLUMN IF NOT EXISTS vote_count INT DEFAULT 0;

-- Sync existing vote_score to vote_count
UPDATE clips SET vote_count = vote_score WHERE vote_count = 0;

-- Create trigger to keep vote_count in sync with vote_score
CREATE OR REPLACE FUNCTION sync_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.vote_count = NEW.vote_score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_vote_count_trigger ON clips;
CREATE TRIGGER sync_vote_count_trigger
BEFORE UPDATE ON clips
FOR EACH ROW
EXECUTE FUNCTION sync_vote_count();
