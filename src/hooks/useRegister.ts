// ============================================================
// useRegister — fetch/create register for a given account+month+year
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DbRegister } from '@/types'

export function useRegister(accountId: string | null, month: number, year: number) {
  return useQuery({
    queryKey: ['register', accountId, month, year],
    enabled: !!accountId,
    queryFn: async (): Promise<DbRegister | null> => {
      if (!accountId) return null
      const { data, error } = await supabase
        .from('registers')
        .select('*')
        .eq('account_id', accountId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle()
      if (error) throw error
      return data as DbRegister | null
    },
  })
}

export function useCreateRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      account_id: string
      month: number
      year: number
      opening_balance: number
    }): Promise<DbRegister> => {
      const { data, error } = await supabase
        .from('registers')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as DbRegister
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['register', data.account_id, data.month, data.year],
      })
    },
  })
}

export function useUpdateRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<DbRegister> & { id: string }): Promise<DbRegister> => {
      const { data, error } = await supabase
        .from('registers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as DbRegister
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['register', data.account_id, data.month, data.year],
      })
    },
  })
}
