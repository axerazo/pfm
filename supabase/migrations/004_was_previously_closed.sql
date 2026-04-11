-- Add was_previously_closed flag to registers.
-- Permanent, never reset: once a month has been formally closed
-- (soft or hard) it is always "previously closed", regardless of
-- whether it is later unlocked and re-edited.
-- Used by the UI to distinguish:
--   was_previously_closed = false → first-time close flow (Close & Archive prompt)
--   was_previously_closed = true  → re-editing flow (Re-lock button)

ALTER TABLE registers
  ADD COLUMN IF NOT EXISTS was_previously_closed BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any month currently archived is previously closed.
UPDATE registers
  SET was_previously_closed = true
  WHERE month_status IN ('soft_closed', 'hard_closed');

-- Backfill: any month that was soft-closed at some point (audit evidence),
-- even if it has since been reopened.
UPDATE registers r
  SET was_previously_closed = true
  WHERE EXISTS (
    SELECT 1 FROM audit_log a
    WHERE a.register_id = r.id
      AND a.action = 'month_soft_closed'
  );
