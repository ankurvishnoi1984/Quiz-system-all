import { HERO_STATS } from '../../constants/siteContent'

const tones = [
  { value: 'text-sky', bar: 'bg-sky' },
  { value: 'text-emerald', bar: 'bg-emerald' },
  { value: 'text-amber', bar: 'bg-amber' },
  { value: 'text-accent', bar: 'bg-accent' },
]

function StatsBar() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        {HERO_STATS.map((stat, index) => {
          const tone = tones[index % tones.length]
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-100 bg-linear-to-b from-white to-slate-50 px-4 py-5 text-center shadow-sm"
            >
              <span className={`mx-auto mb-3 block h-1 w-10 rounded-full ${tone.bar}`} />
              <p className={`font-[family-name:var(--font-display)] text-2xl font-extrabold sm:text-3xl ${tone.value}`}>
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default StatsBar
