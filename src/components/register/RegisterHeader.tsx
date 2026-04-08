// ============================================================
// RegisterHeader — SPEC §16 balance display + reconciliation bar
// Bank column (left): Current Balance + Available Balance
// Ledger column (right): Actual Balance (heaviest visual weight)
// ============================================================

import { formatCurrency } from '@/lib/balance'
import type { BalanceSummary, DbRegister } from '@/types'

interface RegisterHeaderProps {
  register: DbRegister
  balances: BalanceSummary
  accountNickname: string
  monthLabel: string
  onBankBalanceUpdate: (currentBankBal: number | null, availableBankBal: number | null) => void
  isLocked: boolean
}

export function RegisterHeader({
  register,
  balances,
  accountNickname,
  monthLabel,
  onBankBalanceUpdate,
  isLocked,
}: RegisterHeaderProps) {
  const { current_balance, available_balance, actual_balance, is_reconciled, unresolved_count, gap } =
    balances

  function handleBankInput(field: 'current' | 'available', raw: string) {
    const value = raw === '' ? null : parseFloat(raw.replace(/[$,]/g, ''))
    if (field === 'current') {
      onBankBalanceUpdate(isNaN(value as number) ? null : value, register.available_bank_bal)
    } else {
      onBankBalanceUpdate(register.current_bank_bal, isNaN(value as number) ? null : value)
    }
  }

  const unresolvedTotal =
    unresolved_count.scheduled + unresolved_count.in_flight + unresolved_count.pending

  return (
    <div className="bg-slate-900 text-white">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h1 className="text-base font-semibold tracking-wide">
          Check Register — {monthLabel}
        </h1>
        <span className="text-sm text-slate-400">{accountNickname}</span>
      </div>

      {/* Balance columns */}
      <div className="grid grid-cols-2 divide-x divide-slate-700">
        {/* Left: Bank-reported (reconciliation targets) */}
        <div className="px-4 py-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Bank
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Current</span>
            <input
              type="text"
              disabled={isLocked}
              defaultValue={register.current_bank_bal != null ? String(register.current_bank_bal) : ''}
              onBlur={(e) => handleBankInput('current', e.target.value)}
              placeholder="—"
              className="w-28 text-right text-sm bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none text-white placeholder:text-slate-600 disabled:opacity-40"
              aria-label="Bank current balance"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Available</span>
            <input
              type="text"
              disabled={isLocked}
              defaultValue={register.available_bank_bal != null ? String(register.available_bank_bal) : ''}
              onBlur={(e) => handleBankInput('available', e.target.value)}
              placeholder="—"
              className="w-28 text-right text-sm bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none text-white placeholder:text-slate-600 disabled:opacity-40"
              aria-label="Bank available balance"
            />
          </div>
        </div>

        {/* Right: Your ledger (source of truth) */}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Your Ledger
          </p>
          <div className="flex items-baseline gap-3">
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: actual_balance >= 0 ? '#4ade80' : '#f87171' }}
            >
              {formatCurrency(actual_balance)}
            </span>
            <span className="text-xs text-slate-400">actual balance</span>
          </div>
          <div className="mt-1 flex gap-4 text-xs text-slate-500">
            <span>Current: {formatCurrency(current_balance)}</span>
            <span>Available: {formatCurrency(available_balance)}</span>
          </div>
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
          <span>✅ Fully reconciled — all balances match</span>
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
            {unresolvedTotal === 0 && gap === 0 && (
              <span className="text-slate-400">Enter bank balances above to reconcile</span>
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
