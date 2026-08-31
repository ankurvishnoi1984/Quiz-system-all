import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { buildPlanRenewHref } from './PlanExpiredNotice'

function formatCount(value) {
  return Number(value || 0).toLocaleString()
}

function formatExpiryLabel(usage) {
  if (usage?.plan_expired) return `Expired ${usage.plan_expires_at || ''}`.trim()
  const days = usage?.days_until_expiry
  if (days != null && days >= 0 && days <= 7) {
    if (days === 0) return `Expires today`
    if (days === 1) return `Expires in 1 day`
    return `Expires in ${days} days`
  }
  if (usage?.plan_expires_at) return `Expires ${usage.plan_expires_at}`
  return null
}

export function PlanUsageCard({ usage, compact = false }) {
  const email = useAuthStore((state) => state.user?.email)
  if (!usage) return null

  const unrestricted = Boolean(usage.unrestricted)
  const exceeded = Boolean(usage.exceeded)
  const expired = Boolean(usage.plan_expired)
  const days =
    usage.days_until_expiry == null ? null : Number(usage.days_until_expiry)
  const renewHref = buildPlanRenewHref(usage, email)
  const limit = usage.limit
  const used = Number(usage.used || 0)
  const remaining = usage.remaining
  const percent = Math.min(100, Number(usage.percent_used || 0))
  const questionCap =
    usage.max_questions_per_session != null
      ? Number(usage.max_questions_per_session)
      : usage.plan?.max_questions_per_session != null
        ? Number(usage.plan.max_questions_per_session) +
          Number(usage.extra_questions || 0)
        : null
  const planQuestionLimit =
    usage.plan_question_limit != null
      ? Number(usage.plan_question_limit)
      : usage.plan?.max_questions_per_session != null
        ? Number(usage.plan.max_questions_per_session)
        : null
  const extraQuestions = Number(usage.extra_questions || 0)
  const planName =
    expired && usage.assigned_plan?.name
      ? `${usage.assigned_plan.name} (expired)`
      : usage.plan?.name || 'No plan assigned'
  const expiryLabel = formatExpiryLabel(usage)

  const statusClass = expired
    ? 'border-amber-200 bg-amber-50'
    : days != null && days >= 0 && days <= 7
      ? 'border-orange-200 bg-orange-50'
      : exceeded
        ? 'border-red-200 bg-red-50'
        : 'border-blue-200/70 bg-white/90'

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-sm shadow-blue-900/5 ${statusClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy-700">Your plan</p>
          <h3 className="mt-1 text-lg font-bold text-navy-900">{planName}</h3>
          {usage.plan?.description ? (
            <p className="mt-1 text-sm text-slate-600">{usage.plan.description}</p>
          ) : null}
          {expired ? (
            <p className="mt-1 text-sm font-medium text-amber-900">
              No active plan — renew to launch sessions and manage questions.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {expiryLabel ? (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                expired
                  ? 'bg-amber-100 text-amber-800'
                  : days != null && days >= 0 && days <= 7
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {expiryLabel}
            </span>
          ) : null}
          {unrestricted ? (
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              Unlimited
            </span>
          ) : null}
          {exceeded ? (
            <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
              Limit reached
            </span>
          ) : null}
          {expired ? (
            <a
              href={renewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-amber-400 bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
            >
              Renew plan
            </a>
          ) : null}
          {compact ? (
            <Link
              to="/my-plan"
              className="rounded-xl border border-blue-200/70 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 transition hover:bg-blue-50"
            >
              View details
            </Link>
          ) : null}
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Connected</p>
          <p className="mt-1 text-xl font-bold text-navy-900">{formatCount(used)}</p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remaining</p>
          <p className="mt-1 text-xl font-bold text-navy-900">
            {unrestricted ? 'Unlimited' : formatCount(remaining)}
          </p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total limit</p>
          <p className="mt-1 text-xl font-bold text-navy-900">
            {unrestricted ? 'No restriction' : formatCount(limit)}
          </p>
          {!unrestricted && Number(usage.extra_participants || 0) > 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              Plan {formatCount(usage.plan_limit)} + extra {formatCount(usage.extra_participants)}
            </p>
          ) : null}
        </div>
        {!compact ? (
          <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sessions</p>
            <p className="mt-1 text-xl font-bold text-navy-900">{formatCount(usage.sessions_count)}</p>
          </div>
        ) : null}
        {!compact && questionCap != null ? (
          <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Questions / session
            </p>
            <p className="mt-1 text-xl font-bold text-navy-900">{formatCount(questionCap)}</p>
            {extraQuestions > 0 && planQuestionLimit != null ? (
              <p className="mt-1 text-xs text-slate-500">
                Plan {formatCount(planQuestionLimit)} + extra {formatCount(extraQuestions)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {!unrestricted ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{percent}% of connected participant allowance in use</span>
            <span>
              {formatCount(used)} / {formatCount(limit)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${exceeded ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-navy-700'}`}
              style={{ width: `${Math.max(percent, used > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-sm text-slate-600">
        {expired
          ? 'Your plan has ended. Renew or change your plan online to create, share, launch, and manage sessions again.'
          : exceeded
            ? 'Your connected participant limit is full. New participants cannot join until someone disconnects or you upgrade your plan.'
            : unrestricted
              ? 'No paid-plan limit is assigned. Session-level max participants still apply.'
              : Number(usage.extra_participants || 0) > 0
                ? `Your plan includes ${formatCount(usage.plan_limit)} connected participants plus ${formatCount(usage.extra_participants)} paid extra seats at the same time. Participants free up capacity when they disconnect.`
                : 'This allowance counts participants with an active connection at the same time. Disconnecting frees up capacity for new joins.'}
      </p>
    </div>
  )
}
