import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DbAccount } from '@/types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async (): Promise<DbAccount[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as DbAccount[]
    },
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      user_id: string
      nickname: string
      bank_name: string
      account_type: 'checking' | 'savings'
      routing_number: string  // pre-encrypted by caller
      account_number: string  // pre-encrypted by caller
    }): Promise<DbAccount> => {
      const { data, error } = await supabase
        .from('accounts')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as DbAccount
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
