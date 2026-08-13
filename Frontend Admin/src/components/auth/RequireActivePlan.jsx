import { Navigate } from 'react-router-dom'
import { usePlanLock } from '../../hooks/usePlanLock'

/**
 * Blocks Question Builder / Live Present Mode when the host has no active plan.
 */
export function RequireActivePlan({ children, redirectTo = '/dashboard' }) {
  const { planLocked, isLoading } = usePlanLock()

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-white p-8 text-center text-slate-600">
        Checking plan access...
      </div>
    )
  }

  if (planLocked) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}
