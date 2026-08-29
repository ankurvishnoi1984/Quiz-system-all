import { Link } from 'react-router-dom'
import { HostAlertModal } from '../live/HostAlertModal'

export const PLAN_EXPIRY_WARNING_DAYS = 7

export function hasNoActivePlan(usage) {
  if (!usage) return false
  if (usage.unrestricted) return false
  if (usage.has_active_plan === false) return true
  return Boolean(usage.plan_expired)
}

export function getDaysUntilExpiry(usage) {
  if (usage?.days_until_expiry != null && Number.isFinite(Number(usage.days_until_expiry))) {
    return Number(usage.days_until_expiry)
  }
  if (!usage?.plan_expires_at || usage.plan_expired || !usage.has_active_plan) return null
  const expires = String(usage.plan_expires_at).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) return null
  const [ey, em, ed] = expires.split('-').map(Number)
  const now = new Date()
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const expMs = Date.UTC(ey, em - 1, ed)
  return Math.round((expMs - todayMs) / (24 * 60 * 60 * 1000))
}

/** Active plan that expires within the warning window (including today). */
export function isPlanExpiringSoon(usage) {
  if (!usage || hasNoActivePlan(usage) || usage.unrestricted) return false
  if (!usage.has_active_plan || usage.plan_expired) return false
  const days = getDaysUntilExpiry(usage)
  return days != null && days >= 0 && days <= PLAN_EXPIRY_WARNING_DAYS
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

export function formatPlanExpiringSoonMessage(usage) {
  if (!isPlanExpiringSoon(usage)) return null

  const planName = usage.plan?.name || usage.assigned_plan?.name || 'your plan'
  const days = getDaysUntilExpiry(usage)
  const expiresAt = usage.plan_expires_at
  const daysLabel =
    days === 0 ? 'today' : days === 1 ? 'in 1 day' : `in ${days} days`

  return {
    title: 'Plan expiring soon',
    message: `${planName} will expire ${daysLabel}${
      expiresAt ? ` (${expiresAt})` : ''
    }. Contact your administrator to renew so hosting stays uninterrupted.`,
    short:
      days === 0
        ? `${planName} expires today${expiresAt ? ` (${expiresAt})` : ''}. Renew to avoid interruption.`
        : days === 1
          ? `${planName} expires in 1 day${expiresAt ? ` (${expiresAt})` : ''}. Renew soon to avoid interruption.`
          : `${planName} expires in ${days} days${expiresAt ? ` (${expiresAt})` : ''}. Renew soon to avoid interruption.`,
    days,
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

export function PlanExpiringSoonBanner({ usage }) {
  const copy = formatPlanExpiringSoonMessage(usage)
  if (!copy) return null

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950 shadow-sm shadow-orange-900/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-800">
            Plan expiring soon
          </p>
          <p className="mt-1 font-semibold text-orange-950">{copy.short}</p>
        </div>
        <Link
          to="/my-plan"
          className="rounded-xl border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-900 transition hover:bg-orange-100"
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

export function PlanExpiringSoonModal({ open, usage, onClose }) {
  const copy = formatPlanExpiringSoonMessage(usage)
  return (
    <HostAlertModal
      open={Boolean(open && copy)}
      variant="warning"
      title={copy?.title || 'Plan expiring soon'}
      message={copy?.message || ''}
      confirmLabel="Got it"
      onClose={onClose}
    />
  )
}
