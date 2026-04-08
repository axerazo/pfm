// Supabase database type stubs.
// Replace with `supabase gen-types typescript` output once project is linked.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; created_at: string; updated_at: string }
        Insert: { id: string; email: string }
        Update: { email?: string }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          nickname: string
          bank_name: string
          account_type: 'checking' | 'savings'
          routing_number: string
          account_number: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          nickname: string
          bank_name: string
          account_type: 'checking' | 'savings'
          routing_number: string
          account_number: string
          is_active?: boolean
        }
        Update: {
          nickname?: string
          bank_name?: string
          account_type?: 'checking' | 'savings'
          routing_number?: string
          account_number?: string
          is_active?: boolean
        }
      }
      registers: {
        Row: {
          id: string
          account_id: string
          month: number
          year: number
          opening_balance: number
          current_bank_bal: number | null
          available_bank_bal: number | null
          is_locked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          account_id: string
          month: number
          year: number
          opening_balance: number
          current_bank_bal?: number | null
          available_bank_bal?: number | null
          is_locked?: boolean
        }
        Update: {
          opening_balance?: number
          current_bank_bal?: number | null
          available_bank_bal?: number | null
          is_locked?: boolean
        }
      }
      transactions: {
        Row: {
          id: string
          register_id: string
          row_order: number
          check_number: number | null
          date: string
          description: string
          status: 'recorded' | 'scheduled' | 'in_flight' | 'pending' | 'cleared' | 'void'
          debit: number | null
          credit: number | null
          notes: string | null
          scheduled_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          register_id: string
          row_order: number
          date: string
          description: string
          status?: 'recorded' | 'scheduled' | 'in_flight' | 'pending' | 'cleared' | 'void'
          debit?: number | null
          credit?: number | null
          check_number?: number | null
          notes?: string | null
          scheduled_date?: string | null
        }
        Update: {
          row_order?: number
          check_number?: number | null
          date?: string
          description?: string
          status?: 'recorded' | 'scheduled' | 'in_flight' | 'pending' | 'cleared' | 'void'
          debit?: number | null
          credit?: number | null
          notes?: string | null
          scheduled_date?: string | null
        }
      }
      audit_log: {
        Row: {
          id: string
          user_id: string
          account_id: string
          register_id: string | null
          transaction_id: string | null
          action: string
          field_changed: string | null
          value_before: string | null
          value_after: string | null
          reason: string | null
          ip_address: string | null
          timestamp: string
        }
        Insert: {
          user_id: string
          account_id: string
          register_id?: string | null
          transaction_id?: string | null
          action: string
          field_changed?: string | null
          value_before?: string | null
          value_after?: string | null
          reason?: string | null
          ip_address?: string | null
        }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
