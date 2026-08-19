import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminOnlyRoute } from './components/auth/AdminOnlyRoute'
import { SuperAdminOnlyRoute } from './components/auth/SuperAdminOnlyRoute'
import { RequireActivePlan } from './components/auth/RequireActivePlan'
import DepartmentAnalyticsPage from './pages/DepartmentAnalyticsPage'
import ClientAnalyticsPage from './pages/ClientAnalyticsPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ForceChangePasswordPage from './pages/ForceChangePasswordPage'
import DashboardPage from './pages/DashboardPage'
import BuilderPage from './pages/BuilderPage'
import LivePage from './pages/LivePage'
import AnalyticsPage from './pages/AnalyticsPage'
import TrainingLibraryPage from './pages/TrainingLibraryPage'
import ReportsPage from './pages/ReportsPage'
import ManageClientsPage from './pages/ManageClientsPage'
import ManageDepartmentsPage from './pages/ManageDepartmentsPage'
import ManageUsersPage from './pages/ManageUsersPage'
import ManagePlansPage from './pages/ManagePlansPage'
import MyPlanPage from './pages/MyPlanPage'
import WebSocketMonitorPage from './pages/WebSocketMonitorPage'
import ParticipantSessionPage from './pages/participant-session'
import PresentModePage from './pages/present-mode'
import PresentViewPage from './pages/present-mode/PresentViewPage'
import EmbedDisplayPage from './pages/embed/EmbedDisplayPage'
import EmbedControlsPage from './pages/embed/EmbedControlsPage'
import PreviewModePage from './pages/preview-mode'
import { SessionsProvider } from './context/SessionsContext'
import { useAuthStore } from './store/authStore'
import HostLayout from './layouts/HostLayout'
import { isIntegrationsEnabled } from './utils/integrations'

const INTEGRATIONS_ENABLED = isIntegrationsEnabled()

function getPostLoginPath(user) {
  if (user?.must_change_password) {
    return '/change-password'
  }
  return '/dashboard'
}

function isPublicAppPath(pathname) {
  return (
    pathname.startsWith('/join') ||
    pathname.startsWith('/present/view') ||
    (INTEGRATIONS_ENABLED && pathname.startsWith('/embed/display')) ||
    pathname === '/login' ||
    pathname === '/forgot-password'
  )
}

function App() {
  const user = useAuthStore((state) => state.user)
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping)
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth)
  const [authHydrated, setAuthHydrated] = useState(() => useAuthStore.persist.hasHydrated())
  const skipAuthGate = isPublicAppPath(window.location.pathname)

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setAuthHydrated(true)
    })
    if (useAuthStore.persist.hasHydrated()) {
      setAuthHydrated(true)
    }
    return unsub
  }, [])

  useEffect(() => {
    if (!authHydrated) return
    bootstrapAuth()
  }, [authHydrated, bootstrapAuth])

  if ((!authHydrated || isBootstrapping) && !skipAuthGate) {
    return (
      <div className="grid min-h-screen place-items-center bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100/70">
        <p className="text-sm font-medium text-slate-600">Checking session...</p>
      </div>
    )
  }

  const mustChangePassword = Boolean(user?.must_change_password)
  const postLoginPath = getPostLoginPath(user)

  return (
    <SessionsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/join/:sessionId" element={<ParticipantSessionPage />} />
          <Route path="/join" element={<ParticipantSessionPage />} />
          <Route path="/present/view" element={<PresentViewPage />} />
          {INTEGRATIONS_ENABLED ? (
            <>
              <Route path="/embed/display" element={<EmbedDisplayPage />} />
              <Route path="/embed/controls" element={<EmbedControlsPage />} />
            </>
          ) : null}
          <Route
            path="/present"
            element={
              user && !mustChangePassword ? (
                <RequireActivePlan>
                  <PresentModePage />
                </RequireActivePlan>
              ) : (
                <Navigate to={user ? '/change-password' : '/login'} replace />
              )
            }
          />
          <Route
            path="/preview"
            element={
              user && !mustChangePassword ? (
                <PreviewModePage />
              ) : (
                <Navigate to={user ? '/change-password' : '/login'} replace />
              )
            }
          />
          <Route
            path="/login"
            element={user ? <Navigate to={postLoginPath} replace /> : <LoginPage />}
          />
          <Route
            path="/forgot-password"
            element={user ? <Navigate to={postLoginPath} replace /> : <ForgotPasswordPage />}
          />
          <Route
            path="/change-password"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : mustChangePassword ? (
                <ForceChangePasswordPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          <Route
            element={
              user ? (
                mustChangePassword ? (
                  <Navigate to="/change-password" replace />
                ) : (
                  <HostLayout />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/my-plan"
              element={
                user?.role === 'super_admin' ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <MyPlanPage />
                )
              }
            />
            <Route
              path="/builder"
              element={
                <RequireActivePlan>
                  <BuilderPage />
                </RequireActivePlan>
              }
            />
            <Route
              path="/live"
              element={
                <RequireActivePlan>
                  <LivePage />
                </RequireActivePlan>
              }
            />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/training" element={<TrainingLibraryPage />} />
            <Route
              path="/department-analytics"
              element={
                <AdminOnlyRoute>
                  <DepartmentAnalyticsPage />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/client-analytics"
              element={
                <SuperAdminOnlyRoute>
                  <ClientAnalyticsPage />
                </SuperAdminOnlyRoute>
              }
            />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/manage/clients"
              element={
                <SuperAdminOnlyRoute>
                  <ManageClientsPage />
                </SuperAdminOnlyRoute>
              }
            />
            <Route
              path="/manage/departments"
              element={
                <AdminOnlyRoute>
                  <ManageDepartmentsPage />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/manage/users"
              element={
                <SuperAdminOnlyRoute>
                  <ManageUsersPage />
                </SuperAdminOnlyRoute>
              }
            />
            <Route
              path="/manage/plans"
              element={
                <SuperAdminOnlyRoute>
                  <ManagePlansPage />
                </SuperAdminOnlyRoute>
              }
            />
            <Route
              path="/monitor/websockets"
              element={
                <SuperAdminOnlyRoute>
                  <WebSocketMonitorPage />
                </SuperAdminOnlyRoute>
              }
            />
          </Route>

          <Route path="/" element={<Navigate to={user ? postLoginPath : '/login'} replace />} />
          <Route path="*" element={<Navigate to={user ? postLoginPath : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </SessionsProvider>
  )
}

export default App
