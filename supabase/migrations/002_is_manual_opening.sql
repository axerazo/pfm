-- ============================================================
-- Migration 002: is_manual_opening column + audit action expansion
-- ============================================================

-- Add is_manual_opening to registers.
-- true  = user manually entered the opening balance (onboarding or out-of-order creation)
-- false = derived from prior month's closing balance (normal carry-forward)
ALTER TABLE public.registers
  ADD COLUMN is_manual_opening BOOLEAN DEFAULT false NOT NULL;

-- Backfill: mark existing registers as manually-set when no prior-month register
-- existed at the time this register was created (detected via created_at ordering).
-- This correctly handles out-of-order creation: e.g., April created before March
-- existed means April's opening was user-entered, even if March exists now.
UPDATE public.registers r
SET is_manual_opening = true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.registers prev
  WHERE prev.account_id = r.account_id
    AND (
      (r.month > 1  AND prev.month = r.month - 1 AND prev.year = r.year)
      OR
      (r.month = 1  AND prev.month = 12          AND prev.year = r.year - 1)
    )
    AND prev.created_at <= r.created_at  -- prior month existed when this register was created
);

-- Expand the audit_log action constraint to cover the two new opening-balance events.
-- PostgreSQL auto-names inline column CHECK constraints as {table}_{column}_check.
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
      'opening_balance_mismatch_kept'
    )
  );
