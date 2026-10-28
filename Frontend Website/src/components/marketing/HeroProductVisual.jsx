import { useEffect, useState } from 'react'
import { BarChart3, ClipboardList, Presentation, Sparkles } from 'lucide-react'

const TABS = [
  {
    id: 'quizzes',
    label: 'Quizzes',
    icon: Sparkles,
    chip: 'chip-amber',
    panel: 'quiz',
  },
  {
    id: 'polls',
    label: 'Polls',
    icon: ClipboardList,
    chip: 'chip-sky',
    panel: 'poll',
  },
  {
    id: 'present',
    label: 'Present',
    icon: Presentation,
    chip: 'chip-coral',
    panel: 'present',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    chip: 'chip-emerald',
    panel: 'reports',
  },
]

function Panel({ type }) {
  if (type === 'quiz') {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber">Live quiz</p>
        <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
          Leaderboard snapshot
        </h3>
        {[
          { name: 'Asha', score: '980', place: '1st', tone: 'bg-amber-soft text-amber' },
          { name: 'Rohan', score: '860', place: '2nd', tone: 'bg-sky-soft text-sky' },
          { name: 'Meera', score: '740', place: '3rd', tone: 'bg-emerald-soft text-emerald' },
        ].map((row) => (
          <div
            key={row.name}
            className={`flex items-center justify-between rounded-2xl px-4 py-3 ${row.tone}`}
          >
            <span className="font-semibold text-navy-950">
              {row.place} · {row.name}
            </span>
            <span className="text-sm font-bold">{row.score}</span>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'present') {
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral">Present mode</p>
        <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
          Scan to join on stage
        </h3>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-navy-50 p-4">
          <div>
            <p className="text-sm text-navy-800">
              Session <span className="font-bold text-accent">HV-4821</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">64 of 100 connected</p>
          </div>
          <div className="grid size-14 grid-cols-4 gap-0.5 rounded-md bg-navy-950 p-1.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className={`rounded-[1px] ${[0, 1, 2, 4, 5, 8, 10, 12, 13, 14].includes(i) ? 'bg-white' : 'bg-transparent'}`}
              />
            ))}
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-navy-100">
          <div className="h-full w-2/3 rounded-full bg-linear-to-r from-coral to-amber" />
        </div>
      </div>
    )
  }

  if (type === 'reports') {
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald">Session report</p>
        <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
          Participation overview
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Joined', value: '128', chip: 'chip-sky' },
            { label: 'Avg', value: '82%', chip: 'chip-emerald' },
            { label: 'Answers', value: '914', chip: 'chip-amber' },
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-sky">Live poll</p>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">
          Live
        </span>
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
        What helped most today?
      </h3>
      {[
        { label: 'Examples', pct: 72, bar: 'bg-amber' },
        { label: 'Discussion', pct: 54, bar: 'bg-emerald' },
        { label: 'Practice quiz', pct: 41, bar: 'bg-coral' },
      ].map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-sm text-navy-800">
            <span>{row.label}</span>
            <span>{row.pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-navy-100">
            <div
              className={`h-full rounded-full ${row.bar} transition-all duration-700`}
              style={{ width: `${row.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function HeroProductVisual() {
  const [active, setActive] = useState('quizzes')
  const current = TABS.find((tab) => tab.id === active) || TABS[0]

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return undefined

    const timer = window.setInterval(() => {
      setActive((prev) => {
        const index = TABS.findIndex((tab) => tab.id === prev)
        return TABS[(index + 1) % TABS.length].id
      })
    }, 4200)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="anim-float relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-8 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(200,35,44,0.22),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(31,143,191,0.28),transparent_50%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-navy-900 via-navy-800 to-navy-700 p-4 shadow-2xl shadow-navy-900/30 sm:p-6">
        <div className="rounded-3xl bg-white p-4 text-navy-900 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky">Live session</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-extrabold">
                Training pulse check
              </p>
            </div>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              86 online
            </span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {TABS.map(({ id, label, icon: Icon, chip }) => {
              const selected = id === active
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActive(id)}
                  className={`rounded-2xl p-2.5 text-left transition ${
                    selected
                      ? `${chip} ring-2 ring-navy-900/10`
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                  aria-pressed={selected}
                >
                  <Icon className="size-4" />
                  <span className="mt-1 block text-[11px] font-bold text-navy-950">{label}</span>
                </button>
              )
            })}
          </div>

          <div key={current.id} className="hero-panel-swap mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <Panel type={current.panel} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeroProductVisual
