import { CheckCircle2 } from 'lucide-react'

/**
 * Flip to true to re-enable Previous on the quiz-complete thanks screen
 * so participants can review locked answers again.
 */
export const QUIZ_THANKS_ALLOW_REVIEW = false

export function QuizCompletedThanksPanel({
  sessionTitle = '',
  onPrevious,
  canGoPrevious = false,
}) {
  const showPrevious = QUIZ_THANKS_ALLOW_REVIEW && typeof onPrevious === 'function'

  return (
    <section className="flex min-h-[min(60vh,28rem)] flex-col items-center justify-center">
      <div className="quiz-pop w-full max-w-lg rounded-2xl border border-emerald-200/80 bg-linear-to-r from-emerald-50/90 to-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto mb-5 inline-flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-8" aria-hidden />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Quiz complete
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          Thanks for participating
        </h2>
        {sessionTitle ? (
          <p className="mt-3 text-base text-slate-600 sm:text-lg">{sessionTitle}</p>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
          Your answers have been recorded. Waiting for the host to continue.
        </p>
        {showPrevious ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              disabled={!canGoPrevious}
              onClick={onPrevious}
              className="participant-btn-secondary h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-navy-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
