function PageHero({ eyebrow, title, description, children }) {
  return (
    <section className="border-b border-slate-200 bg-linear-to-br from-navy-50 via-white to-accent-soft/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="section-heading mt-3">{title}</h1>
          {description ? <p className="section-subheading">{description}</p> : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </div>
    </section>
  )
}

export default PageHero
