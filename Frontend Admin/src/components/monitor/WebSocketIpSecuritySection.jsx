import { Ban, ShieldOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatMonitorRole, formatAuthStatus } from '../../utils/websocketMonitor'

const EMPTY_FILTERS = {
  clientId: '',
  departmentId: '',
  hostId: '',
  sessionCode: '',
  search: '',
}

function formatConnectedAt(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

function uniqueOptions(rows, getValue, getLabel) {
  const map = new Map()
  for (const row of rows) {
    const value = getValue(row)
    if (value == null || value === '') continue
    const key = String(value)
    if (!map.has(key)) map.set(key, getLabel(row) || key)
  }
  return [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function ReasonConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  pendingLabel,
  pending,
  danger = true,
  reasonRequired = true,
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
            {reasonLabel}
            {reasonRequired ? ' *' : ''}
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
                if (reasonRequired && !trimmed) {
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

export function WebSocketIpSecuritySection({
  connections = [],
  blockedIps = [],
  isLoading,
  busyKey,
  onBlockIp,
  onUnblockIp,
}) {
  const [blockTarget, setBlockTarget] = useState(null)
  const [unblockTarget, setUnblockTarget] = useState(null)
  const [manualIp, setManualIp] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const openConnections = useMemo(
    () => (Array.isArray(connections) ? connections : []),
    [connections],
  )
  const blocked = useMemo(() => (Array.isArray(blockedIps) ? blockedIps : []), [blockedIps])
  const blockedSet = useMemo(
    () => new Set(blocked.map((row) => String(row.ip_address || '').toLowerCase())),
    [blocked],
  )

  const clientOptions = useMemo(
    () => uniqueOptions(openConnections, (row) => row.client_id, (row) => row.client_name),
    [openConnections],
  )
  const departmentOptions = useMemo(() => {
    const scoped = filters.clientId
      ? openConnections.filter((row) => String(row.client_id) === String(filters.clientId))
      : openConnections
    return uniqueOptions(scoped, (row) => row.dept_id, (row) => row.department_name)
  }, [openConnections, filters.clientId])
  const hostOptions = useMemo(() => {
    let scoped = openConnections
    if (filters.clientId) {
      scoped = scoped.filter((row) => String(row.client_id) === String(filters.clientId))
    }
    if (filters.departmentId) {
      scoped = scoped.filter((row) => String(row.dept_id) === String(filters.departmentId))
    }
    return uniqueOptions(
      scoped,
      (row) => row.host_id,
      (row) => row.host_name || row.host_email || `Host #${row.host_id}`,
    )
  }, [openConnections, filters.clientId, filters.departmentId])
  const sessionOptions = useMemo(() => {
    let scoped = openConnections
    if (filters.clientId) {
      scoped = scoped.filter((row) => String(row.client_id) === String(filters.clientId))
    }
    if (filters.departmentId) {
      scoped = scoped.filter((row) => String(row.dept_id) === String(filters.departmentId))
    }
    if (filters.hostId) {
      scoped = scoped.filter((row) => String(row.host_id) === String(filters.hostId))
    }
    return uniqueOptions(
      scoped,
      (row) => row.session_code,
      (row) => `${row.title || 'Untitled'} (${row.session_code})`,
    )
  }, [openConnections, filters.clientId, filters.departmentId, filters.hostId])

  const filteredConnections = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return openConnections.filter((row) => {
      if (filters.clientId && String(row.client_id) !== String(filters.clientId)) return false
      if (filters.departmentId && String(row.dept_id) !== String(filters.departmentId)) return false
      if (filters.hostId && String(row.host_id) !== String(filters.hostId)) return false
      if (filters.sessionCode && String(row.session_code) !== String(filters.sessionCode)) {
        return false
      }
      if (!search) return true
      const haystack = [
        row.ip_address,
        row.title,
        row.session_code,
        row.host_name,
        row.host_email,
        row.department_name,
        row.client_name,
        row.role,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(search)
    })
  }, [openConnections, filters])

  const updateFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'clientId') {
        next.departmentId = ''
        next.hostId = ''
        next.sessionCode = ''
      } else if (key === 'departmentId') {
        next.hostId = ''
        next.sessionCode = ''
      } else if (key === 'hostId') {
        next.sessionCode = ''
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-8 text-center text-sm text-slate-600 shadow-sm">
        Loading IP security…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
        <div className="border-b border-blue-100 bg-blue-50/40 px-4 py-3">
          <h3 className="text-sm font-bold text-navy-900">Connection IPs</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Filter by client, department, host, or session. Blocking always requires a reason.
          </p>
        </div>

        <div className="grid gap-3 border-b border-blue-50 px-4 py-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-semibold text-slate-600">
            Client
            <select
              value={filters.clientId}
              onChange={(event) => updateFilter('clientId', event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            >
              <option value="">All clients</option>
              {clientOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Department
            <select
              value={filters.departmentId}
              onChange={(event) => updateFilter('departmentId', event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            >
              <option value="">All departments</option>
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Host
            <select
              value={filters.hostId}
              onChange={(event) => updateFilter('hostId', event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            >
              <option value="">All hosts</option>
              {hostOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Session
            <select
              value={filters.sessionCode}
              onChange={(event) => updateFilter('sessionCode', event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            >
              <option value="">All sessions</option>
              {sessionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Search
            <input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="IP, host, session…"
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-50 px-4 py-2 text-xs text-slate-500">
          <p>
            Showing <span className="font-semibold text-navy-900">{filteredConnections.length}</span>{' '}
            of <span className="font-semibold text-navy-900">{openConnections.length}</span>{' '}
            connections
          </p>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="font-semibold text-navy-800 transition hover:text-navy-950"
          >
            Clear filters
          </button>
        </div>

        {!openConnections.length ? (
          <p className="px-4 py-6 text-sm text-slate-600">No open connections right now.</p>
        ) : !filteredConnections.length ? (
          <p className="px-4 py-6 text-sm text-slate-600">No connections match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-blue-100 bg-white">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">IP address</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Client</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Department</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Host</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Session</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Auth</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Connected</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredConnections.map((row) => {
                  const ip = row.ip_address || '—'
                  const alreadyBlocked = row.ip_address
                    ? blockedSet.has(String(row.ip_address).toLowerCase())
                    : false
                  const pending = busyKey === `block:${row.ip_address}`
                  return (
                    <tr
                      key={row.connection_id || `${row.session_code}:${row.role}:${ip}`}
                      className="border-b border-blue-50 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-900">
                        {ip}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.client_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.department_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{row.host_name || '—'}</div>
                        {row.host_email ? (
                          <div className="text-[11px] text-slate-500">{row.host_email}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-navy-900">{row.title || 'Untitled session'}</div>
                        <div className="font-mono text-[11px] text-slate-500">{row.session_code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatMonitorRole(row.role)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatAuthStatus(row.auth_status)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatConnectedAt(row.connected_at)}</td>
                      <td className="px-4 py-3">
                        {row.ip_address ? (
                          <button
                            type="button"
                            disabled={Boolean(busyKey) || alreadyBlocked}
                            onClick={() =>
                              setBlockTarget({
                                ip_address: row.ip_address,
                                context: `${row.session_code}/${row.role}`,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Ban className="size-3.5" />
                            {alreadyBlocked ? 'Blocked' : pending ? 'Blocking…' : 'Block IP'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No IP</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
        <div className="border-b border-blue-100 bg-blue-50/40 px-4 py-3">
          <h3 className="text-sm font-bold text-navy-900">Blocked IPs</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Block and unblock both require a reason. Blocked addresses cannot open WebSocket or API
            connections until unblocked.
          </p>
        </div>

        <form
          className="flex flex-wrap items-end gap-3 border-b border-blue-50 px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault()
            const ip = manualIp.trim()
            if (!ip || busyKey) return
            setBlockTarget({ ip_address: ip, context: 'manual' })
          }}
        >
          <label className="min-w-[12rem] flex-1 text-xs font-semibold text-slate-600">
            IP address
            <input
              value={manualIp}
              onChange={(event) => setManualIp(event.target.value)}
              placeholder="e.g. 203.0.113.10"
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            />
          </label>
          <button
            type="submit"
            disabled={!manualIp.trim() || Boolean(busyKey)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Ban className="size-4" />
            Block IP
          </button>
        </form>

        {!blocked.length ? (
          <p className="px-4 py-6 text-sm text-slate-600">No IP addresses are blocked.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-blue-100 bg-white">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">IP address</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Block reason</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Blocked by</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">When</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((row) => {
                  const pending = busyKey === `unblock:${row.ip_address}`
                  return (
                    <tr key={row.blocked_ip_id} className="border-b border-blue-50 last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-900">
                        {row.ip_address}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.reason || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.blocked_by_name || row.blocked_by_email || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatConnectedAt(row.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={Boolean(busyKey)}
                          onClick={() => setUnblockTarget(row)}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ShieldOff className="size-3.5" />
                          {pending ? 'Unblocking…' : 'Unblock'}
                        </button>
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
        title="Block this IP?"
        message={
          blockTarget
            ? `Block ${blockTarget.ip_address}? Open sockets from this address will be closed, and new WebSocket and API requests will be rejected until you unblock it.`
            : ''
        }
        confirmLabel="Block IP"
        pendingLabel="Blocking…"
        pending={Boolean(busyKey)}
        reasonLabel="Block reason"
        reasonPlaceholder="Why is this IP being blocked?"
        onCancel={() => {
          if (!busyKey) setBlockTarget(null)
        }}
        onConfirm={async (reason) => {
          if (!blockTarget) return
          try {
            await onBlockIp?.({
              ip_address: blockTarget.ip_address,
              reason,
            })
            setManualIp('')
          } finally {
            setBlockTarget(null)
          }
        }}
      />

      <ReasonConfirmModal
        open={Boolean(unblockTarget)}
        title="Unblock this IP?"
        message={
          unblockTarget
            ? `Allow ${unblockTarget.ip_address} to connect again? Existing sessions still need to reconnect themselves.`
            : ''
        }
        confirmLabel="Unblock IP"
        pendingLabel="Unblocking…"
        pending={Boolean(busyKey)}
        danger={false}
        reasonLabel="Unblock reason"
        reasonPlaceholder="Why is this IP being unblocked?"
        onCancel={() => {
          if (!busyKey) setUnblockTarget(null)
        }}
        onConfirm={async (reason) => {
          if (!unblockTarget) return
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
