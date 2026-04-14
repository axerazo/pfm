// ============================================================
// useTransactions — CRUD for transactions within a register
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { detectScheduledPhrase, parseScheduledDate, isInFlight } from '@/lib/balance'
import type { DbTransaction, TransactionStatus } from '@/types'

export function useTransactions(registerId: string | null | undefined) {
  return useQuery({
    queryKey: ['transactions', registerId],
    enabled: !!registerId,
    queryFn: async (): Promise<DbTransaction[]> => {
      if (!registerId) return []
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('register_id', registerId)
        .order('row_order', { ascending: true })
      if (error) throw error
      const rows = (data ?? []) as DbTransaction[]
      // Promote scheduled → in_flight at read time for any past-due scheduled date.
      // deriveStatus only runs on writes, so rows saved before their date passed remain
      // stale in the DB. This ensures the UI always reflects the correct live status.
      return rows.map((tx) => {
        if (tx.status === 'scheduled' && isInFlight(tx.scheduled_date)) {
          return { ...tx, status: 'in_flight' as DbTransaction['status'] }
        }
        return tx
      })
    },
  })
}

// Derive the correct status based on notes content and current date
function deriveStatus(
  notes: string | null,
  currentStatus: TransactionStatus,
): { status: TransactionStatus; scheduled_date: string | null } {
  const isScheduled = detectScheduledPhrase(notes)
  if (!isScheduled) {
    // Revert to recorded if the scheduled phrase was removed
    if (currentStatus === 'scheduled' || currentStatus === 'in_flight') {
      return { status: 'recorded', scheduled_date: null }
    }
    return { status: currentStatus, scheduled_date: null }
  }

  const scheduledDate = parseScheduledDate(notes)
  if (isInFlight(scheduledDate)) {
    return { status: 'in_flight', scheduled_date: scheduledDate }
  }
  return { status: 'scheduled', scheduled_date: scheduledDate }
}

export function useAddTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      register_id: string
      row_order: number
      date: string
      description: string
      debit?: number | null
      credit?: number | null
      check_number?: number | null
      notes?: string | null
    }): Promise<DbTransaction> => {
      const { status, scheduled_date } = deriveStatus(
        payload.notes ?? null,
        'recorded',
      )
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...payload, status, scheduled_date: scheduled_date ?? null })
        .select()
        .single()
      if (error) throw error
      return data as DbTransaction
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', data.register_id] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      register_id,
      currentStatus,
      ...updates
    }: Partial<DbTransaction> & {
      id: string
      register_id: string
      currentStatus: TransactionStatus
    }): Promise<DbTransaction> => {
      // Re-derive status if notes changed
      let finalUpdates: Partial<DbTransaction> = { ...updates }
      if ('notes' in updates) {
        const { status, scheduled_date } = deriveStatus(
          updates.notes ?? null,
          currentStatus,
        )
        // Only override status if it's notes-driven (scheduled/in_flight/recorded)
        if (
          currentStatus === 'recorded' ||
          currentStatus === 'scheduled' ||
          currentStatus === 'in_flight'
        ) {
          finalUpdates = { ...finalUpdates, status, scheduled_date: scheduled_date ?? null }
        }
      }
      const { data, error } = await supabase
        .from('transactions')
        .update(finalUpdates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as DbTransaction
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', data.register_id] })
    },
  })
}

export function useUpdateTransactionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      register_id: _register_id,
      status,
    }: {
      id: string
      register_id: string
      status: TransactionStatus
    }): Promise<DbTransaction> => {
      const { data, error } = await supabase
        .from('transactions')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as DbTransaction
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', data.register_id] })
    },
  })
}

export function useDeleteTransaction() {
  // Per SPEC: hard delete is never permitted.
  // "Delete" means void — exposed as a distinct mutation for clarity.
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      register_id: _register_id,
    }: {
      id: string
      register_id: string
    }): Promise<DbTransaction> => {
      const { data, error } = await supabase
        .from('transactions')
        .update({ status: 'void' })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as DbTransaction
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', data.register_id] })
    },
  })
}
