import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

function CTASection({
  title = 'Ready to engage your next audience?',
  description = 'Choose a plan, create your host account, and start building interactive sessions in minutes.',
  primaryLabel = 'View pricing',
  primaryTo = '/pricing',
  secondaryLabel = 'Explore features',
  secondaryTo = '/features',
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-navy-900 via-navy-800 to-navy-700 px-8 py-12 text-center text-white shadow-2xl shadow-navy-900/30 sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
          <p className="mt-4 text-base text-slate-200 sm:text-lg">{description}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={primaryTo}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-navy-900 transition hover:bg-slate-100"
            >
              {primaryLabel}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to={secondaryTo}
              className="inline-flex items-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTASection
