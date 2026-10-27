import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

function CTASection({
  title = 'Ready to power your next live session?',
  description = 'Pick a plan, create your host account, and start running interactive quizzes and polls in minutes.',
  primaryLabel = 'Get started',
  primaryTo = '/register',
  secondaryLabel = 'Talk to us',
  secondaryTo = '/contact',
}) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="cta-panel mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-8 py-12 text-center text-white shadow-2xl shadow-navy-900/30 sm:px-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber">High Voltage</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold sm:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-200 sm:text-lg">{description}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={primaryTo}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:bg-accent-hover"
          >
            {primaryLabel}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to={secondaryTo}
            className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default CTASection
