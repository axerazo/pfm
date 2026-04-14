// ============================================================
// RegisterHeader — SPEC §16 balance display + reconciliation bar
//
// Displays two computed ledger balances only (Option A):
//   Actual Balance   = opening + all non-void debits/credits
//   Available Balance = opening + cleared debits/credits only
//
// Bank balance inputs are reserved for Phase 3 bank sync
// and are not shown here. current_bank_bal / available_bank_bal
// columns remain in the DB but are not read or written from UI.
//
// is_reconciled fires when every non-void transaction is cleared
// (actual_balance === available_balance at that point).
//
// Reconcile button — SPEC §14:
//   Visible: month_status open or ready_to_close
//   Disabled: is_reconciled = true (nothing to analyze)
//   Hidden: soft_closed or hard_closed
// ============================================================

import { formatCurrency } from '@/lib/balance'
import type { BalanceSummary, MonthStatus } from '@/types'

interface RegisterHeaderProps {
  balances: BalanceSummary
  accountNickname: string
  monthLabel: string
  isLocked: boolean
  monthStatus?: MonthStatus
  isReconciling?: boolean
  reconcileError?: string | null
  onReconcileClick?: () => void
}

export function RegisterHeader({
  balances,
  accountNickname,
  monthLabel,
  isLocked,
  monthStatus,
  isReconciling = false,
  reconcileError = null,
  onReconcileClick,
}: RegisterHeaderProps) {
  const { actual_balance, available_balance, is_reconciled, unresolved_count, gap } = balances

  // Show the Reconcile button only for open/ready-to-close months
  const showReconcileButton =
    onReconcileClick != null &&
    (monthStatus === 'open' || monthStatus === 'ready_to_close')

  const reconcileDisabled = is_reconciled || isReconciling

  return (
    <div className="bg-slate-900 text-white">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h1 className="text-base font-semibold tracking-wide">
          Check Register — {monthLabel}
        </h1>
        <div className="flex items-center gap-3">
          {showReconcileButton && (
            <div className="flex flex-col items-end gap-0.5">
              <button
                onClick={onReconcileClick}
                disabled={reconcileDisabled}
                className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                  reconcileDisabled
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
                title={is_reconciled ? 'All transactions are cleared' : 'Run AI reconciliation analysis'}
              >
                {isReconciling ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing…
                  </span>
                ) : (
                  'Reconcile'
                )}
              </button>
              {reconcileError && (
                <span className="text-xs text-red-400 max-w-[180px] text-right leading-tight">
                  {reconcileError}
                </span>
              )}
            </div>
          )}
          <span className="text-sm text-slate-400">{accountNickname}</span>
        </div>
      </div>

      {/* Balance display — single column, two values */}
      <div className="px-4 py-3 space-y-1">
        {/* Actual Balance — primary, largest */}
        <div className="flex items-baseline gap-3">
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: actual_balance >= 0 ? '#4ade80' : '#f87171' }}
          >
            {formatCurrency(actual_balance)}
          </span>
          <span className="text-xs text-slate-400">Actual Balance</span>
        </div>

        {/* Available Balance — secondary */}
        <div className="flex items-baseline gap-3">
          <span
            className="text-base font-semibold tabular-nums"
            style={{ color: available_balance >= 0 ? '#86efac' : '#fca5a5' }}
          >
            {formatCurrency(available_balance)}
          </span>
          <span className="text-xs text-slate-500">Available Balance</span>
        </div>
      </div>

      {/* Reconciliation status bar */}
      <div
        className={`px-4 py-2 text-xs flex flex-wrap gap-x-4 gap-y-1 items-center border-t ${
          is_reconciled
            ? 'border-green-800 bg-green-950/50 text-green-400'
            : 'border-amber-800 bg-amber-950/30 text-amber-300'
        }`}
      >
        {is_reconciled ? (
          <span>✅ Fully reconciled — all transactions cleared</span>
        ) : (
          <>
            <span>⚠️ Reconciliation needed</span>
            {gap !== 0 && (
              <span>
                Gap: <strong>{formatCurrency(Math.abs(gap))}</strong>
              </span>
            )}
            {unresolved_count.scheduled > 0 && (
              <span>{unresolved_count.scheduled} scheduled</span>
            )}
            {unresolved_count.in_flight > 0 && (
              <span className="text-red-400">{unresolved_count.in_flight} in-flight</span>
            )}
            {unresolved_count.pending > 0 && (
              <span>{unresolved_count.pending} pending</span>
            )}
            {unresolved_count.recorded > 0 && (
              <span>{unresolved_count.recorded} unsynced</span>
            )}
          </>
        )}
      </div>

      {/* Locked month banner */}
      {isLocked && (
        <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400 flex items-center gap-2">
          <span>🔒 This register is closed — all entries are read-only</span>
        </div>
      )}
    </div>
  )
}
