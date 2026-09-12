const SYSTEM_SCOPE_BY_ROLE = {
  super_admin: 'platform',
  client_admin: 'client',
  dept_admin: 'department',
  host: 'own_sessions',
}

export function isPlatformScope(user) {
  return user?.role === 'super_admin' || user?.data_scope === 'platform'
}

export function getDataScope(user) {
  if (!user) return 'own_sessions'
  if (isPlatformScope(user)) return 'platform'
  return user.data_scope || SYSTEM_SCOPE_BY_ROLE[user.role] || 'own_sessions'
}

export function canSwitchShellDepartment(user) {
  const scope = getDataScope(user)
  return scope === 'platform' || scope === 'client'
}

export function canManageDepartments(user) {
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
    const scope = getDataScope(userOrRole)
    return scope === 'platform' || scope === 'client' || scope === 'department'
  }
  return ['super_admin', 'client_admin', 'dept_admin'].includes(userOrRole)
}
