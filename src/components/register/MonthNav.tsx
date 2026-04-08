// ============================================================
// MonthNav — tab bar at bottom: Jan–Dec + Yearly Summary
// SPEC §11, §16: current month highlighted; past months show lock on hover
// ============================================================

import { MONTH_NAMES } from '@/types'

interface MonthNavProps {
  activeMonth: number   // 1–12; 0 = Yearly Summary
  activeYear: number
  currentMonth: number  // actual current calendar month (for lock logic)
  currentYear: number
  onNavigate: (month: number) => void
  onYearChange: (delta: number) => void
}

export function MonthNav({
  activeMonth,
  activeYear,
  currentMonth,
  currentYear,
  onNavigate,
  onYearChange,
}: MonthNavProps) {
  function isPastMonth(month: number): boolean {
    if (activeYear < currentYear) return true
    if (activeYear > currentYear) return false
    return month < currentMonth
  }

  return (
    <nav
      className="flex flex-wrap gap-0.5 px-2 py-1 bg-slate-800 border-t border-slate-700"
      aria-label="Month navigation"
    >
      {MONTH_NAMES.map((name, i) => {
        const month = i + 1
        const isActive = activeMonth === month
        const isPast = isPastMonth(month)
        const shortName = name.slice(0, 3).toUpperCase()

        return (
          <button
            key={month}
            onClick={() => onNavigate(month)}
            className={`
              relative px-2.5 py-1 text-xs font-medium rounded transition-colors min-w-[44px] min-h-[36px]
              ${isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'}
              ${isPast && !isActive ? 'text-slate-500' : ''}
            `}
            title={name}
            aria-current={isActive ? 'page' : undefined}
          >
            {shortName}
            {isPast && (
              <span
                className="absolute -top-0.5 -right-0.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                aria-hidden
              >
                🔒
              </span>
            )}
          </button>
        )
      })}

      {/* Yearly Summary */}
      <button
        onClick={() => onNavigate(0)}
        className={`
          px-2.5 py-1 text-xs font-medium rounded transition-colors min-w-[44px] min-h-[36px]
          ${activeMonth === 0
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'}
        `}
      >
        YEAR
      </button>

      {/* Year navigation */}
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => onYearChange(-1)}
          className="px-2 py-1 text-slate-400 hover:text-white text-xs"
          aria-label="Previous year"
        >
          ‹ {activeYear - 1}
        </button>
        <span className="text-xs text-white font-semibold px-1">{activeYear}</span>
        <button
          onClick={() => onYearChange(1)}
          className="px-2 py-1 text-slate-400 hover:text-white text-xs"
          aria-label="Next year"
        >
          {activeYear + 1} ›
        </button>
      </div>
    </nav>
  )
}
