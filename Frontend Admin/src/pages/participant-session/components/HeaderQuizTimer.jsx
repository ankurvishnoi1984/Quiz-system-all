import { Clock3 } from 'lucide-react'

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * Compact quiz-total countdown for the participant top bar (beside live count).
 * Silent — question-timer audio stays on the question panel.
 */
export function HeaderQuizTimer({
  timer = 0,
  timeLimit = 0,
  className = '',
}) {
  const remaining = Math.max(0, Number(timer) || 0)
  const limit = Math.max(1, Number(timeLimit) || 1)
  const expired = remaining <= 0
  const urgent = !expired && remaining <= 30
  const critical = !expired && remaining <= 10
  const progress = Math.max(0, Math.min(1, remaining / limit))

  const statusLabel = expired ? "Quiz time's up" : 'Quiz time'

  return (
    <div
      className={`inline-flex min-w-[9.5rem] flex-col gap-1.5 rounded-xl border px-3 py-2 shadow-sm ${
        expired || critical
          ? 'border-red-200/90 bg-red-50 text-red-950'
          : urgent
            ? 'border-amber-200/90 bg-amber-50 text-amber-950'
            : 'border-violet-200/80 bg-violet-50/90 text-violet-950'
      } ${className}`}
      role="timer"
      aria-live="polite"
      aria-label={`${statusLabel}: ${formatTime(remaining)}`}
      title="Time left for the whole quiz"
    >
      <div className="flex items-center gap-2">
        <Clock3
          className={`size-4 shrink-0 ${
            expired || critical
              ? 'text-red-600'
              : urgent
                ? 'text-amber-600'
                : 'text-violet-700'
          }`}
          aria-hidden
        />
        <span
          className={`text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
            expired || critical
              ? 'text-red-700'
              : urgent
                ? 'text-amber-800'
                : 'text-violet-800/85'
          }`}
        >
          {statusLabel}
        </span>
        <span
          className={`ml-auto font-mono text-sm font-bold tabular-nums leading-none ${
            expired || critical
              ? 'text-red-800'
              : urgent
                ? 'text-amber-900'
                : 'text-violet-950'
          }`}
        >
          {formatTime(remaining)}
        </span>
      </div>
      <div
        className={`h-1.5 overflow-hidden rounded-full ${
          expired || critical
            ? 'bg-red-200/80'
            : urgent
              ? 'bg-amber-200/80'
              : 'bg-violet-200/70'
        }`}
        aria-hidden
      >
        <div
          className={`h-full rounded-full transition-[width] duration-1000 linear ${
            expired || critical
              ? 'bg-red-500'
              : urgent
                ? 'bg-amber-500'
                : 'bg-violet-600'
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

export default HeaderQuizTimer
