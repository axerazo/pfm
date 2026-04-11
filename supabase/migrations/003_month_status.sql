-- ============================================================
-- Migration 003: month_status state machine
-- Implements the soft/hard close lifecycle for monthly registers.
-- ============================================================

-- Add month_status to registers.
-- All existing registers default to 'open'.
ALTER TABLE public.registers
  ADD COLUMN month_status TEXT NOT NULL DEFAULT 'open'
  CHECK (month_status IN ('open', 'ready_to_close', 'soft_closed', 'hard_closed'));

-- Expand audit_log action constraint to include month lifecycle events.
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_action_check CHECK (
    action IN (
      'unlocked',
      'edited',
      'voided',
      're-locked',
      'status_changed',
      'ai_suggestion_accepted',
      'deleted',
      'opening_balance_updated',
      'opening_balance_mismatch_kept',
      'month_soft_closed',
      'month_hard_closed',
      'month_reopened'
    )
  );
