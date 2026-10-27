import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import PageHero from '../components/marketing/PageHero'
import { ENTERPRISE_POINTS } from '../constants/marketingPages'

function EnterprisePage() {
  return (
    <div>
      <PageHero
        eyebrow="Enterprise"
        title="Built for organizations that run many live sessions"
        description="Departments, roles, plan administration, and concurrent capacity controls help larger teams scale without chaos."
      >
        <Link to="/contact" className="btn-primary">
          Talk to enterprise sales
        </Link>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ENTERPRISE_POINTS.map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-2xl bg-navy-50 p-3 text-navy-800">
                <Building2 className="size-5" />
              </div>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-slate-200">
          <div className="bg-navy-900 px-6 py-4 text-white sm:px-8">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold">
              What procurement usually asks
            </h2>
          </div>
          <div className="grid gap-0 bg-white md:grid-cols-2">
            {[
              ['Who owns sessions?', 'Departments and roles keep ownership clear across teams.'],
              ['How is capacity billed?', 'Plans limit concurrent live connections across your account.'],
              ['Can we pilot first?', 'Yes — start with a plan tier and expand seats as adoption grows.'],
              ['Is there onboarding support?', 'We offer guided walkthroughs for host workflows and present mode.'],
            ].map(([q, a]) => (
              <div key={q} className="border-t border-slate-100 p-6">
                <p className="font-semibold text-navy-950">{q}</p>
                <p className="mt-2 text-sm text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Plan an enterprise rollout"
        description="Share your peak concurrent audience and number of hosting teams — we will propose a structure."
        primaryLabel="Contact enterprise"
        primaryTo="/contact"
        secondaryLabel="Security overview"
        secondaryTo="/security"
      />
    </div>
  )
}

export default EnterprisePage
