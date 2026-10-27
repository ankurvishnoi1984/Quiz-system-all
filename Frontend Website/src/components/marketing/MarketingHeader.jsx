import { Link, NavLink } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { getAdminPortalUrl } from '../../utils/adminPortal'
import { LOGO_ALT, LOGO_SRC } from '../../constants/branding'
import { NAV_ITEMS } from '../../constants/marketingPages'

const navLinkClass = ({ isActive }) =>
  `text-[15px] font-semibold transition ${isActive ? 'text-navy-950' : 'text-navy-700 hover:text-navy-950'}`

function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sessionCode, setSessionCode] = useState('')

  function handleJoin(event) {
    event.preventDefault()
    const code = sessionCode.trim()
    if (!code) return
    window.location.href = getAdminPortalUrl(`/join/${encodeURIComponent(code)}`)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="border-b border-slate-100 bg-navy-50/70">
        <form
          onSubmit={handleJoin}
          className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2 px-4 py-2 sm:px-6 lg:px-8"
        >
          <label htmlFor="header-session-id" className="text-sm font-semibold text-navy-800">
            Join a session
          </label>
          <input
            id="header-session-id"
            type="text"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
            placeholder="Session ID"
            className="w-36 rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-sm outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 sm:w-44"
            autoComplete="off"
          />
          <button type="submit" className="btn-accent px-4 py-1.5 text-xs sm:text-sm">
            Join
            <ArrowRight className="size-3.5" />
          </button>
        </form>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center" onClick={() => setMobileOpen(false)}>
          <img src={LOGO_SRC} alt={LOGO_ALT} className="h-11 w-auto max-w-[190px] object-contain sm:h-12" />
        </Link>

        <nav className="hidden items-center gap-6 xl:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={getAdminPortalUrl('/login')}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-navy-800 transition hover:bg-navy-50"
          >
            Login
          </a>
          <Link to="/register" className="btn-primary px-5 py-2.5">
            Sign up
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-navy-700 hover:bg-navy-50 xl:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 xl:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href={getAdminPortalUrl('/login')}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50"
            >
              Login
            </a>
            <Link to="/register" className="btn-primary" onClick={() => setMobileOpen(false)}>
              Sign up
              <ArrowRight className="size-4" />
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

export default MarketingHeader
