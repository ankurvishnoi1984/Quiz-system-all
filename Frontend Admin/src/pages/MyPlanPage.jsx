import { useQuery } from '@tanstack/react-query'
import { PlanUsageCard } from '../components/dashboard/PlanUsageCard'
import { useAuthStore } from '../store/authStore'
import { getPlanUsageApi } from '../services/managementApi'

function MyPlanPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)

  const usageQuery = useQuery({
    queryKey: ['plan-usage'],
    queryFn: () => getPlanUsageApi(accessToken),
    enabled: Boolean(accessToken),
  })

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Account</p>
        <h2 className="mt-1 text-2xl font-bold text-navy-900">My Plan</h2>
        <p className="mt-1 text-sm text-slate-600">
          See your current plan, how many participants are connected right now, and how many join slots remain.
        </p>
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

      {usageQuery.data ? <PlanUsageCard usage={usageQuery.data} /> : null}

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
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">
              {usageQuery.data?.plan?.name || 'No plan assigned'}
            </dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Restrictions</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">
              {usageQuery.data?.unrestricted
                ? 'No account-wide participant cap'
                : `${Number(usageQuery.data?.limit || 0).toLocaleString()} connected participants at the same time`}
            </dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan seats</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">
              {usageQuery.data?.unrestricted
                ? '—'
                : Number(usageQuery.data?.plan_limit || 0).toLocaleString()}
            </dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Extra seats</dt>
            <dd className="mt-1 text-sm font-semibold text-navy-900">
              {Number(usageQuery.data?.extra_participants || 0).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

export default MyPlanPage
