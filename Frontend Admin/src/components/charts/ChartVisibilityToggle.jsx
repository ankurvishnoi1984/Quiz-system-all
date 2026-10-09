import { BarChart3, EyeOff } from 'lucide-react'

/**
 * Compact show/hide control for response graphs (Present + Live headers).
 */
export function ChartVisibilityToggle({
  visible,
  onToggle,
  className = '',
  size = 'sm',
}) {
  const compact = size === 'sm'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      aria-label={visible ? 'Hide graph' : 'Show graph'}
      className={`inline-flex items-center gap-1 rounded-lg font-semibold uppercase tracking-wide transition ${
        compact
          ? 'bg-slate-100/90 px-2 py-1 text-[10px] text-navy-800 hover:bg-slate-200/90'
          : 'border border-blue-200/80 bg-white px-2.5 py-1.5 text-xs text-navy-800 hover:bg-blue-50/80'
      } ${className}`}
    >
      {visible ? (
        <>
          <EyeOff className={compact ? 'size-3' : 'size-3.5'} aria-hidden />
          Hide graph
        </>
      ) : (
        <>
          <BarChart3 className={compact ? 'size-3' : 'size-3.5'} aria-hidden />
          Show graph
        </>
      )}
    </button>
  )
}
