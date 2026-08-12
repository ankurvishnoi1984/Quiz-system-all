import { Outlet } from 'react-router-dom'
import MarketingHeader from '../components/marketing/MarketingHeader'
import MarketingFooter from '../components/marketing/MarketingFooter'

function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(27,75,107,0.09),transparent_42%),radial-gradient(circle_at_88%_12%,rgba(200,35,44,0.05),transparent_36%)]" />
      <MarketingHeader />
      <main className="relative flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  )
}

export default MarketingLayout
