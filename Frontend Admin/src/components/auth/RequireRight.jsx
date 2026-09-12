import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { hasRight } from '../../utils/userRights'

export function RequireRight({ right, anyOf, children, redirectTo = '/dashboard' }) {
  const user = useAuthStore((state) => state.user)
  const allowed = anyOf?.length
    ? anyOf.some((key) => hasRight(user, key))
    : hasRight(user, right)

  if (!allowed) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}
