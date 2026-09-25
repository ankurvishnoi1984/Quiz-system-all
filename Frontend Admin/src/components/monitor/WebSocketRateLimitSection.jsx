import { Ban, Gauge, ShieldOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const ACTION_LABELS = {
  join: 'Join',
  join_otp_send: 'Join OTP send',
  join_otp_verify: 'Join OTP verify',
  otp_send: 'Auth OTP send',
  otp_verify: 'Auth OTP verify',
}

function formatAction(action) {
  if (!action) return '—'
  return ACTION_LABELS[action] || String(action).replace(/_/g, ' ')
}

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

function formatWindowLabel(windowMs) {
  const ms = Number(windowMs)
  if (!Number.isFinite(ms) || ms <= 0) return null
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return `${Math.round(ms / 1000)}s`
  if (minutes === 1) return '1 min'
  return `${minutes} min`
}

function ReasonConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  pendingLabel,
  pending,
  danger = true,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter a reason…',
  initialReason = '',
  onCancel,
  onConfirm,
}) {
  const [reason, setReason] = useState(initialReason)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setReason(initialReason || '')
    setError('')
  }, [open, initialReason])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !pending) onCancel?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, pending, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm"
        aria-hidden
        onClick={() => {
          if (!pending) onCancel?.()
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl ${
          danger ? 'border-red-200/80 shadow-red-900/10' : 'border-blue-200/80 shadow-blue-900/10'
        }`}
      >
        <div
          className={`h-1.5 w-full ${
            danger
              ? 'bg-linear-to-r from-red-500 to-rose-600'
              : 'bg-linear-to-r from-navy-600 to-cyan-500'
          }`}
          aria-hidden
        />
        <div className="p-6">
          <p className="text-xl font-bold text-navy-900">{title}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>
          <label className="mt-4 block text-xs font-semibold text-slate-600">
            {reasonLabel} *
            <textarea
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                if (error) setError('')
              }}
              rows={3}
              placeholder={reasonPlaceholder}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            />
          </label>
          {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={onCancel}
              className="h-11 rounded-2xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const trimmed = reason.trim()
                if (!trimmed) {
                  setError('Please enter a reason.')
                  return
                }
                onConfirm?.(trimmed)
              }}
              className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold text-white transition disabled:opacity-60 ${
                danger
                  ? 'border-red-200 bg-red-600 hover:bg-red-700'
                  : 'border-navy-700 bg-navy-800 hover:bg-navy-900'
              }`}
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IpActionButton({
  ip,
  alreadyBlocked,
  busyKey,
  blockContext,
  onBlock,
  onUnblock,
}) {
  if (!ip) {
    return <span className="text-xs text-slate-400">No IP</span>
  }

  const blockPending = busyKey === `block:${ip}`
  const unblockPending = busyKey === `unblock:${ip}`

  if (alreadyBlocked) {
    return (
      <button
        type="button"
        disabled={Boolean(busyKey)}
        onClick={() => onUnblock?.({ ip_address: ip, context: blockContext })}
        className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ShieldOff className="size-3.5" />
        {unblockPending ? 'Unblocking…' : 'Unblock'}
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={Boolean(busyKey)}
      onClick={() => onBlock?.({ ip_address: ip, context: blockContext })}
      className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Ban className="size-3.5" />
      {blockPending ? 'Blocking…' : 'Block IP'}
    </button>
  )
}

export function WebSocketRateLimitSection({
  rateLimit,
  blockedIps = [],
  isLoading,
  busyKey,
  onBlockIp,
  onUnblockIp,
}) {
  const [blockTarget, setBlockTarget] = useState(null)
  const [unblockTarget, setUnblockTarget] = useState(null)

  const live = useMemo(
    () => (Array.isArray(rateLimit?.live) ? rateLimit.live : []),
    [rateLimit],
  )
  const events = useMemo(
    () => (Array.isArray(rateLimit?.events) ? rateLimit.events : []),
    [rateLimit],
  )
  const blockedSet = useMemo(
    () =>
      new Set(
        (Array.isArray(blockedIps) ? blockedIps : []).map((row) =>
          String(row.ip_address || '').toLowerCase(),
        ),
      ),
    [blockedIps],
  )

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-8 text-center text-sm text-slate-600 shadow-sm">
        Loading rate-limit activity…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-amber-200/70 bg-white/90 shadow-sm shadow-amber-900/5">
        <div className="border-b border-amber-100 bg-amber-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-amber-700" />
            <h3 className="text-sm font-bold text-navy-900">Repeat attempts (this window)</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Live IP counters with at least 2 requests in the current window. Join is observe-only
            (shown here, not blocked). Block/Unblock uses the same blocked-IP list.
          </p>
        </div>

        {!live.length ? (
          <p className="px-4 py-6 text-sm text-slate-600">No repeating attempts in open windows.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-amber-100 bg-white">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">IP address</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Session</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Identity</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Count / limit</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Resets at</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {live.map((row) => {
                  const ip = row.ip_address || '—'
                  const alreadyBlocked = row.ip_address
                    ? blockedSet.has(String(row.ip_address).toLowerCase())
                    : false
                  const overLimit =
                    row.limit != null && Number(row.count) > Number(row.limit)
                  const context = `${formatAction(row.action)}${
                    row.session_code ? ` · ${row.session_code}` : ''
                  }`
                  return (
                    <tr
                      key={row.key || `${row.action}:${ip}:${row.session_code || ''}`}
                      className="border-b border-amber-50 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-900">
                        {ip}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatAction(row.action)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {row.session_code || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.identity || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold tabular-nums ${
                            overLimit ? 'text-red-700' : 'text-navy-900'
                          }`}
                        >
                          {row.count}
                          {row.limit != null ? ` / ${row.limit}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatWhen(row.reset_at)}</td>
                      <td className="px-4 py-3">
                        <IpActionButton
                          ip={row.ip_address}
                          alreadyBlocked={alreadyBlocked}
                          busyKey={busyKey}
                          blockContext={context}
                          onBlock={setBlockTarget}
                          onUnblock={setUnblockTarget}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-red-200/70 bg-white/90 shadow-sm shadow-red-900/5">
        <div className="border-b border-red-100 bg-red-50/40 px-4 py-3">
          <h3 className="text-sm font-bold text-navy-900">Rate hit details</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Recent 429 hits (mainly auth OTP: 8 send / 30 verify per IP per 15 min). Join is
            observe-only and will not create these rows. Unblock appears when the IP is already on
            the blocked list.
          </p>
        </div>

        {!events.length ? (
          <p className="px-4 py-6 text-sm text-slate-600">No rate hits recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-red-100 bg-white">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Time</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">IP address</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Session</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Identity</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Count / 15 min</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((row) => {
                  const ip = row.ip_address || '—'
                  const alreadyBlocked = row.ip_address
                    ? blockedSet.has(String(row.ip_address).toLowerCase())
                    : false
                  const context = `rate limit · ${formatAction(row.action)}`
                  const windowLabel = formatWindowLabel(row.window_ms)
                  return (
                    <tr
                      key={row.event_id || `${row.created_at}:${ip}:${row.action}`}
                      className="border-b border-red-50 last:border-b-0"
                    >
                      <td className="px-4 py-3 text-slate-600">{formatWhen(row.created_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-900">
                        {ip}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatAction(row.action)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {row.session_code || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.identity || '—'}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-navy-900">
                        {row.attempt_count}
                        {row.limit_max != null ? (
                          <span className="font-normal text-slate-500"> / {row.limit_max}</span>
                        ) : null}
                        {windowLabel && windowLabel !== '15 min' ? (
                          <div className="text-[11px] font-normal text-slate-500">
                            window {windowLabel}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <IpActionButton
                          ip={row.ip_address}
                          alreadyBlocked={alreadyBlocked}
                          busyKey={busyKey}
                          blockContext={context}
                          onBlock={setBlockTarget}
                          onUnblock={setUnblockTarget}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReasonConfirmModal
        open={Boolean(blockTarget)}
        title="Block IP address"
        message={
          blockTarget
            ? `Block ${blockTarget.ip_address}${
                blockTarget.context ? ` (${blockTarget.context})` : ''
              }? New API and WebSocket connections from this address will be rejected.`
            : ''
        }
        confirmLabel="Block IP"
        pendingLabel="Blocking…"
        pending={busyKey === `block:${blockTarget?.ip_address}`}
        reasonLabel="Block reason"
        reasonPlaceholder="Why are you blocking this IP?"
        initialReason={
          blockTarget?.context
            ? `Rate-limit activity: ${blockTarget.context}`
            : 'Repeated rate-limited requests'
        }
        onCancel={() => {
          if (!busyKey) setBlockTarget(null)
        }}
        onConfirm={async (reason) => {
          if (!blockTarget?.ip_address) return
          try {
            await onBlockIp?.({
              ip_address: blockTarget.ip_address,
              reason,
            })
          } finally {
            setBlockTarget(null)
          }
        }}
      />

      <ReasonConfirmModal
        open={Boolean(unblockTarget)}
        title="Unblock IP address"
        message={
          unblockTarget
            ? `Allow ${unblockTarget.ip_address}${
                unblockTarget.context ? ` (${unblockTarget.context})` : ''
              } to connect again?`
            : ''
        }
        confirmLabel="Unblock IP"
        pendingLabel="Unblocking…"
        pending={busyKey === `unblock:${unblockTarget?.ip_address}`}
        danger={false}
        reasonLabel="Unblock reason"
        reasonPlaceholder="Why is this IP being unblocked?"
        initialReason={
          unblockTarget?.context
            ? `Unblock after rate-limit review: ${unblockTarget.context}`
            : 'Unblock after rate-limit review'
        }
        onCancel={() => {
          if (!busyKey) setUnblockTarget(null)
        }}
        onConfirm={async (reason) => {
          if (!unblockTarget?.ip_address) return
          try {
            await onUnblockIp?.({
              ip_address: unblockTarget.ip_address,
              reason,
            })
          } finally {
            setUnblockTarget(null)
          }
        }}
      />
    </div>
  )
}

export function countRecentRateLimitEvents(events, windowMs = 15 * 60 * 1000) {
  if (!Array.isArray(events) || !events.length) return 0
  const cutoff = Date.now() - windowMs
  return events.filter((row) => {
    const t = new Date(row.created_at).getTime()
    return Number.isFinite(t) && t >= cutoff
  }).length
}
