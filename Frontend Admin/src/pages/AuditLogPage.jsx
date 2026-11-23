import { ChevronDown, ChevronRight, ClipboardList, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { listAuditLogsApi } from '../services/auditLogApi'

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
]

const ACTOR_OPTIONS = [
  { value: '', label: 'All actors' },
  { value: 'user', label: 'User' },
  { value: 'participant', label: 'Participant' },
  { value: 'presenter_viewer', label: 'Presenter viewer' },
  { value: 'system', label: 'System' },
  { value: 'anonymous', label: 'Anonymous' },
]

const EMPTY_FILTERS = {
  action: '',
  entity_type: '',
  actor_type: '',
  actor_id: '',
  from: '',
  to: '',
}

const filterControlClass =
  'mt-0.5 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-navy-900'

const PAGE_SIZE = 50
const TEXT_DEBOUNCE_MS = 350

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function actionBadgeClass(action) {
  if (action === 'create') return 'bg-emerald-100 text-emerald-800'
  if (action === 'delete') return 'bg-rose-100 text-rose-800'
  return 'bg-amber-100 text-amber-900'
}

function stableStringify(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/** Compare before/after objects and list changed field names. */
function summarizeChanges(beforeValues, afterValues, action) {
  if (action === 'create') {
    const keys = afterValues && typeof afterValues === 'object' ? Object.keys(afterValues) : []
    return keys.length ? `Created fields: ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? '…' : ''}` : 'Created'
  }
  if (action === 'delete') {
    const keys = beforeValues && typeof beforeValues === 'object' ? Object.keys(beforeValues) : []
    return keys.length ? `Deleted fields: ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? '…' : ''}` : 'Deleted'
  }

  const before = beforeValues && typeof beforeValues === 'object' ? beforeValues : {}
  const after = afterValues && typeof afterValues === 'object' ? afterValues : {}
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  const changed = keys.filter((key) => stableStringify(before[key]) !== stableStringify(after[key]))
  if (!changed.length) return 'No field diffs recorded'
  return `Changed: ${changed.slice(0, 8).join(', ')}${changed.length > 8 ? '…' : ''}`
}

function DiffTable({ beforeValues, afterValues }) {
  const before = beforeValues && typeof beforeValues === 'object' ? beforeValues : {}
  const after = afterValues && typeof afterValues === 'object' ? afterValues : {}
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort()
  const rows = keys
    .map((key) => {
      const beforeText = key in before ? stableStringify(before[key]) : '—'
      const afterText = key in after ? stableStringify(after[key]) : '—'
      const changed = beforeText !== afterText
      return { key, beforeText, afterText, changed }
    })
    .filter((row) => row.changed)

  if (!rows.length) {
    return <p className="text-xs text-slate-500">No field-level differences to show.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-[11px]">
        <thead className="bg-slate-100 text-slate-500">
          <tr>
            <th className="px-2 py-1.5 font-semibold">Field</th>
            <th className="px-2 py-1.5 font-semibold">Before</th>
            <th className="px-2 py-1.5 font-semibold">After</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-slate-100 align-top">
              <td className="px-2 py-1.5 font-semibold text-navy-900">{row.key}</td>
              <td className="max-w-[220px] break-all px-2 py-1.5 text-rose-800/80">{row.beforeText}</td>
              <td className="max-w-[220px] break-all px-2 py-1.5 text-emerald-800/80">{row.afterText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function JsonBlock({ label, value }) {
  if (value == null) {
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-xs text-slate-500">None</p>
      </div>
    )
  }
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function AuditLogRow({ log }) {
  const [open, setOpen] = useState(false)
  const id = log.audit_log_id
  const changeSummary = summarizeChanges(log.before_values, log.after_values, log.action)

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50/80">
        <td className="px-3 py-2.5 align-top">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-navy-800 hover:bg-blue-50"
            aria-expanded={open}
            aria-controls={`audit-detail-${id}`}
          >
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            Details
          </button>
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 align-top text-xs text-slate-600">
          {formatDateTime(log.created_at)}
        </td>
        <td className="px-3 py-2.5 align-top">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${actionBadgeClass(
              log.action,
            )}`}
          >
            {log.action}
          </span>
        </td>
        <td className="px-3 py-2.5 align-top text-xs font-medium text-navy-900">
          <div>{log.entity_type || '—'}</div>
          <div className="font-normal text-slate-500">ID: {log.entity_id || '—'}</div>
        </td>
        <td className="px-3 py-2.5 align-top text-xs text-slate-700">
          <div className="font-medium capitalize">{log.actor_type || '—'}</div>
          <div className="text-slate-500">
            {log.actor_role || 'no role'}
            {log.actor_id ? ` · ${log.actor_id}` : ''}
          </div>
        </td>
        <td className="px-3 py-2.5 align-top text-xs text-slate-600">
          <div>Session: {log.session_id ?? '—'}</div>
          <div className="text-slate-400">
            Client {log.client_id ?? '—'} · Dept {log.dept_id ?? '—'}
          </div>
        </td>
        <td className="px-3 py-2.5 align-top text-xs text-slate-600">
          <div>{log.ip_address || '—'}</div>
          <div className="max-w-[200px] truncate text-slate-400" title={log.request_path || ''}>
            {[log.http_method, log.request_path].filter(Boolean).join(' ') || '—'}
          </div>
        </td>
        <td className="max-w-[220px] px-3 py-2.5 align-top text-xs text-slate-600">
          <p className="line-clamp-2" title={changeSummary}>
            {changeSummary}
          </p>
        </td>
      </tr>
      {open ? (
        <tr id={`audit-detail-${id}`} className="border-b border-slate-200 bg-slate-50/60">
          <td colSpan={8} className="px-4 py-3">
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Field changes
              </p>
              <DiffTable beforeValues={log.before_values} afterValues={log.after_values} />
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <JsonBlock label="Before (raw)" value={log.before_values} />
              <JsonBlock label="After (raw)" value={log.after_values} />
              <JsonBlock label="Metadata" value={log.metadata} />
            </div>
            <div className="mt-3 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
              <p>
                <span className="font-semibold text-slate-600">Request ID:</span>{' '}
                {log.request_id || '—'}
              </p>
              <p>
                <span className="font-semibold text-slate-600">Client / Dept / Session:</span>{' '}
                {log.client_id ?? '—'} / {log.dept_id ?? '—'} / {log.session_id ?? '—'}
              </p>
              <p>
                <span className="font-semibold text-slate-600">Actor:</span>{' '}
                {log.actor_type || '—'}
                {log.actor_role ? ` (${log.actor_role})` : ''}
                {log.actor_id ? ` #${log.actor_id}` : ''}
              </p>
              <p className="truncate" title={log.user_agent || ''}>
                <span className="font-semibold text-slate-600">User agent:</span>{' '}
                {log.user_agent || '—'}
              </p>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export default function AuditLogPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const debouncedText = useDebouncedValue(
    {
      entity_type: filters.entity_type,
      actor_id: filters.actor_id,
    },
    TEXT_DEBOUNCE_MS,
  )

  const queryFilters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.actor_type ? { actor_type: filters.actor_type } : {}),
      ...(filters.from ? { from: new Date(filters.from).toISOString() } : {}),
      ...(filters.to ? { to: new Date(filters.to).toISOString() } : {}),
      ...(debouncedText.entity_type.trim()
        ? { entity_type: debouncedText.entity_type.trim() }
        : {}),
      ...(debouncedText.actor_id.trim() ? { actor_id: debouncedText.actor_id.trim() } : {}),
    }),
    [page, filters.action, filters.actor_type, filters.from, filters.to, debouncedText],
  )

  useEffect(() => {
    setPage(1)
  }, [
    filters.action,
    filters.actor_type,
    filters.from,
    filters.to,
    debouncedText.entity_type,
    debouncedText.actor_id,
  ])

  const logsQuery = useQuery({
    queryKey: ['audit-logs', queryFilters],
    queryFn: () => listAuditLogsApi(accessToken, queryFilters),
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData,
  })

  const logs = logsQuery.data?.logs || []
  const pagination = logsQuery.data?.pagination
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1)
  const total = Number(pagination?.total) || 0

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-navy-800" aria-hidden />
            <h1 className="text-xl font-bold text-navy-900">Audit Log</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Super admin only — filters apply as you change them. Expand a row for field-level diffs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => logsQuery.refetch()}
          disabled={logsQuery.isFetching}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-navy-800 transition hover:bg-blue-50 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${logsQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-blue-200/70 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[110px] flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Action
            <select
              value={filters.action}
              onChange={(e) => setFilter('action', e.target.value)}
              className={filterControlClass}
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value || 'all-actions'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[130px] flex-[1.2] text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Entity type
            <input
              type="text"
              value={filters.entity_type}
              onChange={(e) => setFilter('entity_type', e.target.value)}
              placeholder="e.g. sessions"
              className={filterControlClass}
            />
          </label>
          <label className="min-w-[110px] flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Actor type
            <select
              value={filters.actor_type}
              onChange={(e) => setFilter('actor_type', e.target.value)}
              className={filterControlClass}
            >
              {ACTOR_OPTIONS.map((option) => (
                <option key={option.value || 'all-actors'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[120px] flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Actor ID
            <input
              type="text"
              value={filters.actor_id}
              onChange={(e) => setFilter('actor_id', e.target.value)}
              placeholder="User id"
              className={filterControlClass}
            />
          </label>
          <label className="min-w-[150px] flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            From
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(e) => setFilter('from', e.target.value)}
              className={filterControlClass}
            />
          </label>
          <label className="min-w-[150px] flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            To
            <input
              type="datetime-local"
              value={filters.to}
              onChange={(e) => setFilter('to', e.target.value)}
              className={filterControlClass}
            />
          </label>
          <button
            type="button"
            onClick={resetFilters}
            className="mb-px inline-flex h-8 shrink-0 items-center rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-navy-900">
            {total.toLocaleString()} event{total === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
            {logsQuery.isFetching ? ' · updating…' : ''}
          </p>
        </div>

        {logsQuery.isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Loading audit logs…</p>
        ) : logsQuery.isError ? (
          <p className="px-4 py-10 text-center text-sm font-semibold text-rose-700">
            {logsQuery.error?.message || 'Could not load audit logs'}
          </p>
        ) : logs.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No audit events match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5"> </th>
                  <th className="px-3 py-2.5">When</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Entity</th>
                  <th className="px-3 py-2.5">Actor</th>
                  <th className="px-3 py-2.5">Scope</th>
                  <th className="px-3 py-2.5">Request</th>
                  <th className="px-3 py-2.5">Summary</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <AuditLogRow key={String(log.audit_log_id)} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            disabled={page <= 1 || logsQuery.isFetching}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || logsQuery.isFetching}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
