// ============================================================
// Month lifecycle helpers — SPEC §11 (revised)
// ============================================================

import type { DbTransaction } from '@/types'

/**
 * Opening balance carry-forward rule (revised):
 * Next month's opening = running balance at the LAST CLEARED transaction
 * in the prior month, iterating transactions in row_order sequence.
 *
 * Running balance includes all non-void transactions in order.
 * The "snapshot" is taken at each cleared row.
 * Returns opening_balance unchanged when no cleared transactions exist.
 */
export function computeLastClearedRunningBalance(
  openingBalance: number,
  transactions: DbTransaction[],
): number {
  let running = openingBalance
  let lastCleared = openingBalance

  for (const tx of transactions) {
    if (tx.status === 'void' || (tx.debit == null && tx.credit == null)) continue
    running += (tx.credit ?? 0) - (tx.debit ?? 0)
    if (tx.status === 'cleared') {
      lastCleared = running
    }
  }

  return lastCleared
}

/**
 * Count of non-void, non-cleared transactions (still "in flight" for carry-forward).
 */
export function pendingTransactionCount(transactions: DbTransaction[]): number {
  return transactions.filter(
    (tx) => tx.status !== 'void' && tx.status !== 'cleared',
  ).length
}

/**
 * True when ALL non-void transactions are cleared and at least one exists.
 * This is the condition that triggers ready_to_close.
 */
export function allTransactionsCleared(transactions: DbTransaction[]): boolean {
  const nonVoid = transactions.filter((tx) => tx.status !== 'void')
  return nonVoid.length > 0 && nonVoid.every((tx) => tx.status === 'cleared')
}
