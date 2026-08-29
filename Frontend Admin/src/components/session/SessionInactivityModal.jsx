import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EndSessionConfirmModal } from './EndSessionConfirmModal'

export function SessionInactivityModal({
  open,
  sessionTitle,
  role = 'host',
  stayPending = false,
  endPending = false,
  onStay,
  onEnd,
}) {
  const isHost = role === 'host'
  const busy = stayPending || endPending
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)

  useEffect(() => {
    if (!open) setConfirmEndOpen(false)
  }, [open])

  useEffect(() => {
    if (!open || confirmEndOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onStay()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, busy, confirmEndOpen, onStay])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" aria-hidden />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-inactivity-title"
          aria-describedby="session-inactivity-message"
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-b from-amber-50 to-white shadow-2xl shadow-amber-900/15"
        >
          <div className="h-1.5 w-full bg-linear-to-r from-amber-500 to-orange-500" aria-hidden />
          <div className="p-6 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-amber-100 text-amber-700 ring-4 ring-amber-50">
              <AlertTriangle className="size-9" strokeWidth={2.25} aria-hidden />
            </div>
            <p id="session-inactivity-title" className="mt-5 text-xl font-bold text-amber-950">
              Session inactivity
            </p>
            {sessionTitle ? (
              <p className="mt-1 text-sm font-medium text-slate-600">{sessionTitle}</p>
            ) : null}
            <p
              id="session-inactivity-message"
              className="mt-2 whitespace-pre-line text-sm leading-relaxed text-amber-900/90"
            >
              {isHost
                ? 'No activity has been detected for 40 minutes. If you do not want to continue, please end the session.'
                : 'No activity has been detected for 40 minutes. If you do not want to continue, please leave the session.'}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={busy || confirmEndOpen}
                onClick={onStay}
                className="h-11 flex-1 rounded-xl border border-amber-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-amber-50 disabled:opacity-60"
              >
                {stayPending ? 'Continuing…' : isHost ? 'Continue session' : 'Stay in session'}
              </button>
              <button
                type="button"
                disabled={busy || confirmEndOpen}
                onClick={() => {
                  if (isHost) {
                    setConfirmEndOpen(true)
                    return
                  }
                  onEnd()
                }}
                className="h-11 flex-1 rounded-xl bg-linear-to-r from-amber-600 to-orange-600 px-4 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
              >
                {endPending
                  ? isHost
                    ? 'Ending…'
                    : 'Leaving…'
                  : isHost
                    ? 'End session'
                    : 'Leave session'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isHost ? (
        <EndSessionConfirmModal
          open={confirmEndOpen}
          sessionTitle={sessionTitle}
          endPending={endPending}
          onCancel={() => setConfirmEndOpen(false)}
          onConfirm={onEnd}
        />
      ) : null}
    </>
  )
}
