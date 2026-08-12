import { Check, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPublicPlansApi } from '../services/publicApi'
import { getPlanDisplayPrice, COMPARISON_ROWS, formatPlanParticipantLimit } from '../constants/siteContent'
import CTASection from '../components/marketing/CTASection'
import { getAdminPortalUrl } from '../utils/adminPortal'

function PricingPage() {
  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: fetchPublicPlansApi,
  })

  const plans = plansQuery.data || []
  const featuredIndex = Math.min(1, Math.max(0, plans.length - 1))

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
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan, index) => {
              const price = getPlanDisplayPrice(plan.name)
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
                      {formatPlanParticipantLimit(plan.max_participants)}
                    </p>
                  </div>

                  <div className="mb-6">
                    <p className="text-4xl font-bold text-navy-900">
                      {price.label}
                      <span className="text-base font-medium text-slate-500">{price.period}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Payment gateway coming soon</p>
                  </div>

                  <ul className="mb-8 flex-1 space-y-3 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-navy-700" />
                      {formatPlanParticipantLimit(plan.max_participants)}
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-navy-700" />
                      Unlimited sessions
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-navy-700" />
                      Present mode & live analytics
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-navy-700" />
                      Host admin portal access
                    </li>
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

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-navy-950">Plan comparison</h2>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Feature</th>
                  <th className="px-4 py-3 font-semibold">Starter</th>
                  <th className="px-4 py-3 font-semibold">Standard</th>
                  <th className="px-4 py-3 font-semibold">Professional</th>
                  <th className="px-4 py-3 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.feature}</td>
                    {['starter', 'standard', 'professional', 'enterprise'].map((tier) => (
                      <td key={tier} className="px-4 py-3 text-slate-600">
                        {row[tier] ? (
                          <Check className="size-4 text-navy-700" />
                        ) : (
                          <span className="text-slate-300">—</span>
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
