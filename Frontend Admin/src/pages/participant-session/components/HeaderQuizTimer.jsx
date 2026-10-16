import { Clock3 } from 'lucide-react'

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * Quiz-total countdown for the participant top bar and Present Mode header.
 * Silent — question-timer audio stays on the question panel.
 * @param {'default' | 'large'} [size]
 */
export function HeaderQuizTimer({
  timer = 0,
  timeLimit = 0,
  className = '',
  size = 'default',
}) {
  const remaining = Math.max(0, Number(timer) || 0)
  const limit = Math.max(1, Number(timeLimit) || 1)
  const expired = remaining <= 0
  const urgent = !expired && remaining <= 30
  const critical = !expired && remaining <= 10
  const progress = Math.max(0, Math.min(1, remaining / limit))
  const isLarge = size === 'large'

  const statusLabel = expired ? "Quiz time's up" : 'Quiz time'

  const toneBorder = expired || critical
    ? 'border-red-200/90 bg-red-50 text-red-950'
    : urgent
      ? 'border-amber-200/90 bg-amber-50 text-amber-950'
      : 'border-violet-200/80 bg-violet-50/90 text-violet-950'

  const iconTone =
    expired || critical
      ? 'text-red-600'
      : urgent
        ? 'text-amber-600'
        : 'text-violet-700'

  const labelTone =
    expired || critical
      ? 'text-red-700'
      : urgent
        ? 'text-amber-800'
        : 'text-violet-800/85'

  const timeTone =
    expired || critical
      ? 'text-red-800'
      : urgent
        ? 'text-amber-900'
        : 'text-violet-950'

  const trackTone =
    expired || critical
      ? 'bg-red-200/80'
      : urgent
        ? 'bg-amber-200/80'
        : 'bg-violet-200/70'

  const fillTone =
    expired || critical
      ? 'bg-red-500'
      : urgent
        ? 'bg-amber-500'
        : 'bg-violet-600'

  return (
    <div
      className={`inline-flex flex-col rounded-xl border ${
        isLarge
          ? `min-w-[clamp(12rem,22vw,18rem)] gap-2 border-2 px-[clamp(1rem,2vw,1.5rem)] py-[clamp(0.75rem,1.5vh,1.1rem)] shadow-md ${toneBorder}`
          : `min-w-[11rem] gap-1.5 px-3.5 py-2.5 shadow-sm ${toneBorder}`
      } ${className}`}
      role="timer"
      aria-live="polite"
      aria-label={`${statusLabel}: ${formatTime(remaining)}`}
      title="Time left for the whole quiz"
    >
      <div className="flex items-center gap-2">
        <Clock3
          className={`shrink-0 ${iconTone} ${
            isLarge ? 'size-[clamp(1.25rem,2.2vw,1.75rem)]' : 'size-5'
          }`}
          aria-hidden
        />
        <span
          className={`font-semibold uppercase ${labelTone} ${
            isLarge
              ? 'text-[clamp(0.75rem,1.4vw,0.95rem)] tracking-[0.12em]'
              : 'text-xs tracking-[0.12em]'
          }`}
        >
          {statusLabel}
        </span>
        <span
          className={`ml-auto font-mono font-bold tabular-nums leading-none ${timeTone} ${
            isLarge
              ? 'text-[clamp(1.5rem,3.2vw,2.25rem)]'
              : 'text-base'
          }`}
        >
          {formatTime(remaining)}
        </span>
      </div>
      <div
        className={`overflow-hidden rounded-full ${trackTone} ${
          isLarge ? 'h-3' : 'h-2'
        }`}
        aria-hidden
      >
        <div
          className={`h-full rounded-full transition-[width] duration-1000 linear ${fillTone}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

export default HeaderQuizTimer
