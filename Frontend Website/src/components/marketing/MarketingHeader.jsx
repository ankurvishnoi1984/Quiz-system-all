import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { getAdminPortalUrl } from '../../utils/adminPortal'
import { LOGO_ALT, LOGO_SRC } from '../../constants/branding'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
]

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition ${isActive ? 'text-navy-800' : 'text-slate-600 hover:text-navy-800'}`

function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
          <img src={LOGO_SRC} alt={LOGO_ALT} className="h-12 w-auto max-w-[200px] object-contain sm:h-14" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={getAdminPortalUrl('/login')}
            className="rounded-xl px-4 py-2 text-sm font-medium text-navy-800 transition hover:bg-slate-100"
          >
            Host sign in
          </a>
          <Link to="/pricing" className="btn-primary px-5 py-2.5">
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href={getAdminPortalUrl('/login')}
              className="rounded-xl px-3 py-2 text-sm font-medium text-navy-800 hover:bg-slate-50"
            >
              Host sign in
            </a>
            <Link to="/pricing" className="btn-primary" onClick={() => setMobileOpen(false)}>
              Get started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

export default MarketingHeader
