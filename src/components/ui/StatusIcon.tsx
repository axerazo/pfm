// ============================================================
// StatusIcon — Column E status indicator
// SPEC §7: icons only; scheduled/in_flight share red icon
// ============================================================

import type { TransactionStatus } from '@/types'

interface StatusIconProps {
  status: TransactionStatus
  className?: string
}

// Green checkmark — cleared
function ClearedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cleared"
    >
      <circle cx="10" cy="10" r="9" fill="#16a34a" opacity="0.15" />
      <path
        d="M5.5 10.5l3 3 6-6"
        stroke="#16a34a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Yellow warning — pending
function PendingIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pending"
    >
      <circle cx="10" cy="10" r="9" fill="#ca8a04" opacity="0.15" />
      <path
        d="M10 6v5M10 14h.01"
        stroke="#ca8a04"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Red exclamation — scheduled or in_flight
function ScheduledIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Scheduled"
    >
      <circle cx="10" cy="10" r="9" fill="#dc2626" opacity="0.15" />
      <path
        d="M10 6v5M10 14h.01"
        stroke="#dc2626"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function StatusIcon({ status, className = 'w-5 h-5' }: StatusIconProps) {
  switch (status) {
    case 'cleared':
      return <ClearedIcon className={className} />
    case 'pending':
      return <PendingIcon className={className} />
    case 'scheduled':
    case 'in_flight':
      return <ScheduledIcon className={className} />
    case 'recorded':
    case 'void':
    default:
      return <span className={className} aria-label={status} />
  }
}

/** Map status → Tailwind row background class */
export function statusRowClass(status: TransactionStatus): string {
  switch (status) {
    case 'in_flight':
      return 'bg-amber-50 border-l-2 border-amber-400'
    case 'pending':
      return 'bg-blue-50'
    case 'cleared':
      return 'bg-green-50'
    case 'void':
      return 'opacity-50 line-through bg-slate-50'
    default:
      return ''
  }
}
