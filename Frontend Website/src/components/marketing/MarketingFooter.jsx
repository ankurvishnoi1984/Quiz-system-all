import { Link } from 'react-router-dom'
import { getAdminPortalUrl } from '../../utils/adminPortal'
import { LOGO_ALT, LOGO_SRC } from '../../constants/branding'
import { SITE_NAME, SUPPORT_EMAIL } from '../../constants/siteContent'
import {
  FOOTER_LEGAL_LINKS,
  FOOTER_PRODUCT_LINKS,
  FOOTER_RESOURCE_LINKS,
  FOOTER_SOLUTION_LINKS,
} from '../../constants/marketingPages'

function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-navy-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-1">
          <div className="mb-5 inline-flex rounded-2xl bg-white px-4 py-3">
            <img src={LOGO_SRC} alt={LOGO_ALT} className="h-10 w-auto max-w-[200px] object-contain" />
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-slate-400">
            {SITE_NAME} helps hosts run live quizzes, polls, and surveys with present mode and reporting.
          </p>
          <p className="mt-4 text-sm">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-navy-400 hover:text-white">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Product</p>
          <ul className="space-y-3 text-sm">
            {FOOTER_PRODUCT_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Solutions</p>
          <ul className="space-y-3 text-sm">
            {FOOTER_SOLUTION_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Resources</p>
          <ul className="space-y-3 text-sm">
            {FOOTER_RESOURCE_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Host portal</p>
          <ul className="space-y-3 text-sm">
            <li>
              <a href={getAdminPortalUrl('/login')} className="hover:text-white">
                Login
              </a>
            </li>
            <li>
              <Link to="/register" className="hover:text-white">
                Sign up
              </Link>
            </li>
            <li>
              <a href={getAdminPortalUrl('/join')} className="hover:text-white">
                Join a session
              </a>
            </li>
            {FOOTER_LEGAL_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} High Voltage. All rights reserved.
      </div>
    </footer>
  )
}

export default MarketingFooter
