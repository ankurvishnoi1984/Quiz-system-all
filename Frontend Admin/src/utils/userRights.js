export const OPERATIONAL_RIGHTS = ['sessions', 'builder', 'present', 'reports']

export const RIGHT_LABELS = {
  sessions: 'Sessions',
  builder: 'Question Builder',
  present: 'Present mode',
  reports: 'Reports and analytics',
}

export const DATA_SCOPE_LABELS = {
  platform: 'Platform',
  client: 'Client',
  department: 'Department',
  own_sessions: 'Own sessions',
}

export const ASSIGNABLE_DATA_SCOPES = ['client', 'department', 'own_sessions']

export function hasRight(user, right) {
  if (!user) return false
  if (user.role === 'super_admin' || user.data_scope === 'platform') return true
  const rights = Array.isArray(user.rights) ? user.rights : [...OPERATIONAL_RIGHTS]
  return rights.includes(right)
}

export function formatRightsSummary(rights) {
  const list = Array.isArray(rights) ? rights : []
  if (!list.length) return 'None'
  return list.map((key) => RIGHT_LABELS[key] || key).join(', ')
}
