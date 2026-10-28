import { Outlet } from 'react-router-dom'
import MarketingHeader from '../components/marketing/MarketingHeader'
import MarketingFooter from '../components/marketing/MarketingFooter'
import StickyMobileCta from '../components/marketing/StickyMobileCta'

function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />
      <main className="relative flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>
      <MarketingFooter />
      <StickyMobileCta />
    </div>
  )
}

export default MarketingLayout
