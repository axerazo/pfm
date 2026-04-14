// ============================================================
// Reconciliation session types — SPEC §13, §14
// ============================================================

export type ReconciliationStatus =
  | 'reconciled'
  | 'in_progress'
  | 'needs_attention'

export type SuggestionType =
  | 'mark_pending'
  | 'verify_amount'
  | 'investigate'
  | 'informational'

export type FlagType =
  | 'amount_anomaly'
  | 'duplicate_suspect'
  | 'long_overdue'
  | 'missing_confirmation'

export interface ReconciliationSuggestion {
  /** Stable identifier within this result (e.g. "sugg_1") */
  id: string
  /** Lower number = higher priority. Ordered ascending in suggestions array. */
  priority: number
  type: SuggestionType
  /** UUID referencing a transaction in the current register, or null for register-level */
  transaction_id: string | null
  /** Short user-facing action description */
  description: string
  /** Longer AI reasoning — shown in smaller text below description */
  reasoning: string
  /** Only set for mark_pending suggestions; null otherwise */
  suggested_status: 'pending' | null
}

export interface ReconciliationFlag {
  /** Stable identifier within this result (e.g. "flag_1") */
  id: string
  severity: 'warning' | 'info'
  type: FlagType
  transaction_id: string | null
  description: string
  reasoning: string
}

export interface ReconciliationResult {
  summary: {
    status: ReconciliationStatus
    headline: string
    /** Empty string when gap is zero or register is reconciled */
    gap_explanation: string
    /** Count of non-informational suggestions that require user action */
    action_count: number
  }
  suggestions: ReconciliationSuggestion[]
  flags: ReconciliationFlag[]
  reconciliation_complete: boolean
}

// ============================================================
// Context payload sent to Claude
// ============================================================

export interface ReconciliationTransactionContext {
  id: string
  date: string            // "MM/DD/YYYY"
  description: string
  debit: number | null
  credit: number | null
  status: string
  notes: string | null
  scheduled_date: string | null   // "MM/DD/YYYY" | null
  days_past_scheduled: number | null
}

export interface ReconciliationContext {
  session: {
    month: string         // "April"
    year: number
    today: string         // "MM/DD/YYYY"
    account_nickname: string
  }
  balances: {
    opening_balance: number
    actual_balance: number
    available_balance: number
    gap: number
  }
  summary_counts: {
    cleared: number
    pending: number
    scheduled: number
    in_flight: number
    recorded: number
    void: number
    total_non_void: number
  }
  transactions: ReconciliationTransactionContext[]
}

export class ReconciliationParseError extends Error {
  raw: string
  constructor(raw: string) {
    super('Unable to parse AI response as JSON')
    this.name = 'ReconciliationParseError'
    this.raw = raw
  }
}
