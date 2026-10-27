import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import PageHero from '../components/marketing/PageHero'
import { INTEGRATION_ITEMS } from '../constants/marketingPages'

function IntegrationsPage() {
  return (
    <div>
      <PageHero
        eyebrow="Integrations"
        title="Fits beside the tools you already run"
        description="High Voltage is browser-first. Use it with your meeting stack, slides, and reporting workflows — then talk to us about deeper connectors."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {['Zoom', 'Microsoft Teams', 'Google Meet', 'Webex', 'PowerPoint', 'LMS exports'].map((name) => (
            <span
              key={name}
              className="rounded-full border border-navy-100 bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-800"
            >
              {name}
            </span>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {INTEGRATION_ITEMS.map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-dashed border-navy-300 bg-sky-soft/50 p-8 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-navy-950">
            Need a specific connector?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Tell us which LMS, calendar, or SSO requirement matters for your rollout. Enterprise conversations
            help shape the roadmap.
          </p>
          <Link to="/contact" className="btn-primary mt-6">
            Share your integration needs
          </Link>
        </div>
      </section>

      <CTASection
        title="See how join + present fits your stack"
        description="Book a demo with your meeting and training tools in mind."
        primaryLabel="Book a demo"
        primaryTo="/contact"
        secondaryLabel="Product tour"
        secondaryTo="/product-tour"
      />
    </div>
  )
}

export default IntegrationsPage
