// ============================================================
// useSuggestions — history-based typeahead for Description
// and Notes fields. Queries the user's own transaction
// history, scoped to the current account. SPEC §16.
//
// Two-step strategy:
//   1. Fetch register IDs for the account (cached in module).
//   2. Query transactions filtered by those IDs + ILIKE prefix.
// Client-side frequency sort avoids a DB function/RPC.
// ============================================================

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ---- Session-level caches (live for the browser session) ----

/** accountId → register IDs — fetched once per account per session */
const regIdCache = new Map<string, string[]>()

/** `${accountId}:${field}:${queryLower}` → sorted suggestions */
const suggCache = new Map<string, string[]>()

async function fetchRegisterIds(accountId: string): Promise<string[]> {
  if (regIdCache.has(accountId)) return regIdCache.get(accountId)!
  const { data } = await supabase
    .from('registers')
    .select('id')
    .eq('account_id', accountId)
  const ids = (data ?? []).map((r: { id: string }) => r.id)
  regIdCache.set(accountId, ids)
  return ids
}

// ---- Hook -----------------------------------------------

export function useSuggestions(
  accountId: string,
  field: 'description' | 'notes',
  query: string,
): string[] {
  const [suggestions, setSuggestions] = useState<string[]>([])
  // Sequence counter prevents stale responses from landing after a faster query
  const seq = useRef(0)

  useEffect(() => {
    if (!accountId || query.length < 2) {
      setSuggestions([])
      return
    }

    const cacheKey = `${accountId}:${field}:${query.toLowerCase()}`
    if (suggCache.has(cacheKey)) {
      setSuggestions(suggCache.get(cacheKey)!)
      return
    }

    const thisSeq = ++seq.current
    const timer = setTimeout(async () => {
      try {
        const registerIds = await fetchRegisterIds(accountId)
        if (!registerIds.length || thisSeq !== seq.current) return

        // Build query — select only the column we need
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = supabase
          .from('transactions')
          .select(field)
          .in('register_id', registerIds)
          .ilike(field, `${query}%`)
          .neq('status', 'void')
          .not(field, 'is', null)
          .limit(100)

        if (field === 'notes') {
          // Exclude auto-generated note prefixes
          q = q
            .not('notes', 'ilike', 'Scheduled to be paid%')
            .not('notes', 'ilike', 'Confirmation%')
        }

        const { data } = await q
        if (thisSeq !== seq.current) return  // superseded by a newer query

        // Count frequency client-side; sort descending; top 5
        const freq = new Map<string, number>()
        for (const row of data ?? []) {
          const val: string | null = row[field]
          if (val) freq.set(val, (freq.get(val) ?? 0) + 1)
        }

        const sorted = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([val]) => val)

        suggCache.set(cacheKey, sorted)
        if (thisSeq === seq.current) setSuggestions(sorted)
      } catch {
        // Autocomplete is non-critical — swallow errors silently
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [accountId, field, query])

  return suggestions
}

/** Invalidate the suggestion cache for an account (call after a transaction is saved) */
export function invalidateSuggestionCache(accountId: string) {
  for (const key of suggCache.keys()) {
    if (key.startsWith(`${accountId}:`)) suggCache.delete(key)
  }
}
