// ============================================================
// Reconciliation context payload builder — SPEC §14
// ============================================================

import { computeCurrentBalance, computeAvailableBalance } from '@/lib/balance'
import { MONTH_NAMES } from '@/types'
import type { DbRegister, DbTransaction } from '@/types'
import type { ReconciliationContext } from '@/types/reconciliation'

/** Convert ISO date string "YYYY-MM-DD" to "MM/DD/YYYY" */
function isoToDisplay(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${month}/${day}/${year}`
}

/** Format today's Date as "MM/DD/YYYY" */
function todayDisplay(today: Date): string {
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const y = today.getFullYear()
  return `${m}/${d}/${y}`
}

/**
 * Compute how many days ago the scheduled_date was, relative to today.
 * Returns null if not scheduled, if scheduled_date is missing,
 * or if the date has not yet passed.
 */
function daysPastScheduled(scheduledDateIso: string | null, today: Date): number | null {
  if (!scheduledDateIso) return null
  const scheduled = new Date(scheduledDateIso)
  scheduled.setHours(0, 0, 0, 0)
  const todayMidnight = new Date(today)
  todayMidnight.setHours(0, 0, 0, 0)
  const diffMs = todayMidnight.getTime() - scheduled.getTime()
  if (diffMs <= 0) return null
  return Math.floor(diffMs / 86_400_000)
}

export function buildReconciliationContext(
  register: DbRegister,
  accountNickname: string,
  transactions: DbTransaction[],
  today: Date,
): ReconciliationContext {
  const nonVoid = transactions.filter((tx) => tx.status !== 'void')

  const actual_balance = computeCurrentBalance(register.opening_balance, transactions)
  const available_balance = computeAvailableBalance(register.opening_balance, transactions)

  const summary_counts = {
    cleared:      nonVoid.filter((tx) => tx.status === 'cleared').length,
    pending:      nonVoid.filter((tx) => tx.status === 'pending').length,
    scheduled:    nonVoid.filter((tx) => tx.status === 'scheduled').length,
    in_flight:    nonVoid.filter((tx) => tx.status === 'in_flight').length,
    recorded:     nonVoid.filter((tx) => tx.status === 'recorded').length,
    void:         transactions.filter((tx) => tx.status === 'void').length,
    total_non_void: nonVoid.length,
  }

  return {
    session: {
      month: MONTH_NAMES[register.month - 1],
      year: register.year,
      today: todayDisplay(today),
      account_nickname: accountNickname,
    },
    balances: {
      opening_balance: register.opening_balance,
      actual_balance,
      available_balance,
      gap: actual_balance - available_balance,
    },
    summary_counts,
    transactions: nonVoid.map((tx) => ({
      id: tx.id,
      date: isoToDisplay(tx.date),
      description: tx.description,
      debit: tx.debit,
      credit: tx.credit,
      status: tx.status,
      notes: tx.notes,
      scheduled_date: tx.scheduled_date ? isoToDisplay(tx.scheduled_date) : null,
      days_past_scheduled: daysPastScheduled(tx.scheduled_date, today),
    })),
  }
}
