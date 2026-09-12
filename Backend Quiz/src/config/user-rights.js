const OPERATIONAL_RIGHTS = ["sessions", "builder", "present", "reports"];

const RIGHT_LABELS = {
  sessions: "Sessions",
  builder: "Question Builder",
  present: "Present mode",
  reports: "Reports and analytics"
};

const DATA_SCOPES = ["platform", "client", "department", "own_sessions"];
const ASSIGNABLE_DATA_SCOPES = ["client", "department", "own_sessions"];

const SYSTEM_ROLE_DEFAULTS = {
  super_admin: {
    slug: "super_admin",
    name: "Super admin",
    data_scope: "platform",
    permissions: [...OPERATIONAL_RIGHTS],
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
  }
};

function normalizeRightList(values) {
  const seen = new Set();
  const list = [];
  for (const value of Array.isArray(values) ? values : []) {
    const key = String(value || "").trim();
    if (!OPERATIONAL_RIGHTS.includes(key) || seen.has(key)) continue;
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

function getEffectiveRights(user) {
  if (!user) return [];
  if (user.role === "super_admin" || getDataScope(user) === "platform") {
    return [...OPERATIONAL_RIGHTS];
  }
  const record = getRoleRecord(user);
  if (record?.permissions) return normalizeRightList(record.permissions);
  if (Array.isArray(user.rights)) return normalizeRightList(user.rights);
  return [...(SYSTEM_ROLE_DEFAULTS[user.role]?.permissions || OPERATIONAL_RIGHTS)];
}

function userHasRight(user, right) {
  if (!user) return false;
  if (user.role === "super_admin" || getDataScope(user) === "platform") return true;
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
    permissions: normalizeRightList(role.permissions),
    is_system: Boolean(role.is_system),
    is_active: Boolean(role.is_active),
    users_count: extras.users_count ?? null
  };
}

module.exports = {
  OPERATIONAL_RIGHTS,
  RIGHT_LABELS,
  DATA_SCOPES,
  ASSIGNABLE_DATA_SCOPES,
  SYSTEM_ROLE_DEFAULTS,
  normalizeRightList,
  getDataScope,
  getEffectiveRights,
  userHasRight,
  slugifyRoleName,
  toRolePayload
};
