import { Link, NavLink } from 'react-router-dom'
import { ORGANIZATION_NAME, PRODUCT_NAME, SUPPORT_CONTACTS } from '../../constants/legalContacts'

const NAV = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/support', label: 'Support' },
  { to: '/docs/zoom', label: 'Zoom guide' },
]

export function PublicDocLayout({ title, subtitle, children, updated = '11 November 2026' }) {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100/70 text-slate-800">
      <header className="border-b border-blue-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {ORGANIZATION_NAME}
            </p>
            <Link to="/login" className="text-lg font-bold text-navy-900 hover:text-navy-700">
              {PRODUCT_NAME}
            </Link>
          </div>
          <nav className="flex flex-wrap gap-1.5">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-navy-900 text-white'
                      : 'border border-blue-200 bg-white text-navy-800 hover:bg-blue-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-2xl border border-blue-200/70 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Last updated {updated}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">{children}</div>
        </div>
      </main>

      <footer className="border-t border-blue-200/60 bg-white/70">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {ORGANIZATION_NAME}. All rights reserved.
          </p>
          <p className="break-all">
            Contact:{' '}
            {SUPPORT_CONTACTS.map((email, index) => (
              <span key={email}>
                {index > 0 ? ' / ' : ''}
                <a className="font-semibold text-navy-800 hover:underline" href={`mailto:${email}`}>
                  {email}
                </a>
              </span>
            ))}
          </p>
        </div>
      </footer>
    </div>
  )
}

export function DocSection({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold text-navy-900">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
