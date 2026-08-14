import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Headphones,
  Mail,
  MessageSquare,
  Presentation,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import StatsBar from '../components/marketing/StatsBar'
import CTASection from '../components/marketing/CTASection'
import FAQSection from '../components/marketing/FAQSection'
import { CORE_FEATURES, HOW_IT_WORKS, SUPPORT_EMAIL, TRUST_POINTS, USE_CASES } from '../constants/siteContent'

const heroHighlights = [
  { icon: Sparkles, title: 'Quizzes', detail: 'Timed scoring & leaderboards' },
  { icon: ClipboardList, title: 'Polls & surveys', detail: 'Instant audience feedback' },
  { icon: Presentation, title: 'Present mode', detail: 'Stage-ready full screen' },
  { icon: BarChart3, title: 'Reports', detail: 'PDF & Excel exports' },
]

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
                Run live quizzes, polls, and surveys with a powerful host portal. Plans scale by how many
                participants can be connected at the same time during your live events.
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

          <div className="relative">
            <div className="absolute -right-8 -top-10 h-44 w-44 rounded-full bg-navy-400/25 blur-3xl" />
            <div className="absolute -bottom-10 -left-8 h-36 w-36 rounded-full bg-accent/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-navy-950 via-navy-900 to-navy-800 p-6 text-white shadow-2xl shadow-navy-900/25 sm:p-8">
              <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10 blur-2xl" />

              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-navy-400">
                  Host workspace
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  Build. Present. Measure.
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-300">
                  A dedicated portal for quizzes, polls, surveys, and reports — ready for events,
                  training, and meetings.
                </p>
              </div>

              <div className="relative mt-7 grid grid-cols-2 gap-3">
                {heroHighlights.map(({ icon: Icon, title, detail }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                  >
                    <Icon className="size-5 text-navy-400" />
                    <p className="mt-3 text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-xs text-slate-400">{detail}</p>
                  </div>
                ))}
              </div>

              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="relative mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white px-4 py-4 text-navy-950 shadow-lg transition hover:bg-slate-50"
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                  <Headphones className="size-5" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Talk to support
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
                    <Mail className="size-3.5 shrink-0 text-navy-700" />
                    {SUPPORT_EMAIL}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-navy-700" />
              </a>
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
