import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import PageHero from '../components/marketing/PageHero'
import { HELP_TOPICS } from '../constants/marketingPages'
import { SUPPORT_EMAIL } from '../constants/siteContent'
import { getAdminPortalUrl } from '../utils/adminPortal'

function HelpPage() {
  return (
    <div>
      <PageHero
        eyebrow="Help center"
        title="Get unblocked quickly"
        description="Start with common fixes below, then reach support with the details we need to help fast."
      >
        <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-primary">
          Email {SUPPORT_EMAIL}
        </a>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {HELP_TOPICS.map((topic) => (
            <article key={topic.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                {topic.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{topic.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <a
            href={getAdminPortalUrl('/login')}
            className="rounded-3xl bg-navy-900 p-6 text-white transition hover:bg-navy-800"
          >
            <p className="font-[family-name:var(--font-display)] text-lg font-extrabold">Host portal login</p>
            <p className="mt-2 text-sm text-slate-300">Build sessions and manage live events.</p>
          </a>
          <Link to="/faq" className="rounded-3xl bg-sky-soft p-6 transition hover:brightness-95">
            <p className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">FAQ</p>
            <p className="mt-2 text-sm text-slate-600">Plan limits, joining, branding, and admin questions.</p>
          </Link>
          <Link to="/contact" className="rounded-3xl bg-accent-soft p-6 transition hover:brightness-95">
            <p className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">Contact</p>
            <p className="mt-2 text-sm text-slate-600">Demo requests and enterprise sizing help.</p>
          </Link>
        </div>
      </section>

      <CTASection
        title="Still need a hand?"
        description="Include your organization name, approximate audience size, and screenshots when you email support."
        primaryLabel="Contact us"
        primaryTo="/contact"
        secondaryLabel="Security page"
        secondaryTo="/security"
      />
    </div>
  )
}

export default HelpPage
