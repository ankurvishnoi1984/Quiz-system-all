import { CalendarDays, CheckCircle2, HelpCircle, Layers, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'

function formatCount(value) {
  return Number(value || 0).toLocaleString()
}

function formatDate(value) {
  if (!value) return 'present'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function periodLabel(row) {
  const start = formatDate(row.started_at)
  const end = row.ended_at ? formatDate(row.ended_at) : 'present'
  const status =
    row.status === 'current' ? 'Current' : row.status === 'expired' ? 'Expired' : 'Past'
  return `${row.plan_name} · ${start} – ${end} (${status})`
}

function SummaryTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-blue-200/70 bg-white px-4 py-3 shadow-sm shadow-blue-900/5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-navy-900">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
        </div>
      </div>
    </div>
  )
}

export function PlanActivitySummary({ summary, history = [] }) {
  const [selected, setSelected] = useState('all')

  const selectedHistory = useMemo(
    () => history.find((row) => String(row.history_id) === String(selected)),
    [history, selected],
  )
  const view = selected === 'all' ? summary : selectedHistory?.summary
  const isPeriod = view?.scope === 'period'
  const periodName = view?.plan_name || selectedHistory?.plan_name

  if (!summary) return null

  const remaining =
    view?.days_remaining == null
      ? isPeriod
        ? `${formatDate(view.period_started_at)} – ${formatDate(view.period_ended_at)}`
        : 'No end date'
      : view.days_remaining < 0
        ? `Expired ${Math.abs(view.days_remaining)} day${Math.abs(view.days_remaining) === 1 ? '' : 's'} ago`
        : `${formatCount(view.days_remaining)} day${view.days_remaining === 1 ? '' : 's'} left`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy-900">Plan summary</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            {isPeriod
              ? `Activity while on ${periodName || 'this plan'}.`
              : 'All-time activity across every plan on this account. Choose a past plan to see that period only.'}
          </p>
        </div>
        {history.length ? (
          <label className="block min-w-[16rem] text-xs font-semibold text-slate-600">
            Show summary for
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            >
              <option value="all">All time</option>
              {history.map((row) => (
                <option key={row.history_id} value={row.history_id}>
                  {periodLabel(row)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {view ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryTile
            icon={CheckCircle2}
            label="Sessions"
            value={formatCount(view.sessions_total)}
            hint={`${formatCount(view.sessions_completed)} completed · ${formatCount(view.sessions_live)} live · ${formatCount(view.sessions_draft)} draft`}
          />
          <SummaryTile
            icon={Users}
            label="Participants joined"
            value={formatCount(view.participants_joined)}
            hint="Joins during this period, not only currently connected"
          />
          <SummaryTile
            icon={HelpCircle}
            label="Questions created"
            value={formatCount(view.questions_created)}
            hint={`${formatCount(view.responses_collected)} responses collected`}
          />
          <SummaryTile
            icon={Layers}
            label="Extra add-ons"
            value={formatCount(
              Number(view.extra_seats_purchased || 0) + Number(view.extra_questions_purchased || 0),
            )}
            hint={`${formatCount(view.extra_seats_purchased)} extra seats · ${formatCount(view.extra_questions_purchased)} extra questions`}
          />
          <SummaryTile
            icon={CalendarDays}
            label={isPeriod ? 'Time on this plan' : 'Time on current plan'}
            value={
              view.days_on_current_plan == null
                ? '—'
                : `${formatCount(view.days_on_current_plan)} day${view.days_on_current_plan === 1 ? '' : 's'}`
            }
            hint={remaining}
          />
          <SummaryTile
            icon={Wallet}
            label="Payments"
            value={view.total_paid_display || '₹0'}
            hint={`${formatCount(view.payments_count)} successful payment${view.payments_count === 1 ? '' : 's'}`}
          />
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
          No summary is available for this plan period.
        </p>
      )}
    </div>
  )
}
