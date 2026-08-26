import { Check, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicPlansApi } from '../services/publicApi'
import {
  getPlanDisplayPrice,
  formatPlanParticipantLimit,
  formatPlanParticipantLimitShort,
  formatPlanQuestionLimit,
  formatPlanQuestionLimitShort,
} from '../constants/siteContent'
import CTASection from '../components/marketing/CTASection'
import { getAdminPortalUrl } from '../utils/adminPortal'

const SHARED_FEATURES = [
  'Unlimited sessions',
  'Present mode & live analytics',
  'Host admin portal access',
]

function PricingPage() {
  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: fetchPublicPlansApi,
  })

  const plans = plansQuery.data || []
  const featuredIndex = Math.min(1, Math.max(0, plans.length - 1))

  const comparisonRows = useMemo(() => {
    if (!plans.length) return []
    return [
      {
        feature: 'Monthly price',
        values: plans.map((plan) => {
          const price = getPlanDisplayPrice(plan)
          return price.monthly != null ? `${price.label}${price.period}` : price.label
        }),
      },
      {
        feature: 'Live participants at once',
        values: plans.map((plan) => formatPlanParticipantLimitShort(plan.max_participants)),
      },
      {
        feature: 'Questions per session',
        values: plans.map((plan) =>
          formatPlanQuestionLimitShort(plan.max_questions_per_session),
        ),
      },
      ...SHARED_FEATURES.map((feature) => ({
        feature,
        values: plans.map(() => true),
      })),
    ]
  }, [plans])

  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Pricing</p>
            <h1 className="section-heading mt-3">Transparent plans for every event size</h1>
            <p className="section-subheading">
              Plans limit how many participants can be connected at the same time while your sessions are live.
              Select a plan, register, and access the host portal immediately. Online payments will be enabled in a
              future release.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {plansQuery.isLoading ? (
          <div className="flex justify-center py-20">
            <LoaderCircle className="size-8 animate-spin text-navy-700" />
          </div>
        ) : plansQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            Unable to load plans. Please try again later.
          </div>
        ) : !plans.length ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            No public plans are available yet. Please check back soon.
          </div>
        ) : (
          <div
            className={`grid gap-6 md:grid-cols-2 ${
              plans.length >= 4 ? 'xl:grid-cols-4' : plans.length === 3 ? 'xl:grid-cols-3' : ''
            }`}
          >
            {plans.map((plan, index) => {
              const price = getPlanDisplayPrice(plan)
              const isFeatured = index === featuredIndex

              return (
                <article
                  key={plan.plan_id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    isFeatured
                      ? 'border-navy-700 bg-white shadow-xl shadow-navy-900/10 ring-2 ring-navy-700/15'
                      : 'border-slate-200 bg-white shadow-sm'
                  }`}
                >
                  {isFeatured ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-navy-800 px-3 py-1 text-xs font-semibold text-white">
                      Most popular
                    </span>
                  ) : null}

                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-navy-950">{plan.name}</h2>
                    <p className="mt-2 min-h-12 text-sm text-slate-600">
                      {plan.description || formatPlanParticipantLimit(plan.max_participants)}
                    </p>
                  </div>

                  <div className="mb-6">
                    <p className="text-4xl font-bold text-navy-900">
                      {price.label}
                      {price.period ? (
                        <span className="text-base font-medium text-slate-500">{price.period}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Demo checkout — card & UPI</p>
                  </div>

                  <ul className="mb-8 flex-1 space-y-3 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-navy-700" />
                      {formatPlanParticipantLimit(plan.max_participants)}
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-navy-700" />
                      {formatPlanQuestionLimit(plan.max_questions_per_session)}
                    </li>
                    {SHARED_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-navy-700" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={`/register?plan=${plan.plan_id}`}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      isFeatured
                        ? 'bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-white shadow-lg shadow-navy-900/20 hover:brightness-110'
                        : 'border border-navy-700 text-navy-800 hover:bg-navy-50'
                    }`}
                  >
                    Buy plan
                  </Link>
                </article>
              )
            })}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-slate-500">
          Already registered?{' '}
          <a href={getAdminPortalUrl('/login')} className="font-medium text-navy-800 hover:text-navy-950">
            Sign in to the host portal
          </a>
        </p>
      </section>

      {plans.length ? (
        <section className="border-y border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-navy-950">Plan comparison</h2>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Feature</th>
                    {plans.map((plan) => (
                      <th key={plan.plan_id} className="px-4 py-3 font-semibold">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.feature} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.feature}</td>
                      {row.values.map((value, index) => (
                        <td key={`${row.feature}-${plans[index]?.plan_id || index}`} className="px-4 py-3 text-slate-600">
                          {value === true ? (
                            <Check className="size-4 text-navy-700" />
                          ) : value === false ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            value
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <CTASection
        title="Need help choosing a plan?"
        description="Estimate the largest number of people who will be connected at the same time during your live events. You can request extra concurrent seats from your administrator later."
        primaryLabel="Create account"
        primaryTo="/register"
        secondaryLabel="Contact via About page"
        secondaryTo="/about"
      />
    </div>
  )
}

export default PricingPage
