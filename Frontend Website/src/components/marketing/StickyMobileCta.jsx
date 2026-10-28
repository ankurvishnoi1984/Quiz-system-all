import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const HIDDEN_PATHS = ['/register', '/renew', '/contact']

function StickyMobileCta() {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) {
      setVisible(false)
      return undefined
    }

    const onScroll = () => {
      setVisible(window.scrollY > 420)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) return null

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition duration-300 md:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 rounded-2xl border border-navy-200 bg-white/95 p-2 shadow-2xl shadow-navy-900/20 backdrop-blur">
        <Link to="/register" className="btn-primary flex-1 px-4 py-3 text-sm">
          Get started
          <ArrowRight className="size-4" />
        </Link>
        <Link to="/contact" className="btn-secondary flex-1 px-4 py-3 text-sm">
          Book demo
        </Link>
      </div>
    </div>
  )
}

export default StickyMobileCta
