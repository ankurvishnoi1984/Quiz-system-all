import { Outlet } from 'react-router-dom'
import MarketingHeader from '../components/marketing/MarketingHeader'
import MarketingFooter from '../components/marketing/MarketingFooter'

function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />
      <main className="relative flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  )
}

export default MarketingLayout
