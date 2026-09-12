import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { canManageDepartments } from '../../utils/adminRoles'

export function AdminOnlyRoute({ children }) {
  const user = useAuthStore((state) => state.user)

  if (!canManageDepartments(user)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
