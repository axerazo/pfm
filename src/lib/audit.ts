// ============================================================
// Audit log helpers — append-only, never modified
// ============================================================

import { supabase } from './supabase'
import type { AuditAction } from '@/types'

interface AuditParams {
  user_id: string
  account_id: string
  register_id?: string
  transaction_id?: string
  action: AuditAction
  field_changed?: string
  value_before?: string | null
  value_after?: string | null
  reason?: string
}

export async function writeAuditEntry(params: AuditParams): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    user_id: params.user_id,
    account_id: params.account_id,
    register_id: params.register_id ?? null,
    transaction_id: params.transaction_id ?? null,
    action: params.action,
    field_changed: params.field_changed ?? null,
    value_before: params.value_before ?? null,
    value_after: params.value_after ?? null,
    reason: params.reason ?? null,
    ip_address: null,  // set server-side in production via Edge Function
  })
  if (error) {
    // Non-fatal: log to console but don't surface to user
    console.error('[audit] Failed to write audit entry:', error.message)
  }
}
