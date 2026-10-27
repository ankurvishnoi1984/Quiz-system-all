import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import PageHero from '../components/marketing/PageHero'
import { USE_CASE_PAGES } from '../constants/marketingPages'

function UseCasesPage() {
  return (
    <div>
      <PageHero
        eyebrow="Use cases"
        title="Where High Voltage fits best"
        description="One host portal for training rooms, classrooms, town halls, and events — with live capacity that matches your plan."
      />

      <section className="mx-auto max-w-7xl space-y-10 px-4 py-16 sm:px-6 lg:px-8">
        {USE_CASE_PAGES.map((item, index) => (
          <article
            key={item.slug}
            id={item.slug}
            className={`grid items-start gap-8 rounded-3xl border border-slate-200 bg-white p-8 lg:grid-cols-2 lg:p-10 ${
              index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
            }`}
          >
            <div>
              <p className="eyebrow">{item.audience}</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-navy-950">
                {item.headline}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">{item.description}</p>
              {(item.longCopy || []).map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-relaxed text-slate-600">
                  {paragraph}
                </p>
              ))}
              <ul className="mt-5 space-y-2">
                {item.highlights.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-sm text-navy-800">
                    <CheckCircle2 className="size-4 text-navy-700" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="btn-link mt-6">
                Discuss this use case
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="rounded-3xl bg-navy-900 p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">{item.title}</p>
              <p className="mt-4 font-[family-name:var(--font-display)] text-2xl font-extrabold leading-snug">
                Built for facilitators who need reliability when the room is full.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                Share a join link or QR code, present results live, and export the session afterward.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {item.highlights.map((point) => (
                  <div key={point} className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <CTASection
        title="Not sure which use case matches?"
        description="Tell us about your audience size and format — we will recommend a plan and walk you through a demo."
        primaryLabel="Contact sales"
        primaryTo="/contact"
        secondaryLabel="Solutions overview"
        secondaryTo="/solutions"
      />
    </div>
  )
}

export default UseCasesPage
