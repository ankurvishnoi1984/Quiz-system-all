import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import PageHero from '../components/marketing/PageHero'
import { SOLUTION_PILLARS } from '../constants/marketingPages'

function SolutionsPage() {
  return (
    <div>
      <PageHero
        eyebrow="Solutions"
        title="High Voltage for the rooms you actually run"
        description="Whether you teach, train, communicate, or produce events — the same live engagement core adapts to your format."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {SOLUTION_PILLARS.map((item, index) => {
            const chips = ['chip-sky', 'chip-emerald', 'chip-amber', 'chip-coral']
            return (
              <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wider ${chips[index % chips.length]}`}>
                  Solution
                </span>
                <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-extrabold text-navy-950">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
                <ul className="mt-5 space-y-2">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-sm text-navy-800">
                      <span className="size-1.5 rounded-full bg-accent" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link to={item.href} className="btn-link mt-6">
                  Explore use case
                  <ArrowRight className="size-4" />
                </Link>
              </article>
            )
          })}
        </div>

        <div className="mt-12 grid gap-6 rounded-3xl bg-linear-to-r from-navy-900 to-navy-700 p-8 text-white lg:grid-cols-3 lg:p-10">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold">Not sure where you fit?</h3>
            <p className="mt-2 text-sm text-slate-200">
              Most organizations mix formats — training this week, a town hall next month.
            </p>
          </div>
          <div className="text-sm text-slate-200">
            Start with concurrent capacity sizing on Pricing, then map features to your highest-stakes room.
          </div>
          <div className="flex items-center">
            <Link to="/enterprise" className="btn-accent">
              See enterprise options
            </Link>
          </div>
        </div>
      </section>

      <CTASection
        title="Match High Voltage to your program"
        description="Tell us your audience size and format — we will recommend a plan and demo path."
        primaryLabel="Contact sales"
        primaryTo="/contact"
        secondaryLabel="View use cases"
        secondaryTo="/use-cases"
      />
    </div>
  )
}

export default SolutionsPage
