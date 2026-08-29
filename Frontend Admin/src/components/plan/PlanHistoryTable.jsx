import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

const PAGE_SIZE = 5

const SOURCE_LABELS = {
  signup: 'Website signup',
  admin_assign: 'Assigned by admin',
  renewal: 'Renewed',
  backfill: 'Existing assignment',
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCount(value) {
  if (value == null || value === '') return '—'
  return Number(value).toLocaleString()
}

function StatusBadge({ status }) {
  const styles = {
    current: 'bg-emerald-100 text-emerald-800',
    expired: 'bg-amber-100 text-amber-800',
    ended: 'bg-slate-100 text-slate-600',
  }
  const labels = {
    current: 'Current',
    expired: 'Expired',
    ended: 'Ended',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status] || styles.ended}`}>
      {labels[status] || status}
    </span>
  )
}

function usePagedRows(rows) {
  const list = Array.isArray(rows) ? rows : []
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalPages))
  }, [totalPages])

  const start = (page - 1) * PAGE_SIZE
  return {
    page,
    setPage,
    totalPages,
    totalCount: list.length,
    visible: list.slice(start, start + PAGE_SIZE),
    rangeStart: list.length ? start + 1 : 0,
    rangeEnd: Math.min(start + PAGE_SIZE, list.length),
  }
}

function TablePagination({ page, setPage, totalPages, totalCount, rangeStart, rangeEnd }) {
  if (totalCount <= PAGE_SIZE) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 bg-white/95 px-4 py-3">
      <p className="text-sm text-slate-600">
        Showing <span className="font-semibold text-navy-900">{rangeStart}</span>–
        <span className="font-semibold text-navy-900">{rangeEnd}</span> of{' '}
        <span className="font-semibold text-navy-900">{totalCount.toLocaleString()}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          className="inline-flex h-9 items-center gap-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
          Previous
        </button>
        <span className="rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-semibold text-navy-900">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          className="inline-flex h-9 items-center gap-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function PlanHistoryTable({ history }) {
  const paged = usePagedRows(history)
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-sm font-semibold text-navy-900">Plan history</h3>
        <p className="mt-0.5 text-xs text-slate-500">Every plan assigned to this account, including the current one.</p>
      </div>
      {!history?.length ? (
        <p className="px-4 py-6 text-sm text-slate-600">No plan assignments recorded yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-blue-100 bg-white">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Started</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Ended</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Expiry</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Limit</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Source</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.visible.map((row) => (
                  <tr key={row.history_id} className="border-b border-blue-50 last:border-b-0">
                    <td className="px-4 py-3 font-semibold text-navy-900">{row.plan_name}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.started_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.ended_at)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.is_free ? 'No end date' : formatDate(row.expires_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatCount(row.max_participants)} connected
                      {row.max_questions_per_session != null
                        ? ` · ${formatCount(row.max_questions_per_session)} questions`
                        : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{SOURCE_LABELS[row.source] || row.source}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination {...paged} />
        </>
      )}
    </div>
  )
}

export function PlanBillingTable({ payments }) {
  const paged = usePagedRows(payments)
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-sm font-semibold text-navy-900">Billing history</h3>
        <p className="mt-0.5 text-xs text-slate-500">Payments recorded for this account.</p>
      </div>
      {!payments?.length ? (
        <p className="px-4 py-6 text-sm text-slate-600">No payments recorded yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-blue-100 bg-white">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Reference</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Plan</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Method</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {paged.visible.map((row) => (
                  <tr key={row.payment_id} className="border-b border-blue-50 last:border-b-0">
                    <td className="px-4 py-3 font-semibold text-navy-900">{row.payment_reference}</td>
                    <td className="px-4 py-3 text-slate-700">{row.plan_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.amount_display}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">{row.payment_method || '—'}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">{row.status}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.paid_at || row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination {...paged} />
        </>
      )}
    </div>
  )
}

export function PlanAddonHistory({ addons }) {
  const paged = usePagedRows(addons)
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
      <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
        <h3 className="text-sm font-semibold text-navy-900">Add-on history</h3>
        <p className="mt-0.5 text-xs text-slate-500">Extra seats and extra questions added to this account.</p>
      </div>
      {!addons?.length ? (
        <p className="px-4 py-6 text-sm text-slate-600">No extra seats or questions have been added.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-blue-100 bg-white">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Quantity</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Note</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Added</th>
                </tr>
              </thead>
              <tbody>
                {paged.visible.map((row) => (
                  <tr key={`${row.kind}-${row.addon_id}`} className="border-b border-blue-50 last:border-b-0">
                    <td className="px-4 py-3 font-semibold text-navy-900">
                      {row.kind === 'seats' ? 'Extra seats' : 'Extra questions'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatCount(row.quantity)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.note || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination {...paged} />
        </>
      )}
    </div>
  )
}
