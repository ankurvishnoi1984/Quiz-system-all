import { Outlet } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import { HostOnboardingTour } from '../components/onboarding/HostOnboardingTour'
import { HostIdleSessionsGuard } from '../components/session/HostIdleSessionsGuard'
import { HostOnboardingProvider, useHostOnboarding } from '../context/HostOnboardingContext'
import { ShellProvider } from '../context/ShellContext'
import { SessionsProvider } from '../context/SessionsContext'
import { useState } from 'react'

function HostLayoutShell() {
  const [collapsed, setCollapsed] = useState(false)
  const { active, step } = useHostOnboarding()
  const forceExpanded = active && (step?.placement === 'right' || step?.target?.startsWith('nav-'))

  return (
    <div
      data-host-layout
      className="relative flex min-h-screen overflow-hidden bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100/70"
    >
      <div
        data-host-decor
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(27,75,107,0.09),transparent_35%),radial-gradient(circle_at_12%_72%,rgba(200,35,44,0.04),transparent_35%)]"
      />
      <Sidebar
        collapsed={forceExpanded ? false : collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <div data-host-main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <HostOnboardingTour />
      <HostIdleSessionsGuard />
    </div>
  )
}

function HostLayout() {
  return (
    <ShellProvider>
      <SessionsProvider>
        <HostOnboardingProvider>
          <HostLayoutShell />
        </HostOnboardingProvider>
      </SessionsProvider>
    </ShellProvider>
  )
}

export default HostLayout
