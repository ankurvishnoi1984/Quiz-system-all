import { ArrowRight, BarChart3, CheckCircle2, MessageSquare, Presentation, Users, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatsBar from '../components/marketing/StatsBar'
import CTASection from '../components/marketing/CTASection'
import FAQSection from '../components/marketing/FAQSection'
import { CORE_FEATURES, HOW_IT_WORKS, TRUST_POINTS, USE_CASES } from '../constants/siteContent'

const heroIcons = [Zap, Users, BarChart3, Presentation]

function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="space-y-5">
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-navy-950 sm:text-5xl lg:text-6xl">
                Turn every meeting into an interactive experience
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-slate-600">
                Run live quizzes, polls, and surveys with a powerful host portal to build sessions,
                present on stage, and measure results.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/pricing" className="btn-primary">
                Start with pricing
                <ArrowRight className="size-4" />
              </Link>
              <Link to="/features" className="btn-secondary">
                See all features
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {TRUST_POINTS.slice(0, 2).map((point) => (
                <div key={point} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-navy-700" />
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card relative overflow-hidden p-6 sm:p-8">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-navy-400/15 blur-3xl" />
            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-900">Live session dashboard</p>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Live
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-700">Which topic should we cover next?</p>
                <div className="mt-4 space-y-2">
                  {[
                    { label: 'Product roadmap', pct: 38 },
                    { label: 'Customer success stories', pct: 27 },
                    { label: 'Team culture', pct: 21 },
                    { label: 'Training modules', pct: 14 },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex justify-between text-xs text-slate-600">
                        <span>{row.label}</span>
                        <span>{row.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-linear-to-r from-navy-800 to-navy-500"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {heroIcons.map((Icon, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm"
                  >
                    <Icon className="mx-auto size-5 text-navy-700" />
                    <p className="mt-2 text-xs font-medium text-slate-600">
                      {['Real-time', 'Audience', 'Analytics', 'Present'][index]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <StatsBar />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Platform capabilities</p>
          <h2 className="section-heading mt-3">Everything hosts need in one product</h2>
          <p className="section-subheading">
            From session creation to live presentation and post-event reporting — designed for facilitators
            who need reliability at scale.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CORE_FEATURES.map((feature) => (
            <article key={feature.title} className="glass-card p-6">
              <h3 className="text-lg font-semibold text-navy-900">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              <ul className="mt-4 space-y-2">
                {feature.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="size-4 text-navy-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link to="/features" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-navy-950">
            View detailed feature breakdown
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Use cases</p>
            <h2 className="section-heading mt-3">Built for teams that present to audiences</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {USE_CASES.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-xl bg-navy-50 p-3 text-navy-800">
                  <MessageSquare className="size-5" />
                </div>
                <h3 className="text-xl font-semibold text-navy-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Ideal for: {item.audience}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="section-heading mt-3">From signup to live session in four steps</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item) => (
            <article key={item.step} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-3xl font-bold text-navy-200">{item.step}</p>
              <h3 className="mt-4 text-lg font-semibold text-navy-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <FAQSection />
      <CTASection />
    </div>
  )
}

export default HomePage
