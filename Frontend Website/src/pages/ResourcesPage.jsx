import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import PageHero from '../components/marketing/PageHero'
import { RESOURCE_ITEMS, TIP_ARTICLES } from '../constants/marketingPages'
import { SUPPORT_EMAIL } from '../constants/siteContent'
import { getAdminPortalUrl } from '../utils/adminPortal'

function ResourcesPage() {
  return (
    <div>
      <PageHero
        eyebrow="Resources"
        title="Guides, trust pages, and practical next steps"
        description="A fuller library for evaluating High Voltage — product, security, enterprise, and support."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {RESOURCE_ITEMS.map((item) => (
            <Link
              key={item.title}
              to={item.href}
              className="group rounded-3xl border border-slate-200 bg-white p-7 transition hover:border-navy-400 hover:shadow-md"
            >
              <span className="inline-flex rounded-full bg-navy-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy-700">
                {item.tag}
              </span>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950 group-hover:text-navy-800">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
              <span className="btn-link mt-5">
                Open
                <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Tips</p>
            <h2 className="section-heading mt-3">Practical reading</h2>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TIP_ARTICLES.map((article) => (
              <Link
                key={article.slug}
                to={article.href}
                className="rounded-3xl border border-slate-200 bg-linear-to-br from-white to-navy-50 p-6 transition hover:shadow-md"
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                  {article.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600">{article.summary}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-6 rounded-3xl border border-slate-200 bg-slate-50 p-8 lg:grid-cols-2 lg:p-10">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-navy-950">
              Host portal access
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              After registration, session building and live control happen in the dedicated admin application.
            </p>
            <a href={getAdminPortalUrl('/login')} className="btn-primary mt-6">
              Open host portal
              <ArrowRight className="size-4" />
            </a>
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-navy-950">
              Need help?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Start with the help center, or email support for onboarding and plan sizing.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/help" className="btn-secondary">
                Help center
              </Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-secondary">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        title="Prefer a guided walkthrough?"
        description="Book a short demo and we will map High Voltage to your training or event format."
        primaryLabel="Contact us"
        primaryTo="/contact"
        secondaryLabel="Product tour"
        secondaryTo="/product-tour"
      />
    </div>
  )
}

export default ResourcesPage
