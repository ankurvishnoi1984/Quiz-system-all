import { Unplug } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatMonitorRole } from '../../utils/websocketMonitor'

function RoleBreakdown({ byRole = {} }) {
  const entries = Object.entries(byRole).sort((a, b) => b[1] - a[1])
  if (!entries.length) return <span className="text-slate-400">—</span>

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([role, count]) => (
        <span
          key={role}
          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-navy-800"
        >
          {formatMonitorRole(role)}: {count}
        </span>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    live: 'bg-emerald-50 text-emerald-700',
    paused: 'bg-amber-50 text-amber-800',
    draft: 'bg-slate-100 text-slate-600',
    completed: 'bg-slate-100 text-slate-600',
    archived: 'bg-slate-100 text-slate-500',
  }
  const label = status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : '—'

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        styles[status] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {label}
    </span>
  )
}

function roleActions(byRole = {}) {
  return Object.entries(byRole)
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([role, count]) => ({
      role,
      count: Number(count) || 0,
      label: `Close ${formatMonitorRole(role).toLowerCase()}${Number(count) === 1 ? '' : 's'}`,
    }))
}

function CloseConfirmModal({ target, pending, onCancel, onConfirm }) {
  useEffect(() => {
    if (!target) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !pending) onCancel?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [target, pending, onCancel])

  if (!target) return null

  const roleLabel = formatMonitorRole(target.role).toLowerCase()
  const countLabel = `${target.count} ${roleLabel} connection${target.count === 1 ? '' : 's'}`

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
        aria-labelledby="close-ws-confirm-title"
        aria-describedby="close-ws-confirm-message"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-red-200/80 bg-white shadow-2xl shadow-red-900/10"
      >
        <div className="h-1.5 w-full bg-linear-to-r from-red-500 to-rose-600" aria-hidden />
        <div className="p-6">
          <p id="close-ws-confirm-title" className="text-xl font-bold text-navy-900">
            Close connections?
          </p>
          {target.title ? (
            <p className="mt-1 text-sm font-medium text-slate-600">
              {target.title} · {target.sessionCode}
            </p>
          ) : (
            <p className="mt-1 text-sm font-medium text-slate-600">{target.sessionCode}</p>
          )}
          <p id="close-ws-confirm-message" className="mt-3 text-sm leading-relaxed text-slate-600">
            This will disconnect {countLabel} from the server. They will not reconnect automatically.
          </p>
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
              onClick={onConfirm}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-red-200 bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              <Unplug className="size-4" />
              {pending ? 'Closing…' : 'Close connections'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WebSocketSessionsTable({ sessions = [], isLoading, closingKey, onCloseRole }) {
  const [confirmTarget, setConfirmTarget] = useState(null)

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-8 text-center text-sm text-slate-600 shadow-sm">
        Loading sessions…
      </div>
    )
  }

  if (!sessions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-sm text-slate-600">
        No active WebSocket sessions. Connections will appear here when hosts or participants join live
        sessions.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
      <div className="border-b border-blue-100 bg-blue-50/40 px-4 py-3">
        <h3 className="text-sm font-bold text-navy-900">Active sessions</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Sessions with at least one open WebSocket connection
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-blue-100 bg-white">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Session</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Code</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Connections</th>
              <th className="px-4 py-3 font-semibold text-slate-700">By role</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((row) => {
              const actions = roleActions(row.by_role)
              return (
                <tr key={row.session_code} className="border-b border-blue-50 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-navy-900">{row.title || 'Untitled session'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.session_code}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-navy-900">
                    {row.total_connections}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBreakdown byRole={row.by_role} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {actions.map((action) => {
                        const pendingKey = `${row.session_code}:${action.role}`
                        const pending = closingKey === pendingKey
                        return (
                          <button
                            key={action.role}
                            type="button"
                            disabled={Boolean(closingKey)}
                            onClick={() =>
                              setConfirmTarget({
                                sessionCode: row.session_code,
                                title: row.title,
                                role: action.role,
                                count: action.count,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Unplug className="size-3.5" />
                            {pending ? 'Closing…' : action.label}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <CloseConfirmModal
        target={confirmTarget}
        pending={Boolean(closingKey)}
        onCancel={() => {
          if (!closingKey) setConfirmTarget(null)
        }}
        onConfirm={async () => {
          if (!confirmTarget) return
          try {
            await onCloseRole?.(confirmTarget)
          } finally {
            setConfirmTarget(null)
          }
        }}
      />
    </div>
  )
}
