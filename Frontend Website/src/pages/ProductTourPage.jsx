import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import PageHero from '../components/marketing/PageHero'
import { TOUR_SECTIONS } from '../constants/marketingPages'
import { getAdminPortalUrl } from '../utils/adminPortal'

function ProductTourPage() {
  return (
    <div>
      <PageHero
        eyebrow="Product tour"
        title="A guided look at the High Voltage workspace"
        description="Explore the surfaces hosts and participants use — from the dashboard to present mode and exports."
      >
        <a href={getAdminPortalUrl('/login')} className="btn-primary">
          Open host portal
          <ArrowRight className="size-4" />
        </a>
      </PageHero>

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
        {TOUR_SECTIONS.map((section, index) => (
          <article
            key={section.title}
            className={`grid gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-2 lg:p-10 ${
              index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
            }`}
          >
            <div>
              <p className="eyebrow">Step {index + 1}</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-navy-950">
                {section.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">{section.body}</p>
              <ul className="mt-5 space-y-2">
                {section.points.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-sm text-navy-800">
                    <span className="size-1.5 rounded-full bg-accent" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-linear-to-br from-navy-900 via-navy-800 to-navy-700 p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber">{section.title}</p>
              <p className="mt-4 text-lg font-semibold leading-relaxed text-slate-100">
                Designed so facilitators can move quickly under live pressure — without juggling multiple tools.
              </p>
              <Link to="/features" className="btn-link mt-6 text-white hover:text-amber">
                Related features
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </article>
        ))}
      </section>

      <CTASection
        title="Want a live walkthrough?"
        description="Book a demo and we will show builder, present mode, and reporting with your use case in mind."
        primaryLabel="Contact us"
        primaryTo="/contact"
        secondaryLabel="How it works"
        secondaryTo="/how-it-works"
      />
    </div>
  )
}

export default ProductTourPage
