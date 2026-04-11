-- Replace was_previously_closed with last_closed_type.
-- Tracks HOW a month was most recently closed, not just THAT it was closed.
-- NULL   = never been formally closed (first-time close flow)
-- 'soft' = was soft_closed (reopened months get Close & Archive prompt again)
-- 'hard' = was hard_closed (unlocked months get audit banner + Re-lock button)

ALTER TABLE registers
  ADD COLUMN IF NOT EXISTS last_closed_type TEXT
    CHECK (last_closed_type IN ('soft', 'hard'))
    DEFAULT NULL;

-- Backfill currently archived months
UPDATE registers SET last_closed_type = 'hard' WHERE month_status = 'hard_closed';
UPDATE registers SET last_closed_type = 'soft' WHERE month_status = 'soft_closed';

-- Backfill open months that were previously closed.
-- was_previously_closed = true means soft_closed at some point (those unlocked
-- from hard_closed would only have been reset to open by a manual DB fix, so
-- treat remaining open+was_previously_closed rows as 'soft').
UPDATE registers
  SET last_closed_type = 'soft'
  WHERE month_status = 'open'
    AND was_previously_closed = true
    AND last_closed_type IS NULL;

-- Drop the column we're replacing
ALTER TABLE registers DROP COLUMN IF EXISTS was_previously_closed;
