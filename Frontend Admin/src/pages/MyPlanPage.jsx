import { useQuery } from '@tanstack/react-query'
import { PlanUsageCard } from '../components/dashboard/PlanUsageCard'
import { PlanActivitySummary } from '../components/plan/PlanActivitySummary'
import {
  PlanAddonHistory,
  PlanBillingTable,
  PlanHistoryTable,
} from '../components/plan/PlanHistoryTable'
import {
  PlanExpiredBanner,
  PlanManageBanner,
  buildPlanRenewHref,
  canSelfServePlanChange,
  hasNoActivePlan,
} from '../components/dashboard/PlanExpiredNotice'
import { useAuthStore } from '../store/authStore'
import { getPlanAccountApi, getPlanUsageApi } from '../services/managementApi'

function MyPlanPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)

  const usageQuery = useQuery({
    queryKey: ['plan-usage'],
    queryFn: () => getPlanUsageApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const accountQuery = useQuery({
    queryKey: ['plan-account'],
    queryFn: () => getPlanAccountApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const planLocked = hasNoActivePlan(usageQuery.data)
  const canManagePlan = canSelfServePlanChange(usageQuery.data)
  const renewHref = buildPlanRenewHref(usageQuery.data, user?.email)

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Account</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-navy-900">My Plan</h2>
            {planLocked ? (
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                Expired
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            See your current plan, usage summary, session activity, and a history of plans assigned to
            this account.
          </p>
        </div>
        {canManagePlan ? (
          <a
            href={renewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-2xl bg-linear-to-r from-blue-700 to-navy-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Renew
          </a>
        ) : planLocked ? (
          <a
            href={renewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-2xl bg-linear-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Renew
          </a>
        ) : null}
      </div>

      {usageQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-8 text-center text-slate-600">
          Loading plan details...
        </div>
      ) : null}

      {usageQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {usageQuery.error.message || 'Failed to load plan details'}
        </div>
      ) : null}

      {hasNoActivePlan(usageQuery.data) ? <PlanExpiredBanner usage={usageQuery.data} /> : null}
      {canManagePlan ? <PlanManageBanner usage={usageQuery.data} /> : null}
      {usageQuery.data ? <PlanUsageCard usage={usageQuery.data} /> : null}
      {accountQuery.data?.summary ? (
        <PlanActivitySummary summary={accountQuery.data.summary} history={accountQuery.data.history || []} />
      ) : null}

      {accountQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-8 text-center text-slate-600">
          Loading plan history...
        </div>
      ) : null}

      {accountQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {accountQuery.error.message || 'Failed to load plan history'}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
        <div className="border-b border-blue-100 bg-blue-50/50 px-4 py-3">
          <h3 className="text-sm font-semibold text-navy-900">Account details</h3>
        </div>
        <dl className="grid gap-px bg-blue-50 sm:grid-cols-2">
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">{user?.full_name || '—'}</dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">{user?.email || '—'}</dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned plan</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">
              {usageQuery.data?.assigned_plan?.name ||
                usageQuery.data?.plan?.name ||
                'No plan assigned'}
            </dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">
              {usageQuery.data?.plan?.is_free
                ? 'No end date'
                : usageQuery.data?.plan_expired
                  ? `Expired ${usageQuery.data.plan_expires_at || ''}`.trim()
                  : usageQuery.data?.plan_expires_at || 'No end date'}
            </dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Effective access
            </dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">
              {usageQuery.data?.plan_expired || usageQuery.data?.has_active_plan === false
                ? 'None — plan inactive'
                : usageQuery.data?.unrestricted
                  ? 'No account-wide participant cap'
                  : `${Number(usageQuery.data?.limit || 0).toLocaleString()} connected participants at the same time`}
            </dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Extra seats</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">
              {usageQuery.data?.plan_expired || usageQuery.data?.has_active_plan === false
                ? 'Paused while plan is inactive'
                : Number(usageQuery.data?.extra_participants || 0).toLocaleString()}
            </dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Questions per session
            </dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">
              {usageQuery.data?.plan_expired || usageQuery.data?.has_active_plan === false
                ? 'Paused while plan is inactive'
                : usageQuery.data?.unrestricted
                  ? 'No account-wide question cap'
                  : usageQuery.data?.max_questions_per_session != null
                    ? Number(usageQuery.data.max_questions_per_session).toLocaleString()
                    : '—'}
            </dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Extra questions
            </dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">
              {usageQuery.data?.plan_expired || usageQuery.data?.has_active_plan === false
                ? 'Paused while plan is inactive'
                : Number(usageQuery.data?.extra_questions || 0).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      {accountQuery.data ? (
        <>
          <PlanHistoryTable history={accountQuery.data.history} />
          <PlanBillingTable payments={accountQuery.data.payments} />
          <PlanAddonHistory addons={accountQuery.data.addons} />
        </>
      ) : null}
    </section>
  )
}

export default MyPlanPage
