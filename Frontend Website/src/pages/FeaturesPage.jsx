import {
  BarChart3,
  CheckCircle2,
  LayoutDashboard,
  MonitorPlay,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import CTASection from '../components/marketing/CTASection'
import FAQSection from '../components/marketing/FAQSection'
import { CORE_FEATURES, TRUST_POINTS } from '../constants/siteContent'

const detailSections = [
  {
    icon: LayoutDashboard,
    title: 'Session builder',
    paragraphs: [
      'Organize content into question sets, configure timers, scoring rules, and navigation behavior before you go live.',
      'Duplicate sessions, preview the participant journey, and update branding — including per-session logos for live events.',
    ],
    bullets: ['Multiple question types', 'Survey & quiz modes', 'Scheduled start times'],
  },
  {
    icon: MonitorPlay,
    title: 'Presenter experience',
    paragraphs: [
      'Present mode gives facilitators a stage-ready interface with join information, slide controls, and live response visuals.',
      'Open present view in a separate window for confidence monitors while the audience sees the main display.',
    ],
    bullets: ['QR codes & join links', 'Leaderboard overlays', 'Answer reveal controls'],
  },
  {
    icon: Users,
    title: 'Participant join flow',
    paragraphs: [
      'Attendees join from any device without installing software. Collect names when needed or allow anonymous participation.',
      'Waiting screens, progress indicators, and clear messaging keep large groups aligned during transitions.',
    ],
    bullets: ['Mobile-friendly join', 'Shared plan capacity across sessions', 'Disconnect frees join slots'],
  },
  {
    icon: BarChart3,
    title: 'Insights that matter',
    paragraphs: [
      'Review participation, accuracy, rankings, and question-level performance after each session.',
      'Export reports for stakeholders and compare activity across departments when you operate at organizational scale.',
    ],
    bullets: ['PDF & Excel exports', 'Per-question analytics', 'Host usage dashboard'],
  },
  {
    icon: Trophy,
    title: 'Leaderboards & rankings',
    paragraphs: [
      'Show live and overall leaderboards during sessions so participants stay engaged and competitive.',
      'Display rankings in present mode and review performance after each event.',
    ],
    bullets: ['Live leaderboard', 'Per-question rankings', 'Session-wide scoring'],
  },
  {
    icon: Shield,
    title: 'Administration & governance',
    paragraphs: [
      'Super administrators manage clients, departments, users, and subscription plans from the host portal.',
      'Assign plans, grant extra participant seats, and control account access with activation toggles.',
    ],
    bullets: ['Role-based access', 'Plan management', 'User lifecycle controls'],
  },
]

function FeaturesPage() {
  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Features</p>
            <h1 className="section-heading mt-3">A complete toolkit for live audience engagement</h1>
            <p className="section-subheading">
              High Voltage combines participant-facing join experiences with a full host control plane —
              so you can design, run, and measure interactive sessions professionally.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <Sparkles className="size-5 text-navy-700" />
              <h2 className="mt-4 text-lg font-semibold text-navy-900">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-100/60 py-20">
        <div className="mx-auto max-w-7xl space-y-16 px-4 sm:px-6 lg:px-8">
          {detailSections.map((section, index) => {
            const Icon = section.icon
            const reversed = index % 2 === 1
            return (
              <div
                key={section.title}
                className={`grid items-center gap-10 lg:grid-cols-2 ${reversed ? 'lg:[&>div:first-child]:order-2' : ''}`}
              >
                <div>
                  <div className="inline-flex rounded-xl bg-navy-800 p-3 text-white">
                    <Icon className="size-6" />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold text-navy-950">{section.title}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                      {paragraph}
                    </p>
                  ))}
                  <ul className="mt-5 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="size-4 text-navy-700" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="glass-card min-h-56 p-8">
                  <p className="text-sm font-semibold uppercase tracking-wider text-navy-700">Host portal</p>
                  <p className="mt-3 text-2xl font-bold text-navy-950">{section.title}</p>
                  <p className="mt-4 text-sm text-slate-600">
                    Available after registration in the dedicated admin application — separate from this marketing site.
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-navy-950">Why teams choose High Voltage</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-navy-700" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FAQSection title="Feature questions" />
      <CTASection
        title="See pricing for your audience size"
        description="Plans limit concurrent live connections on your account. Pick the tier that fits your peak audience and register in minutes."
        primaryLabel="Compare plans"
        primaryTo="/pricing"
        secondaryLabel="Back to home"
        secondaryTo="/"
      />
    </div>
  )
}

export default FeaturesPage
