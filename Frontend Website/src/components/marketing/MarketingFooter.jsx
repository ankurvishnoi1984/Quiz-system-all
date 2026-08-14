import { Link } from 'react-router-dom'
import { getAdminPortalUrl } from '../../utils/adminPortal'
import { LOGO_ALT, LOGO_SRC } from '../../constants/branding'
import { SUPPORT_EMAIL } from '../../constants/siteContent'

function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-navy-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <div className="mb-5 inline-flex rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-white/10">
            <img src={LOGO_SRC} alt={LOGO_ALT} className="h-12 w-auto max-w-[220px] object-contain" />
          </div>
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            Run interactive quizzes, polls, and surveys for events, training, and meetings — with a
            dedicated host portal for session management and analytics.
          </p>
          <p className="mt-4 text-sm">
            <span className="text-slate-500">Need help? </span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Product</p>
          <ul className="space-y-3 text-sm">
            <li>
              <Link to="/features" className="hover:text-white">
                Features
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-white">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-white">
                Register
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Host portal</p>
          <ul className="space-y-3 text-sm">
            <li>
              <a href={getAdminPortalUrl('/login')} className="hover:text-white">
                Sign in
              </a>
            </li>
            <li>
              <a href={getAdminPortalUrl('/forgot-password')} className="hover:text-white">
                Forgot password
              </a>
            </li>
            <li>
              <Link to="/about" className="hover:text-white">
                About us
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Netcast Services. All rights reserved.
      </div>
    </footer>
  )
}

export default MarketingFooter
