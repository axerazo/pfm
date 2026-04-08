// ============================================================
// YearlySummary — read-only derived view across all 12 months
// SPEC §5: no manual input; derived from registers + transactions
// ============================================================

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { computeCurrentBalance, formatCurrency } from '@/lib/balance'
import { MONTH_NAMES } from '@/types'
import type { DbRegister, DbTransaction } from '@/types'

interface YearlySummaryProps {
  accountId: string
  year: number
}

interface MonthRow {
  month: number
  opening_balance: number
  total_credits: number
  total_debits: number
  net_change: number
  closing_balance: number
}

export function YearlySummary({ accountId, year }: YearlySummaryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['yearly-summary', accountId, year],
    queryFn: async (): Promise<MonthRow[]> => {
      // Fetch all registers for this account + year
      const { data: registers, error: regErr } = await supabase
        .from('registers')
        .select('*')
        .eq('account_id', accountId)
        .eq('year', year)
        .order('month')
      if (regErr) throw regErr

      const rows: MonthRow[] = []
      for (const reg of (registers ?? []) as DbRegister[]) {
        const { data: txs, error: txErr } = await supabase
          .from('transactions')
          .select('*')
          .eq('register_id', reg.id)
          .neq('status', 'void')
        if (txErr) throw txErr

        const txList = (txs ?? []) as DbTransaction[]
        const total_credits = txList.reduce((s, t) => s + (t.credit ?? 0), 0)
        const total_debits = txList.reduce((s, t) => s + (t.debit ?? 0), 0)
        const closing_balance = computeCurrentBalance(reg.opening_balance, txList)

        rows.push({
          month: reg.month,
          opening_balance: reg.opening_balance,
          total_credits,
          total_debits,
          net_change: closing_balance - reg.opening_balance,
          closing_balance,
        })
      }

      return rows
    },
  })

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading yearly summary…</div>
  if (error) return <div className="p-8 text-center text-red-500">Failed to load yearly summary.</div>
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        No register data for {year}. Navigate to a month and start entering transactions.
      </div>
    )
  }

  const totals = data.reduce(
    (acc, row) => ({
      total_credits: acc.total_credits + row.total_credits,
      total_debits: acc.total_debits + row.total_debits,
      net_change: acc.net_change + row.net_change,
    }),
    { total_credits: 0, total_debits: 0, net_change: 0 },
  )

  return (
    <div className="overflow-x-auto flex-1 p-4">
      <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
        {year} Yearly Summary — Read Only
      </h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <th className="px-3 py-2 text-left">Month</th>
            <th className="px-3 py-2 text-right">Opening Balance</th>
            <th className="px-3 py-2 text-right">Credits (+)</th>
            <th className="px-3 py-2 text-right">Debits (–)</th>
            <th className="px-3 py-2 text-right">Net Change</th>
            <th className="px-3 py-2 text-right">Closing Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-1.5 font-medium text-slate-700">
                {MONTH_NAMES[row.month - 1]}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {formatCurrency(row.opening_balance)}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-green-700">
                {formatCurrency(row.total_credits)}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-red-700">
                {formatCurrency(row.total_debits)}
              </td>
              <td
                className={`px-3 py-1.5 text-right tabular-nums font-medium ${
                  row.net_change >= 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {row.net_change >= 0 ? '+' : ''}
                {formatCurrency(row.net_change)}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                {formatCurrency(row.closing_balance)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
            <td className="px-3 py-2 text-slate-700">Annual Total</td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-400">—</td>
            <td className="px-3 py-2 text-right tabular-nums text-green-700">
              {formatCurrency(totals.total_credits)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-red-700">
              {formatCurrency(totals.total_debits)}
            </td>
            <td
              className={`px-3 py-2 text-right tabular-nums ${
                totals.net_change >= 0 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {totals.net_change >= 0 ? '+' : ''}
              {formatCurrency(totals.net_change)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-400">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
