import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import PageHero from '../components/marketing/PageHero'
import { HOW_IT_WORKS_STEPS } from '../constants/marketingPages'

function HowItWorksPage() {
  return (
    <div>
      <PageHero
        eyebrow="How it works"
        title="From signup to live results in a clear path"
        description="High Voltage separates marketing, hosting, and participant join so each audience gets a focused experience."
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary">
            Start free signup
            <ArrowRight className="size-4" />
          </Link>
          <Link to="/product-tour" className="btn-secondary">
            See product tour
          </Link>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((item, index) => (
            <article key={item.step} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="font-[family-name:var(--font-display)] text-3xl font-black text-accent">{item.step}</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.detail}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-navy-500">
                Stage {index + 1} of {HOW_IT_WORKS_STEPS.length}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-navy-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="eyebrow">Two applications, one product</p>
            <h2 className="section-heading mt-3 text-left">Marketing site + host portal</h2>
            <p className="mt-4 text-slate-600">
              This website helps you evaluate plans and register. Day-to-day session building, live control,
              and analytics live in the dedicated host portal.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-navy-800">
              {[
                'Public pages stay fast and focused for buyers',
                'Hosts get a full operations workspace',
                'Participants join through a lightweight browser flow',
              ].map((point) => (
                <li key={point} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-navy-900 p-8 text-white">
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">Typical first week</h3>
            <ol className="mt-5 space-y-4 text-sm text-slate-200">
              <li>1. Register and explore the host dashboard</li>
              <li>2. Build a short practice quiz with 5–8 questions</li>
              <li>3. Rehearse present mode on a second screen</li>
              <li>4. Run a live pilot with a small audience</li>
              <li>5. Export the report and refine your question pack</li>
            </ol>
            <Link to="/contact" className="btn-accent mt-8">
              Book an onboarding walkthrough
            </Link>
          </div>
        </div>
      </section>

      <CTASection
        title="Ready to try the flow yourself?"
        description="Create an account, then open the host portal to build your first session."
        primaryLabel="Register"
        primaryTo="/register"
        secondaryLabel="View pricing"
        secondaryTo="/pricing"
      />
    </div>
  )
}

export default HowItWorksPage
