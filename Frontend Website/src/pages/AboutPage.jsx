import { Building2, Globe, Mail, Target } from 'lucide-react'
import CTASection from '../components/marketing/CTASection'
import { SITE_NAME, SUPPORT_EMAIL, TRUST_POINTS } from '../constants/siteContent'
import { getAdminPortalUrl } from '../utils/adminPortal'

const values = [
  {
    icon: Target,
    title: 'Audience-first design',
    description: 'Every feature is evaluated by how it improves clarity, participation, and outcomes for live audiences.',
  },
  {
    icon: Building2,
    title: 'Built for organizations',
    description: 'Clients, departments, roles, and plans give enterprises the structure they need to scale responsibly.',
  },
  {
    icon: Globe,
    title: 'Hybrid-ready',
    description: 'Whether your audience is in the room, on Zoom, or fully remote, join flows work in the browser.',
  },
  {
    icon: Mail,
    title: 'Partnership mindset',
    description: 'We work with teams who run recurring events and need a dependable engagement layer behind them.',
  },
]

function AboutPage() {
  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">About</p>
            <h1 className="section-heading mt-3">Helping presenters create memorable moments</h1>
            <p className="section-subheading">
              {SITE_NAME} is developed by Netcast Services to give facilitators, trainers, and event teams a
              professional alternative to generic polling tools — with deeper session control and reporting.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-5 text-sm leading-relaxed text-slate-600 sm:text-base">
            <p>
              We built this platform because live sessions deserve more than a single poll on a slide. Hosts need
              to combine quizzes, surveys, polls, and presentation workflows without juggling multiple products.
            </p>
            <p>
              The product is split intentionally: this website explains the offering, pricing, and registration.
              The host admin portal — hosted on its own URL — is where customers manage day-to-day operations.
            </p>
            <p>
              That separation keeps the marketing experience fast and focused while the admin application can
              evolve with advanced tools for builders, live operators, and platform administrators.
            </p>
          </div>
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold text-navy-950">Platform at a glance</h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-700">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="rounded-xl bg-slate-50 px-4 py-3">{point}</li>
              ))}
            </ul>
            <a href={getAdminPortalUrl('/login')} className="btn-primary mt-6 w-full">
              Open host portal
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-100/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-navy-950">What we believe</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {values.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <Icon className="size-6 text-navy-700" />
                  <h3 className="mt-4 text-lg font-semibold text-navy-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-navy-950">Get in touch</h2>
        <p className="mt-4 text-slate-600">
          For enterprise plans, custom onboarding, or partnership inquiries, contact our team at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-navy-800 hover:text-navy-950">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>

      <CTASection />
    </div>
  )
}

export default AboutPage
