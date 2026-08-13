import { Link } from 'react-router-dom'
import { HostAlertModal } from '../live/HostAlertModal'

export function hasNoActivePlan(usage) {
  if (!usage) return false
  if (usage.unrestricted) return false
  if (usage.has_active_plan === false) return true
  return Boolean(usage.plan_expired)
}

export function formatNoActivePlanMessage(usage) {
  if (!hasNoActivePlan(usage)) return null

  const assigned = usage.assigned_plan?.name || usage.plan?.name || 'your plan'
  const expiredAt = usage.plan_expires_at

  if (usage.plan_expired) {
    return {
      title: 'No active plan',
      message: `${assigned} ended${expiredAt ? ` on ${expiredAt}` : ''}. Creating sessions, sharing, editing, launching, and managing questions are paused until your administrator renews your plan.`,
      short: `${assigned} ended${expiredAt ? ` on ${expiredAt}` : ''}. Renew to create, share, launch, and manage sessions.`,
    }
  }

  return {
    title: 'No active plan',
    message:
      'You do not have an active plan. Contact your administrator to assign or renew a plan before creating or managing sessions.',
    short: 'No active plan — renew to create, share, launch, and manage sessions.',
  }
}

/** @deprecated Prefer formatNoActivePlanMessage */
export function formatPlanExpiryMessage(usage) {
  return formatNoActivePlanMessage(usage)
}

export function PlanExpiredBanner({ usage }) {
  const copy = formatNoActivePlanMessage(usage)
  if (!copy) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm shadow-amber-900/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            No active plan
          </p>
          <p className="mt-1 font-semibold text-amber-950">{copy.short}</p>
        </div>
        <Link
          to="/my-plan"
          className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          View plan
        </Link>
      </div>
    </div>
  )
}

export function PlanExpiredModal({ open, usage, onClose }) {
  const copy = formatNoActivePlanMessage(usage)
  return (
    <HostAlertModal
      open={Boolean(open && copy)}
      variant="warning"
      title={copy?.title || 'No active plan'}
      message={copy?.message || ''}
      confirmLabel="Got it"
      onClose={onClose}
    />
  )
}
