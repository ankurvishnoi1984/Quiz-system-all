import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import FAQSection from '../components/marketing/FAQSection'
import PageHero from '../components/marketing/PageHero'

function FaqPage() {
  return (
    <div>
      <PageHero
        eyebrow="FAQ"
        title="Answers before you buy — and after you go live"
        description="Common questions about participant limits, joining, branding, payments, and administration."
      >
        <p className="text-sm text-slate-600">
          Still stuck? Visit the{' '}
          <Link to="/help" className="font-semibold text-accent hover:underline">
            help center
          </Link>{' '}
          or{' '}
          <Link to="/contact" className="font-semibold text-accent hover:underline">
            contact us
          </Link>
          .
        </p>
      </PageHero>

      <FAQSection title="Frequently asked questions" />

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-8 md:grid-cols-3">
          {[
            ['How it works', '/how-it-works', 'See the end-to-end journey'],
            ['Pricing', '/pricing', 'Match capacity to your peak room'],
            ['Security', '/security', 'Review trust & access controls'],
          ].map(([title, href, body]) => (
            <Link key={href} to={href} className="rounded-2xl bg-navy-50 p-5 transition hover:bg-navy-100">
              <p className="font-[family-name:var(--font-display)] font-extrabold text-navy-950">{title}</p>
              <p className="mt-2 text-sm text-slate-600">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      <CTASection
        title="Didn’t find your answer?"
        description="Send your question with organization details — we usually reply with a concrete next step."
        primaryLabel="Contact support"
        primaryTo="/contact"
        secondaryLabel="Help center"
        secondaryTo="/help"
      />
    </div>
  )
}

export default FaqPage
