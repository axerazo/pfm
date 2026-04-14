// ============================================================
// Reconciliation API service — SPEC §14
// Single Claude call; no streaming; strict JSON output.
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import { RECONCILIATION_SYSTEM_PROMPT } from './systemPrompt'
import type { ReconciliationContext, ReconciliationResult, ReconciliationParseError as ParseErrorType } from '@/types/reconciliation'
import { ReconciliationParseError } from '@/types/reconciliation'

const TIMEOUT_MS = 30_000

function getClient(): Anthropic {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!apiKey) {
    throw new Error(
      'VITE_ANTHROPIC_API_KEY is not set. Add it to .env.local to use the AI assistant.',
    )
  }
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

export async function runReconciliationSession(
  context: ReconciliationContext,
): Promise<ReconciliationResult> {
  const client = getClient()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let rawText = ''
  try {
    const response = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: RECONCILIATION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(context),
          },
        ],
      },
      { signal: controller.signal },
    )

    const block = response.content[0]
    if (!block || block.type !== 'text') {
      throw new Error('AI returned no text content')
    }
    rawText = block.text
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Analysis is taking longer than expected. Please try again.')
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error('Reconciliation service unavailable. Please try again later.')
    }
    // Network / fetch failure
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('No connection. Please check your network and try again.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  // Strip accidental markdown fences the model may emit
  const clean = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  let result: ReconciliationResult
  try {
    result = JSON.parse(clean) as ReconciliationResult
  } catch {
    console.error('[reconciliation] Parse error — raw response:', clean)
    throw new ReconciliationParseError(clean) as ParseErrorType
  }

  // Minimal shape guard — ensure arrays are present
  if (!result.summary || typeof result.summary.headline !== 'string') {
    throw new ReconciliationParseError(clean)
  }
  if (!Array.isArray(result.suggestions)) result.suggestions = []
  if (!Array.isArray(result.flags)) result.flags = []
  if (typeof result.reconciliation_complete !== 'boolean') {
    result.reconciliation_complete = false
  }

  return result
}
