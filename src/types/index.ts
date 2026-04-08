// ============================================================
// Domain types matching SPEC §15 data schema
// ============================================================

export type AccountType = 'checking' | 'savings'

export type TransactionStatus =
  | 'recorded'
  | 'scheduled'
  | 'in_flight'
  | 'pending'
  | 'cleared'
  | 'void'

export type AuditAction =
  | 'unlocked'
  | 'edited'
  | 'voided'
  | 're-locked'
  | 'status_changed'
  | 'ai_suggestion_accepted'
  | 'deleted'

// ============================================================
// Database row types (snake_case, matches Supabase response)
// ============================================================

export interface DbUser {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface DbAccount {
  id: string
  user_id: string
  nickname: string
  bank_name: string
  account_type: AccountType
  routing_number: string   // encrypted ciphertext
  account_number: string   // encrypted ciphertext
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbRegister {
  id: string
  account_id: string
  month: number              // 1–12
  year: number
  opening_balance: number
  current_bank_bal: number | null   // user-entered during reconciliation
  available_bank_bal: number | null // user-entered during reconciliation
  is_locked: boolean
  created_at: string
  updated_at: string
}

export interface DbTransaction {
  id: string
  register_id: string
  row_order: number
  check_number: number | null
  date: string               // ISO date string YYYY-MM-DD
  description: string
  status: TransactionStatus
  debit: number | null
  credit: number | null
  // balance is NOT in the database — computed at app layer
  notes: string | null
  scheduled_date: string | null   // ISO date; parsed from notes
  created_at: string
  updated_at: string
}

export interface DbAuditLog {
  id: string
  user_id: string
  account_id: string
  register_id: string | null
  transaction_id: string | null
  action: AuditAction
  field_changed: string | null
  value_before: string | null
  value_after: string | null
  reason: string | null
  ip_address: string | null   // encrypted
  timestamp: string
}

// ============================================================
// Application-layer types (computed fields added)
// ============================================================

/** Transaction with computed running balance (never stored) */
export interface Transaction extends DbTransaction {
  balance: number | null   // computed at read time; null for void or empty rows
}

/** Register with computed balance summary */
export interface RegisterWithBalances extends DbRegister {
  current_balance: number    // Formula A: ledger balance (all non-void)
  available_balance: number  // Formula B: cleared-only balance
  actual_balance: number     // Formula C: same as current_balance (different label)
  is_reconciled: boolean     // all three match
}

/** Account with decrypted sensitive fields (only after explicit reveal) */
export interface AccountRevealed extends DbAccount {
  routing_number_plain: string
  account_number_plain: string
}

// ============================================================
// Form / UI types
// ============================================================

export interface TransactionFormValues {
  check_number: string
  date: string
  description: string
  debit: string
  credit: string
  notes: string
}

export interface AccountFormValues {
  nickname: string
  bank_name: string
  account_type: AccountType
  routing_number: string
  account_number: string
}

// ============================================================
// Balance computation result
// ============================================================
export interface BalanceSummary {
  current_balance: number    // Formula A = Formula C
  available_balance: number  // Formula B
  actual_balance: number     // Formula C (same as A, different UI label)
  is_reconciled: boolean
  unresolved_count: {
    scheduled: number
    in_flight: number
    pending: number
    recorded: number
  }
  gap: number   // current_balance - available_balance
}

// ============================================================
// Yearly summary (derived, read-only)
// ============================================================
export interface MonthlySummary {
  month: number
  year: number
  opening_balance: number
  total_credits: number
  total_debits: number
  net_change: number
  closing_balance: number
}

export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
] as const
