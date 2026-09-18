export const OPERATIONAL_RIGHTS = ['sessions', 'builder', 'present', 'reports']

export const MANAGEMENT_RIGHTS = [
  'manage_clients',
  'manage_departments',
  'manage_users',
  'manage_user_plan',
  'manage_user_extra_participants',
  'manage_user_extra_questions',
  'manage_user_team_seats',
  'manage_teams',
  'manage_plans',
  'connection_monitor',
]

export const SUPER_ADMIN_ONLY_RIGHTS = ['manage_roles']

export const ASSIGNABLE_SUB_ADMIN_RIGHTS = [...OPERATIONAL_RIGHTS, ...MANAGEMENT_RIGHTS]

export const ALL_RIGHTS = [
  ...OPERATIONAL_RIGHTS,
  ...MANAGEMENT_RIGHTS,
  ...SUPER_ADMIN_ONLY_RIGHTS,
]

export const RIGHT_LABELS = {
  sessions: 'Sessions',
  builder: 'Question Builder',
  present: 'Present mode',
  reports: 'Reports and analytics',
  manage_clients: 'Manage clients',
  manage_departments: 'Manage departments',
  manage_users: 'Manage users',
  manage_user_plan: 'Change user plan',
  manage_user_extra_participants: 'Extra participant seats',
  manage_user_extra_questions: 'Extra questions',
  manage_user_team_seats: 'Extra team seats',
  manage_teams: 'Team management',
  manage_plans: 'Plan management',
  connection_monitor: 'Connection monitor',
  manage_roles: 'Role management',
}

export const RIGHT_GROUPS = [
  {
    id: 'operational',
    label: 'Operational',
    rights: OPERATIONAL_RIGHTS,
  },
  {
    id: 'org',
    label: 'Clients & departments',
    rights: ['manage_clients', 'manage_departments'],
  },
  {
    id: 'users',
    label: 'Users',
    rights: [
      'manage_users',
      'manage_user_plan',
      'manage_user_extra_participants',
      'manage_user_extra_questions',
      'manage_user_team_seats',
    ],
  },
  {
    id: 'teams_plans',
    label: 'Teams & plans',
    rights: ['manage_teams', 'manage_plans'],
  },
  {
    id: 'monitor',
    label: 'Monitoring',
    rights: ['connection_monitor'],
  },
]

export const DATA_SCOPE_LABELS = {
  platform: 'Platform',
  client: 'Client',
  department: 'Department',
  own_sessions: 'Own sessions',
}

export const ASSIGNABLE_DATA_SCOPES = ['client', 'department', 'own_sessions']

export const SUB_ADMIN_ACCESS_MODES = [
  { value: 'all', label: 'All clients and departments' },
  { value: 'clients', label: 'Specific clients only' },
  { value: 'departments', label: 'Specific departments only' },
]

export function hasRight(user, right) {
  if (!user) return false
  if (user.role === 'super_admin') return true
  const rights = Array.isArray(user.rights) ? user.rights : []
  return rights.includes(right)
}

export function hasAnyRight(user, rights = []) {
  return rights.some((right) => hasRight(user, right))
}

export function formatRightsSummary(rights) {
  const list = Array.isArray(rights) ? rights : []
  if (!list.length) return 'None'
  return list.map((key) => RIGHT_LABELS[key] || key).join(', ')
}
