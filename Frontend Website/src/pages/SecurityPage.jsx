import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import PageHero from '../components/marketing/PageHero'
import { SECURITY_PILLARS } from '../constants/marketingPages'

function SecurityPage() {
  return (
    <div>
      <PageHero
        eyebrow="Security & trust"
        title="Controls that respect live event reality"
        description="High Voltage combines authenticated host access, scoped participant tokens, and operational tools for busy live rooms."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {SECURITY_PILLARS.map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="inline-flex rounded-2xl bg-emerald-soft p-3 text-emerald">
                <ShieldCheck className="size-5" />
              </div>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-6 rounded-3xl bg-navy-950 p-8 text-white lg:grid-cols-3 lg:p-10">
          {[
            ['Role-based rights', 'Builders, hosts, and admins see only what they need.'],
            ['Live room tools', 'Lock joining and manage abusive traffic when required.'],
            ['Export discipline', 'Share reports intentionally — not through accidental public links.'],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold">{title}</h3>
              <p className="mt-2 text-sm text-slate-300">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          Need a security questionnaire for procurement?{' '}
          <Link to="/contact" className="font-semibold text-accent hover:underline">
            Contact the team
          </Link>
          .
        </p>
      </section>

      <CTASection
        title="Evaluate High Voltage with your IT team"
        description="We can walk through authentication, roles, and operational controls on a short call."
        primaryLabel="Talk to us"
        primaryTo="/contact"
        secondaryLabel="Enterprise overview"
        secondaryTo="/enterprise"
      />
    </div>
  )
}

export default SecurityPage
