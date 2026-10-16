import { Clock3 } from 'lucide-react'

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * Quiz-total countdown for Participant, Present Mode, and Live host.
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
    ? 'border-red-400 bg-linear-to-br from-red-500 to-rose-600 text-white shadow-red-500/40'
    : urgent
      ? 'border-amber-400 bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/40'
      : 'border-cyan-300 bg-linear-to-br from-cyan-400 to-sky-500 text-white shadow-cyan-500/35'

  const pulseClass = expired
    ? 'quiz-total-timer-expired'
    : critical
      ? 'quiz-total-timer-critical'
      : urgent
        ? 'quiz-total-timer-urgent'
        : 'quiz-total-timer-pulse'

  return (
    <div
      className={`${isLarge ? 'flex' : 'inline-flex'} flex-col rounded-xl border-2 shadow-lg ${pulseClass} ${
        isLarge
          ? `min-w-[clamp(12rem,22vw,18rem)] gap-2 px-[clamp(1rem,2vw,1.5rem)] py-[clamp(0.75rem,1.5vh,1.1rem)] ${toneBorder}`
          : `min-w-[11rem] gap-1.5 px-3.5 py-2.5 ${toneBorder}`
      } ${className}`}
      role="timer"
      aria-live="polite"
      aria-label={`${statusLabel}: ${formatTime(remaining)}`}
      title="Time left for the whole quiz"
    >
      <div className="flex items-center gap-2">
        <Clock3
          className={`shrink-0 text-white ${
            isLarge ? 'size-[clamp(1.25rem,2.2vw,1.75rem)]' : 'size-5'
          }`}
          aria-hidden
        />
        <span
          className={`font-bold uppercase tracking-[0.14em] text-white/95 ${
            isLarge
              ? 'text-[clamp(0.75rem,1.4vw,0.95rem)]'
              : 'text-xs'
          }`}
        >
          {statusLabel}
        </span>
        <span
          className={`ml-auto font-mono font-black tabular-nums leading-none text-white drop-shadow-sm ${
            isLarge
              ? 'text-[clamp(1.5rem,3.2vw,2.25rem)]'
              : 'text-lg'
          }`}
        >
          {formatTime(remaining)}
        </span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-white/35 ${
          isLarge ? 'h-3' : 'h-2'
        }`}
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-white shadow-sm transition-[width] duration-1000 linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

export default HeaderQuizTimer
