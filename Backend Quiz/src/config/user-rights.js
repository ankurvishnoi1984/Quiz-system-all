const OPERATIONAL_RIGHTS = ["sessions", "builder", "present", "reports"];

const MANAGEMENT_RIGHTS = [
  "manage_clients",
  "manage_departments",
  "manage_users",
  "manage_user_plan",
  "manage_user_extra_participants",
  "manage_user_extra_questions",
  "manage_user_team_seats",
  "manage_teams",
  "manage_plans",
  "connection_monitor"
];

/** Super-admin only — never assignable to sub_admin. */
const SUPER_ADMIN_ONLY_RIGHTS = ["manage_roles"];

const ALL_RIGHTS = [...OPERATIONAL_RIGHTS, ...MANAGEMENT_RIGHTS, ...SUPER_ADMIN_ONLY_RIGHTS];

const ASSIGNABLE_SUB_ADMIN_RIGHTS = [...OPERATIONAL_RIGHTS, ...MANAGEMENT_RIGHTS];

const RIGHT_LABELS = {
  sessions: "Sessions",
  builder: "Question Builder",
  present: "Present mode",
  reports: "Reports and analytics",
  manage_clients: "Manage clients",
  manage_departments: "Manage departments",
  manage_users: "Manage users",
  manage_user_plan: "Change user plan",
  manage_user_extra_participants: "Extra participant seats",
  manage_user_extra_questions: "Extra questions",
  manage_user_team_seats: "Extra team seats",
  manage_teams: "Team management",
  manage_plans: "Plan management",
  connection_monitor: "Connection monitor",
  manage_roles: "Role management"
};

const DATA_SCOPES = ["platform", "client", "department", "own_sessions"];
const ASSIGNABLE_DATA_SCOPES = ["client", "department", "own_sessions"];
const SUB_ADMIN_ACCESS_MODES = ["all", "clients", "departments"];

const SYSTEM_ROLE_DEFAULTS = {
  super_admin: {
    slug: "super_admin",
    name: "Super admin",
    data_scope: "platform",
    permissions: [...ALL_RIGHTS],
    is_system: true,
    is_active: true
  },
  sub_admin: {
    slug: "sub_admin",
    name: "Sub admin",
    data_scope: "platform",
    permissions: [],
    is_system: true,
    is_active: true
  },
  client_admin: {
    slug: "client_admin",
    name: "Client admin",
    data_scope: "client",
    permissions: [...OPERATIONAL_RIGHTS],
    is_system: true,
    is_active: true
  },
  dept_admin: {
    slug: "dept_admin",
    name: "Department admin",
    data_scope: "department",
    permissions: [...OPERATIONAL_RIGHTS],
    is_system: true,
    is_active: true
  },
  host: {
    slug: "host",
    name: "Host",
    data_scope: "own_sessions",
    permissions: [...OPERATIONAL_RIGHTS],
    is_system: true,
    is_active: true
  },
  author: {
    slug: "author",
    name: "Question Author",
    data_scope: "own_sessions",
    permissions: [],
    is_system: true,
    is_active: true
  },
  auditor: {
    slug: "auditor",
    name: "Question Auditor",
    data_scope: "own_sessions",
    permissions: [],
    is_system: true,
    is_active: true
  }
};

function normalizeIdList(values) {
  const seen = new Set();
  const list = [];
  for (const value of Array.isArray(values) ? values : []) {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1 || seen.has(id)) continue;
    seen.add(id);
    list.push(id);
  }
  return list;
}

function normalizeRightList(values, { allowSuperOnly = false } = {}) {
  const allowed = allowSuperOnly ? ALL_RIGHTS : ASSIGNABLE_SUB_ADMIN_RIGHTS;
  const seen = new Set();
  const list = [];
  for (const value of Array.isArray(values) ? values : []) {
    const key = String(value || "").trim();
    if (!allowed.includes(key) || seen.has(key)) continue;
    seen.add(key);
    list.push(key);
  }
  return list;
}

function getRoleRecord(user) {
  return user?.assignedRole || user?.roleRecord || null;
}

function getDataScope(user) {
  if (user?.data_scope) return user.data_scope;
  const record = getRoleRecord(user);
  if (record?.data_scope) return record.data_scope;
  return SYSTEM_ROLE_DEFAULTS[user?.role]?.data_scope || "own_sessions";
}

function isSuperAdmin(user) {
  return user?.role === "super_admin";
}

function isSubAdmin(user) {
  return user?.role === "sub_admin";
}

function getSubAdminAccess(user) {
  if (!isSubAdmin(user)) return null;
  const mode = String(user.sub_admin_access || "all").trim();
  return SUB_ADMIN_ACCESS_MODES.includes(mode) ? mode : "all";
}

function getAllowedClientIds(user) {
  return normalizeIdList(user?.allowed_client_ids);
}

function getAllowedDeptIds(user) {
  return normalizeIdList(user?.allowed_dept_ids);
}

function getEffectiveRights(user) {
  if (!user) return [];
  if (isSuperAdmin(user)) return [...ALL_RIGHTS];
  if (isSubAdmin(user)) {
    return normalizeRightList(user.rights_overrides || user.rights || []);
  }
  const record = getRoleRecord(user);
  if (record?.permissions) return normalizeRightList(record.permissions, { allowSuperOnly: false });
  if (Array.isArray(user.rights_overrides)) {
    return normalizeRightList(user.rights_overrides);
  }
  if (Array.isArray(user.rights)) return normalizeRightList(user.rights);
  return [...(SYSTEM_ROLE_DEFAULTS[user.role]?.permissions || OPERATIONAL_RIGHTS)];
}

function userHasRight(user, right) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return getEffectiveRights(user).includes(right);
}

function slugifyRoleName(name) {
  const base = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return base || "role";
}

function toRolePayload(role, extras = {}) {
  if (!role) return null;
  return {
    role_id: role.role_id,
    slug: role.slug,
    name: role.name,
    data_scope: role.data_scope,
    permissions: normalizeRightList(role.permissions, {
      allowSuperOnly: role.slug === "super_admin"
    }),
    is_system: Boolean(role.is_system),
    is_active: Boolean(role.is_active),
    users_count: extras.users_count ?? null
  };
}

module.exports = {
  OPERATIONAL_RIGHTS,
  MANAGEMENT_RIGHTS,
  SUPER_ADMIN_ONLY_RIGHTS,
  ALL_RIGHTS,
  ASSIGNABLE_SUB_ADMIN_RIGHTS,
  RIGHT_LABELS,
  DATA_SCOPES,
  ASSIGNABLE_DATA_SCOPES,
  SUB_ADMIN_ACCESS_MODES,
  SYSTEM_ROLE_DEFAULTS,
  normalizeIdList,
  normalizeRightList,
  getDataScope,
  isSuperAdmin,
  isSubAdmin,
  getSubAdminAccess,
  getAllowedClientIds,
  getAllowedDeptIds,
  getEffectiveRights,
  userHasRight,
  slugifyRoleName,
  toRolePayload
};
