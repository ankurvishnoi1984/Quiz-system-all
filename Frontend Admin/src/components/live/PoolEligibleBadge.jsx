/**
 * Compact pill matching Builder “In pool” / not-in-pool language.
 * @param {{ eligible: boolean, selected?: boolean, className?: string }} props
 */
export function PoolEligibleBadge({ eligible, selected = false, className = '' }) {
  if (eligible) {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          selected ? 'bg-emerald-400/30 text-emerald-100' : 'bg-emerald-100 text-emerald-900'
        } ${className}`}
      >
        In pool
      </span>
    )
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        selected ? 'bg-white/15 text-slate-200' : 'bg-slate-100 text-slate-600'
      } ${className}`}
    >
      Not in pool
    </span>
  )
}
