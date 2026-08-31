import { Link } from 'react-router-dom'
import { HostAlertModal } from '../live/HostAlertModal'
import { useAuthStore } from '../../store/authStore'
import { getPlanRenewUrl } from '../../utils/websiteUrl'

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

export function buildPlanRenewHref(usage, email) {
  const planId =
    usage?.assigned_plan?.plan_id || usage?.plan?.plan_id || usage?.assigned_plan?.id || null
  return getPlanRenewUrl({ email, planId })
}

export function formatNoActivePlanMessage(usage) {
  if (!hasNoActivePlan(usage)) return null

  const assigned = usage.assigned_plan?.name || usage.plan?.name || 'your plan'
  const expiredAt = usage.plan_expires_at

  if (usage.plan_expired) {
    return {
      title: 'No active plan',
      message: `${assigned} ended${expiredAt ? ` on ${expiredAt}` : ''}. Renew or change your plan online to create sessions, share, launch, and manage questions again. You can also ask your administrator to renew for you.`,
      short: `${assigned} ended${expiredAt ? ` on ${expiredAt}` : ''}. Renew to create, share, launch, and manage sessions.`,
    }
  }

  return {
    title: 'No active plan',
    message:
      'You do not have an active plan. Renew a plan online, or contact your administrator to assign one, before creating or managing sessions.',
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
    }. Renew or change your plan online so hosting stays uninterrupted.`,
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
  const email = useAuthStore((state) => state.user?.email)
  if (!copy) return null

  const renewHref = buildPlanRenewHref(usage, email)

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm shadow-amber-900/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            No active plan
          </p>
          <p className="mt-1 font-semibold text-amber-950">{copy.short}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={renewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-amber-400 bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
          >
            Renew plan
          </a>
          <Link
            to="/my-plan"
            className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            View plan
          </Link>
        </div>
      </div>
    </div>
  )
}

export function PlanExpiringSoonBanner({ usage }) {
  const copy = formatPlanExpiringSoonMessage(usage)
  const email = useAuthStore((state) => state.user?.email)
  if (!copy) return null

  const renewHref = buildPlanRenewHref(usage, email)

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950 shadow-sm shadow-orange-900/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-800">
            Plan expiring soon
          </p>
          <p className="mt-1 font-semibold text-orange-950">{copy.short}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={renewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-orange-400 bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700"
          >
            Renew plan
          </a>
          <Link
            to="/my-plan"
            className="rounded-xl border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-900 transition hover:bg-orange-100"
          >
            View plan
          </Link>
        </div>
      </div>
    </div>
  )
}

export function PlanExpiredModal({ open, usage, onClose }) {
  const copy = formatNoActivePlanMessage(usage)
  const email = useAuthStore((state) => state.user?.email)
  const renewHref = buildPlanRenewHref(usage, email)

  return (
    <HostAlertModal
      open={Boolean(open && copy)}
      variant="warning"
      title={copy?.title || 'No active plan'}
      message={copy?.message || ''}
      confirmLabel="Got it"
      secondaryLabel="Renew plan"
      secondaryHref={renewHref}
      onClose={onClose}
    />
  )
}

export function PlanExpiringSoonModal({ open, usage, onClose }) {
  const copy = formatPlanExpiringSoonMessage(usage)
  const email = useAuthStore((state) => state.user?.email)
  const renewHref = buildPlanRenewHref(usage, email)

  return (
    <HostAlertModal
      open={Boolean(open && copy)}
      variant="warning"
      title={copy?.title || 'Plan expiring soon'}
      message={copy?.message || ''}
      confirmLabel="Got it"
      secondaryLabel="Renew plan"
      secondaryHref={renewHref}
      onClose={onClose}
    />
  )
}
