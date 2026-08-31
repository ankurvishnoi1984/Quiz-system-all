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

export function canSelfServePlanChange(usage) {
  return Boolean(usage?.can_self_serve_plan_change)
}

export function buildPlanRenewHref(usage, email) {
  const planId =
    usage?.assigned_plan?.plan_id || usage?.plan?.plan_id || usage?.assigned_plan?.id || null
  const mode = canSelfServePlanChange(usage) ? 'change' : undefined
  return getPlanRenewUrl({ email, planId, mode })
}

function planDurationDays(usage) {
  const days = usage?.assigned_plan?.default_duration_days ?? usage?.plan?.default_duration_days
  const n = Number(days)
  return Number.isInteger(n) && n > 0 ? n : 30
}

function formatDaysLeftLabel(days) {
  if (days == null || days < 0) return null
  if (days === 0) return 'less than a day left'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

export const PLAN_CHANGE_NO_CARRY_OVER_NOTE =
  'Your current plan period ends immediately when you pay. Remaining days are not added to the new plan — the new period starts today with its full length.'

export function formatPlanChangeMessage(usage) {
  if (!canSelfServePlanChange(usage)) return null

  const planName = usage.assigned_plan?.name || usage.plan?.name || 'your plan'
  const days = getDaysUntilExpiry(usage)
  const daysLabel = formatDaysLeftLabel(days)
  const duration = planDurationDays(usage)
  const prefix = daysLabel ? `${planName} has ${daysLabel}. ` : `${planName} is active. `

  return {
    title: 'Manage your plan',
    message: `${prefix}If you renew, upgrade, or downgrade online, your current period ends immediately. Remaining days are not added; your new plan period starts today with its full length (${duration} days).`,
    short: `${prefix}Renew, upgrade, or downgrade online — remaining days are not carried over.`,
    durationDays: duration,
  }
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
  const duration = planDurationDays(usage)
  const daysLabel =
    days === 0 ? 'today' : days === 1 ? 'in 1 day' : `in ${days} days`
  const carryOverNote =
    `If you renew or change plan before then, your current period ends immediately and remaining days are not added — the new period starts today (${duration} days).`

  return {
    title: 'Plan expiring soon',
    message: `${planName} will expire ${daysLabel}${
      expiresAt ? ` (${expiresAt})` : ''
    }. Renew or change your plan online so hosting stays uninterrupted. ${carryOverNote}`,
    short:
      days === 0
        ? `${planName} expires today${expiresAt ? ` (${expiresAt})` : ''}. Renew or change plan — remaining days are not carried over.`
        : days === 1
          ? `${planName} expires in 1 day${expiresAt ? ` (${expiresAt})` : ''}. Renew or change plan — remaining days are not carried over.`
          : `${planName} expires in ${days} days${expiresAt ? ` (${expiresAt})` : ''}. Renew or change plan — remaining days are not carried over.`,
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
            Renew
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

export function PlanManageBanner({ usage }) {
  const copy = formatPlanChangeMessage(usage)
  const email = useAuthStore((state) => state.user?.email)
  if (!copy) return null

  const renewHref = buildPlanRenewHref(usage, email)

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 shadow-sm shadow-blue-900/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">
            Manage your plan
          </p>
          <p className="mt-1 font-semibold text-blue-950">{copy.short}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={renewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-blue-400 bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800"
          >
            Renew
          </a>
          <Link
            to="/my-plan"
            className="rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-900 transition hover:bg-blue-100"
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
      secondaryLabel="Renew"
      secondaryHref={renewHref}
      onClose={onClose}
    />
  )
}

export function PlanManageModal({ open, usage, onClose }) {
  const copy = formatPlanChangeMessage(usage)
  const email = useAuthStore((state) => state.user?.email)
  const renewHref = buildPlanRenewHref(usage, email)

  return (
    <HostAlertModal
      open={Boolean(open && copy)}
      variant="info"
      title={copy?.title || 'Manage your plan'}
      message={copy?.message || ''}
      confirmLabel="Got it"
      secondaryLabel="Renew"
      secondaryHref={renewHref}
      onClose={onClose}
    />
  )
}
