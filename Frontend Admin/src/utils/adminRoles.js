import { hasRight } from './userRights'

const SYSTEM_SCOPE_BY_ROLE = {
  super_admin: 'platform',
  sub_admin: 'platform',
  client_admin: 'client',
  dept_admin: 'department',
  host: 'own_sessions',
  author: 'own_sessions',
  auditor: 'own_sessions',
}

export function isSuperAdmin(user) {
  return user?.role === 'super_admin'
}

export function isSubAdmin(user) {
  return user?.role === 'sub_admin'
}

export function getSubAdminAccess(user) {
  if (!isSubAdmin(user)) return null
  const mode = String(user?.sub_admin_access || 'all')
  return ['all', 'clients', 'departments'].includes(mode) ? mode : 'all'
}

export function isPlatformScope(user) {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (isSubAdmin(user)) return getSubAdminAccess(user) === 'all'
  return user?.data_scope === 'platform'
}

export function getDataScope(user) {
  if (!user) return 'own_sessions'
  if (isPlatformScope(user)) return 'platform'
  return user.data_scope || SYSTEM_SCOPE_BY_ROLE[user.role] || 'own_sessions'
}

export function canSwitchShellDepartment(user) {
  const scope = getDataScope(user)
  return (
    scope === 'platform' ||
    scope === 'client' ||
    (isSubAdmin(user) && getSubAdminAccess(user) !== 'departments')
  )
}

export function canManageDepartments(user) {
  if (isSuperAdmin(user)) return true
  if (isSubAdmin(user)) return hasRight(user, 'manage_departments')
  const scope = getDataScope(user)
  return scope === 'platform' || scope === 'client'
}

export function canSelectDepartmentOnCreate(user) {
  return getDataScope(user) !== 'own_sessions'
}

export function needsClientForScope(scope) {
  return scope === 'client' || scope === 'department' || scope === 'own_sessions'
}

export function needsDepartmentForScope(scope) {
  return scope === 'department' || scope === 'own_sessions'
}

export function isAdminRole(userOrRole) {
  if (userOrRole && typeof userOrRole === 'object') {
    if (isSuperAdmin(userOrRole) || isSubAdmin(userOrRole)) return true
    const scope = getDataScope(userOrRole)
    return scope === 'platform' || scope === 'client' || scope === 'department'
  }
  return ['super_admin', 'sub_admin', 'client_admin', 'dept_admin'].includes(userOrRole)
}

export function skipsPlanLock(user) {
  return isSuperAdmin(user) || isSubAdmin(user)
}
