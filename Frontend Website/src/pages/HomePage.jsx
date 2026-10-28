import { ArrowRight, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatsBar from '../components/marketing/StatsBar'
import CTASection from '../components/marketing/CTASection'
import FAQSection from '../components/marketing/FAQSection'
import Reveal from '../components/marketing/Reveal'
import MarqueeStrip from '../components/marketing/MarqueeStrip'
import HeroProductVisual from '../components/marketing/HeroProductVisual'
import { CORE_FEATURES, HOW_IT_WORKS, SITE_NAME } from '../constants/siteContent'
import {
  HOME_CONTENT_BLOCKS,
  STORY_ITEMS,
  TIP_ARTICLES,
  USE_CASE_PAGES,
} from '../constants/marketingPages'
import { getAdminPortalUrl } from '../utils/adminPortal'

const featureShowcases = [
  {
    eyebrow: 'Live polling',
    title: 'Capture opinions the moment they form',
    description:
      'Launch polls during a session and show results on the big screen. Keep feedback fast without breaking your flow.',
    points: ['Live chart updates', 'Anonymous or named responses', 'Works on phones and projectors'],
    visual: 'poll',
  },
  {
    eyebrow: 'Quizzes',
    title: 'Competitive scoring that keeps energy high',
    description:
      'Timed questions, automatic scoring, and leaderboards help training and classrooms stay focused.',
    points: ['Automatic scoring', 'Live leaderboards', 'Answer reveal controls'],
    visual: 'quiz',
  },
  {
    eyebrow: 'Present mode',
    title: 'A host view built for the stage',
    description:
      'Full-screen present mode with join QR codes, branding, and audience-facing visuals for serious events.',
    points: ['QR join codes', 'Custom session logos', 'Keyboard-friendly controls'],
    visual: 'present',
  },
  {
    eyebrow: 'Reporting',
    title: 'Leave with evidence, not guesswork',
    description:
      'Review participation and accuracy after every session. Export PDF and Excel reports for stakeholders.',
    points: ['Session summaries', 'Question-level insights', 'Downloadable exports'],
    visual: 'analytics',
  },
]

function FeatureVisual({ type }) {
  if (type === 'quiz') {
    return (
      <div className="rounded-[1.75rem] bg-linear-to-br from-navy-900 via-navy-800 to-navy-700 p-5 text-white shadow-xl shadow-navy-900/25 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber">Live quiz</p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-extrabold">Leaderboard</h3>
        <div className="mt-5 space-y-3">
          {[
            { name: 'Asha', score: '980', place: '1st', tone: 'bg-amber/30' },
            { name: 'Rohan', score: '860', place: '2nd', tone: 'bg-sky/25' },
            { name: 'Meera', score: '740', place: '3rd', tone: 'bg-emerald/25' },
          ].map((row) => (
            <div
              key={row.name}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 ${row.tone}`}
            >
              <span className="font-semibold">
                {row.place} · {row.name}
              </span>
              <span className="text-sm text-white/90">{row.score}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'present') {
    return (
      <div className="rounded-[1.75rem] border border-sky/20 bg-linear-to-br from-white to-sky-soft p-5 shadow-xl shadow-sky/10 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky">Present mode</p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
              Scan to join
            </h3>
          </div>
          <div className="grid size-16 grid-cols-4 gap-0.5 rounded-lg bg-navy-950 p-1.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className={`rounded-[1px] ${[0, 1, 2, 4, 5, 8, 10, 12, 13, 14].includes(i) ? 'bg-white' : 'bg-transparent'}`}
              />
            ))}
          </div>
        </div>
        <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-navy-800 shadow-sm">
          Session code <span className="font-semibold text-accent">HV-4821</span>
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full w-2/3 rounded-full bg-linear-to-r from-sky to-emerald" />
        </div>
        <p className="mt-2 text-xs text-slate-500">64 of 100 participants connected</p>
      </div>
    )
  }

  if (type === 'analytics') {
    return (
      <div className="rounded-[1.75rem] border border-emerald/20 bg-linear-to-br from-white to-emerald-soft p-5 shadow-xl shadow-emerald/10 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald">Session report</p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
          Participation overview
        </h3>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Joined', value: '128', chip: 'chip-sky' },
            { label: 'Avg score', value: '82%', chip: 'chip-emerald' },
            { label: 'Responses', value: '914', chip: 'chip-amber' },
          ].map((item) => (
            <div key={item.label} className={`rounded-2xl px-3 py-4 text-center ${item.chip}`}>
              <p className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                {item.value}
              </p>
              <p className="mt-1 text-xs opacity-80">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[1.75rem] bg-linear-to-br from-navy-800 via-navy-700 to-sky p-5 text-white shadow-xl shadow-navy-900/20 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-soft">Live poll</p>
          <h3 className="mt-2 max-w-xs font-[family-name:var(--font-display)] text-lg font-extrabold leading-snug sm:text-xl">
            What helped most in today&apos;s session?
          </h3>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold">Live</span>
      </div>
      <div className="mt-6 space-y-3">
        {[
          { label: 'Examples', pct: 72, bar: 'bg-amber' },
          { label: 'Discussion', pct: 54, bar: 'bg-emerald' },
          { label: 'Practice quiz', pct: 41, bar: 'bg-coral' },
        ].map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{row.label}</span>
              <span>{row.pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${row.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HomePage() {
  return (
    <div>
      <section id="home-hero" className="surface-warm relative overflow-hidden">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-20">
          <div className="space-y-7">
            {/* <p className="anim-fade-up eyebrow">{SITE_NAME}</p> */}
            <h1 className="anim-fade-up-delay font-[family-name:var(--font-display)] text-4xl font-black leading-[1.08] tracking-tight text-navy-950 sm:text-5xl lg:text-[3.35rem]">
              Live quizzes and polls that keep every audience{' '}
              <span className="hero-underline">engaged</span>.
            </h1>
            <p className="anim-fade-up-delay-2 max-w-xl text-lg leading-relaxed text-slate-600">
              A dedicated host portal for building sessions, presenting on stage, and measuring results —
              with plans sized by concurrent participants.
            </p>
            <div className="anim-fade-up-delay-2 flex flex-wrap items-center gap-4">
              <Link to="/register" className="btn-primary">
                Get started
                <ArrowRight className="size-4" />
              </Link>
              <Link to="/contact" className="btn-link">
                Book a demo
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="anim-fade-up-delay-2 text-sm text-slate-600">
              Built for training, classrooms, town halls, and hybrid events.
            </p>
          </div>

          <Reveal delay={120} y={28}>
            <HeroProductVisual />
          </Reveal>
        </div>
      </section>

      <MarqueeStrip />
      <StatsBar />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Product</p>
          <h2 className="section-heading mt-3">Everything you need to run interactive live sessions</h2>
          <p className="section-subheading">
            From the first join to the final export — designed for facilitators who need reliability at
            scale.
          </p>
        </Reveal>

        <div className="mt-16 space-y-20">
          {featureShowcases.map((feature, index) => {
            const reverse = index % 2 === 1
            return (
              <Reveal key={feature.title} delay={index * 40}>
                <div
                  className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}
                >
                  <div>
                    <p className="eyebrow">{feature.eyebrow}</p>
                    <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-navy-950">
                      {feature.title}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-slate-600">{feature.description}</p>
                    <ul className="mt-5 space-y-2">
                      {feature.points.map((point) => (
                        <li key={point} className="flex items-center gap-2 text-sm text-navy-800">
                          <span className="size-1.5 rounded-full bg-accent" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <Link to="/features" className="btn-link mt-6">
                      Explore features
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                  <FeatureVisual type={feature.visual} />
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      <section className="bg-linear-to-b from-sky-soft/40 via-white to-accent-soft/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Use cases</p>
            <h2 className="section-heading mt-3">One platform across your formats</h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {USE_CASE_PAGES.map((item, index) => {
              const chips = ['chip-sky', 'chip-emerald', 'chip-amber', 'chip-coral']
              return (
                <Reveal key={item.slug} delay={index * 80}>
                  <Link
                    to={`/use-cases#${item.slug}`}
                    className="card-lift block rounded-3xl border border-white bg-white/90 p-7 shadow-sm"
                  >
                    <div className={`mb-4 inline-flex p-3 ${chips[index % chips.length]}`}>
                      <MessageSquare className="size-5" />
                    </div>
                    <h3 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ideal for: {item.audience}
                    </p>
                  </Link>
                </Reveal>
              )
            })}
          </div>
          <div className="mt-8 text-center">
            <Link to="/use-cases" className="btn-link">
              View all use cases
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="section-heading mt-3">From signup to live session in four steps</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item, index) => {
            const tones = ['text-sky', 'text-emerald', 'text-amber', 'text-accent']
            return (
              <Reveal key={item.step} delay={index * 90}>
                <article className="card-lift h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p
                    className={`font-[family-name:var(--font-display)] text-3xl font-black ${tones[index % tones.length]}`}
                  >
                    {item.step}
                  </p>
                  <h3 className="mt-4 font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </article>
              </Reveal>
            )
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-linear-to-br from-navy-50 via-white to-amber-soft/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Capabilities</p>
            <h2 className="section-heading mt-3">What hosts get in one product</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CORE_FEATURES.map((feature, index) => {
              const bars = ['bg-sky', 'bg-accent', 'bg-emerald', 'bg-amber', 'bg-coral', 'bg-navy-600']
              return (
                <Reveal key={feature.title} delay={(index % 3) * 80}>
                  <article className="card-lift h-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <span className={`mb-4 block h-1.5 w-12 rounded-full ${bars[index % bars.length]}`} />
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                  </article>
                </Reveal>
              )
            })}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/features" className="btn-link">
              See all features
              <ArrowRight className="size-4" />
            </Link>
            <Link to="/stories" className="btn-secondary">
              Read stories
            </Link>
            <a href={getAdminPortalUrl('/login')} className="btn-secondary">
              Open host portal
            </a>
          </div>
        </div>
      </section>

      <section className="bg-navy-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-amber">More than a poll button</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold sm:text-4xl">
              Depth for hosts. Simplicity for audiences.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {HOME_CONTENT_BLOCKS.map((block, index) => (
              <Reveal key={block.title} delay={index * 100}>
                <article className="h-full rounded-3xl border border-white/10 bg-white/5 p-8">
                  <h3 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
                    {block.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{block.body}</p>
                  <ul className="mt-5 space-y-2">
                    {block.points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-sm text-slate-200">
                        <span className="size-1.5 rounded-full bg-accent" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/how-it-works" className="btn-accent">
              How it works
            </Link>
            <Link
              to="/product-tour"
              className="btn-secondary border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              Product tour
            </Link>
            <Link
              to="/security"
              className="btn-secondary border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              Security & trust
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Stories</p>
          <h2 className="section-heading mt-3">Outcomes teams talk about</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STORY_ITEMS.slice(0, 3).map((story, index) => (
            <Reveal key={story.title} delay={index * 90}>
              <article className="card-lift h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-navy-600">{story.sector}</p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                  {story.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">&ldquo;{story.quote}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-accent">{story.outcome}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/stories" className="btn-link">
            Read more stories
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-linear-to-r from-sky-soft via-white to-amber-soft py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Resources</p>
            <h2 className="section-heading mt-3">Keep exploring</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {TIP_ARTICLES.map((article, index) => (
              <Reveal key={article.slug} delay={index * 80}>
                <Link
                  to={article.href}
                  className="card-lift block h-full rounded-3xl border border-white bg-white/90 p-6 shadow-sm"
                >
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                    {article.title}
                  </h3>
                  <p className="mt-3 text-sm text-slate-600">{article.summary}</p>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/resources" className="btn-primary">
              Resource hub
            </Link>
            <Link to="/enterprise" className="btn-secondary">
              Enterprise
            </Link>
            <Link to="/integrations" className="btn-secondary">
              Integrations
            </Link>
            <Link to="/faq" className="btn-secondary">
              FAQ
            </Link>
          </div>
        </div>
      </section>

      <FAQSection />
      <CTASection />
    </div>
  )
}

export default HomePage
