const DEFAULT_ITEMS = [
  'Training',
  'Education',
  'Events',
  'Town halls',
  'Hybrid meetings',
  'Onboarding',
  'Sales enablement',
  'Conferences',
]

function MarqueeStrip({
  title = 'Built for teams that present to real audiences',
  items = DEFAULT_ITEMS,
}) {
  const loop = [...items, ...items]

  return (
    <section className="surface-band overflow-hidden border-y border-navy-100/80 py-10">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="font-[family-name:var(--font-display)] text-base font-semibold text-navy-800">
          {title}
        </p>
      </div>
      <div className="relative mt-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-[#eef5f9] to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-[#fde8e9] to-transparent sm:w-24" />
        <div className="marquee-track flex w-max gap-3">
          {loop.map((label, index) => {
            const chips = ['chip-sky', 'chip-emerald', 'chip-amber', 'chip-coral', 'chip-navy']
            return (
              <span
                key={`${label}-${index}`}
                className={`shrink-0 px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${chips[index % chips.length]}`}
              >
                {label}
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default MarqueeStrip
