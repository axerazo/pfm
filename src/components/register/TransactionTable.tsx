// ============================================================
// TransactionTable — full register table with running balance
// SPEC §6: columns B–I; §11: row limit 220; §9: Formula D
// ============================================================

import { computeRunningBalance } from '@/lib/balance'
import { TransactionRow, NewTransactionRow } from './TransactionRow'
import type { DbTransaction, DbRegister } from '@/types'

interface TransactionTableProps {
  register: DbRegister
  transactions: DbTransaction[]
  isLocked: boolean
  onSave: (id: string, changes: Partial<DbTransaction>) => void
  onVoid: (id: string) => void
  onCreate: (payload: {
    register_id: string
    row_order: number
    date: string
    description: string
    debit?: number | null
    credit?: number | null
    check_number?: number | null
    notes?: string | null
  }) => void
}

const MAX_ROWS = 220

export function TransactionTable({
  register,
  transactions,
  isLocked,
  onSave,
  onVoid,
  onCreate,
}: TransactionTableProps) {
  const withBalances = computeRunningBalance(register.opening_balance, transactions)
  const nextRowOrder = transactions.length > 0
    ? Math.max(...transactions.map((t) => t.row_order)) + 1
    : 1
  const atLimit = transactions.length >= MAX_ROWS

  return (
    <div className="overflow-x-auto flex-1">
      <table className="w-full text-sm border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <th className="px-2 py-2 text-center w-16">Check #</th>
            <th className="px-2 py-2 text-left w-28">Date</th>
            <th className="px-2 py-2 text-left">Description</th>
            <th className="px-2 py-2 text-center w-10" title="Status">S</th>
            <th className="px-2 py-2 text-right w-28">Debit (–)</th>
            <th className="px-2 py-2 text-right w-28">Credit (+)</th>
            <th className="px-2 py-2 text-right w-32">Balance</th>
            <th className="px-2 py-2 text-left w-40">Notes</th>
          </tr>
          {/* Opening balance row */}
          <tr className="bg-slate-100 border-b border-slate-200 text-xs text-slate-500">
            <td colSpan={6} className="px-2 py-1 italic">Opening Balance</td>
            <td className="px-2 py-1 text-right tabular-nums font-semibold text-slate-700">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                register.opening_balance,
              )}
            </td>
            <td />
          </tr>
        </thead>
        <tbody>
          {withBalances.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              isLocked={isLocked}
              onSave={onSave}
              onVoid={onVoid}
            />
          ))}
          {!atLimit && (
            <NewTransactionRow
              registerId={register.id}
              nextRowOrder={nextRowOrder}
              isLocked={isLocked}
              onCreate={onCreate}
            />
          )}
          {atLimit && !isLocked && (
            <tr>
              <td colSpan={9} className="px-4 py-2 text-xs text-amber-600 text-center">
                Maximum of {MAX_ROWS} transactions per month reached.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
