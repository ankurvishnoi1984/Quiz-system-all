import { useEffect } from 'react'

/**
 * Separate confirmation dialog used before ending a session from inactivity UI.
 * Renders above the inactivity popup (z-[90]).
 */
export function EndSessionConfirmModal({
  open,
  sessionTitle,
  endPending = false,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !endPending) onCancel?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, endPending, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm"
        aria-hidden
        onClick={() => {
          if (!endPending) onCancel?.()
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="end-session-confirm-title"
        aria-describedby="end-session-confirm-message"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-red-200/80 bg-white shadow-2xl shadow-red-900/10"
      >
        <div className="h-1.5 w-full bg-linear-to-r from-red-500 to-rose-600" aria-hidden />
        <div className="p-6">
          <p id="end-session-confirm-title" className="text-xl font-bold text-navy-900">
            End session?
          </p>
          {sessionTitle ? (
            <p className="mt-1 text-sm font-medium text-slate-600">{sessionTitle}</p>
          ) : null}
          <p
            id="end-session-confirm-message"
            className="mt-3 text-sm leading-relaxed text-slate-600"
          >
            Are you sure you want to end this session? Participants will be notified and will no
            longer be able to submit new responses.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={endPending}
              onClick={onCancel}
              className="h-11 rounded-2xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={endPending}
              onClick={onConfirm}
              className="h-11 rounded-2xl border border-red-200 bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {endPending ? 'Ending…' : 'End session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
