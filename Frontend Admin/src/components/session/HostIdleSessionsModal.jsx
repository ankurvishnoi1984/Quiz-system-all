import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useEffect } from 'react'

function sessionKey(session) {
  return String(session?.session_id || session?.id || '')
}

function StatusBadge({ status }) {
  const live = String(status || '').toLowerCase() === 'live'
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        live
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      {live ? 'Live' : 'Paused'}
    </span>
  )
}

function IdleSessionRow({
  session,
  outcome,
  busyAction,
  disabled,
  onStay,
  onEnd,
}) {
  const code = String(session.session_code || '').toUpperCase()
  const ended = outcome === 'ended'
  const continued = outcome === 'continued'

  return (
    <div
      className={`rounded-xl border p-3 text-left transition ${
        ended
          ? 'border-emerald-200 bg-emerald-50/80'
          : continued
            ? 'border-blue-200 bg-blue-50/70'
            : 'border-amber-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy-900">{session.title || 'Untitled session'}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {code ? <span className="font-mono font-semibold tracking-wide">{code}</span> : null}
            {code && session.department ? ' · ' : null}
            {session.department || null}
            {Number.isFinite(Number(session.participants)) ? ` · ${session.participants} joined` : null}
          </p>
        </div>
        {ended ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="size-3.5" aria-hidden />
            Ended
          </span>
        ) : continued ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-800">
            <CheckCircle2 className="size-3.5" aria-hidden />
            Kept live
          </span>
        ) : (
          <StatusBadge status={session.status} />
        )}
      </div>

      {!ended && !continued ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={disabled}
            onClick={onStay}
            className="h-10 flex-1 rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-amber-50 disabled:opacity-60"
          >
            {busyAction === 'stay' ? 'Continuing…' : 'Continue session'}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onEnd}
            className="h-10 flex-1 rounded-xl bg-linear-to-r from-amber-600 to-orange-600 px-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
          >
            {busyAction === 'end' ? 'Ending…' : 'End session'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function HostIdleSessionsModal({
  open,
  sessions = [],
  outcomes = {},
  notice = null,
  pendingId = null,
  pendingAction = null,
  onStay,
  onEnd,
  onClose,
}) {
  const pendingCount = sessions.filter((session) => !outcomes[sessionKey(session)]).length
  const allResolved = sessions.length > 0 && pendingCount === 0

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && allResolved) onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, allResolved, onClose])

  if (!open || sessions.length === 0) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-sessions-title"
        aria-describedby="idle-sessions-message"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-b from-amber-50 to-white shadow-2xl shadow-amber-900/15"
      >
        <div className="h-1.5 w-full bg-linear-to-r from-amber-500 to-orange-500" aria-hidden />
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6">
          <div className="text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-amber-100 text-amber-700 ring-4 ring-amber-50">
              <AlertTriangle className="size-9" strokeWidth={2.25} aria-hidden />
            </div>
            <p id="idle-sessions-title" className="mt-5 text-xl font-bold text-amber-950">
              {sessions.length === 1 ? 'Session inactivity' : `${sessions.length} inactive sessions`}
            </p>
            <p id="idle-sessions-message" className="mt-2 text-sm leading-relaxed text-amber-900/90">
              {sessions.length === 1
                ? 'No activity has been detected for 40 minutes. Continue this session to keep it running, or end it if you do not need it.'
                : 'These live sessions have had no activity for 40 minutes. Each one is listed separately — continue a session to keep it running, or end it if you do not need it.'}
            </p>
          </div>

          {notice ? (
            <div
              className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm ${
                notice.type === 'ended'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-blue-200 bg-blue-50 text-blue-900'
              }`}
            >
              {notice.type === 'ended' ? (
                <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              <p>
                {notice.type === 'ended' ? (
                  <>
                    <span className="font-semibold">{notice.title}</span> was ended.
                    {pendingCount > 0
                      ? ` ${pendingCount} other session${pendingCount === 1 ? '' : 's'} still need a decision.`
                      : null}
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{notice.title}</span> will stay live.
                    {pendingCount > 0
                      ? ` ${pendingCount} other session${pendingCount === 1 ? '' : 's'} still need a decision.`
                      : null}
                  </>
                )}
              </p>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {sessions.map((session) => {
              const id = sessionKey(session)
              return (
                <IdleSessionRow
                  key={id}
                  session={session}
                  outcome={outcomes[id]}
                  busyAction={pendingId === id ? pendingAction : null}
                  disabled={Boolean(pendingId)}
                  onStay={() => onStay(id)}
                  onEnd={() => onEnd(id)}
                />
              )
            })}
          </div>

          {allResolved ? (
            <button
              type="button"
              onClick={onClose}
              className="mt-5 h-11 w-full rounded-xl bg-navy-800 px-4 text-sm font-semibold text-white transition hover:bg-navy-900"
            >
              Done
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
