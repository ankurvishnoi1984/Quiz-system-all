const {
  getDataScope,
  isSuperAdmin,
  isSubAdmin,
  getSubAdminAccess,
  getAllowedClientIds,
  getAllowedDeptIds
} = require("./user-rights");

function isUnrestrictedPlatformActor(user) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (isSubAdmin(user) && getSubAdminAccess(user) === "all") return true;
  return false;
}

function isPlatformScope(user) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (isSubAdmin(user)) return getSubAdminAccess(user) === "all";
  return getDataScope(user) === "platform";
}

function canAccessClientId(user, clientId) {
  if (!user || clientId == null) return false;
  if (isSuperAdmin(user)) return true;
  if (isSubAdmin(user)) {
    const mode = getSubAdminAccess(user);
    if (mode === "all") return true;
    if (mode === "clients") {
      return getAllowedClientIds(user).includes(Number(clientId));
    }
    // Department-scoped: client access is validated via department ownership in services.
    return mode === "departments";
  }
  const scope = getDataScope(user);
  if (scope === "client" || scope === "department" || scope === "own_sessions") {
    return Number(user.client_id) === Number(clientId);
  }
  return false;
}

function canAccessDepartment(user, department) {
  if (!user || !department) return false;
  if (isSuperAdmin(user)) return true;
  if (isSubAdmin(user)) {
    const mode = getSubAdminAccess(user);
    if (mode === "all") return true;
    if (mode === "clients") {
      return getAllowedClientIds(user).includes(Number(department.client_id));
    }
    if (mode === "departments") {
      return getAllowedDeptIds(user).includes(Number(department.dept_id));
    }
    return false;
  }
  const scope = getDataScope(user);
  if (scope === "client") {
    return Number(user.client_id) === Number(department.client_id);
  }
  if (scope === "department" || scope === "own_sessions") {
    return Number(user.dept_id) === Number(department.dept_id);
  }
  return false;
}

function canAccessSession(user, session) {
  if (!user || !session) return false;
  if (isSuperAdmin(user)) return true;
  if (isSubAdmin(user)) {
    const mode = getSubAdminAccess(user);
    if (mode === "all") return true;
    const deptClientId = session.department?.client_id;
    if (mode === "clients") {
      return getAllowedClientIds(user).includes(Number(deptClientId));
    }
    if (mode === "departments") {
      return getAllowedDeptIds(user).includes(Number(session.dept_id));
    }
    return false;
  }
  const scope = getDataScope(user);
  const deptClientId = session.department?.client_id;
  if (scope === "client") {
    return Number(user.client_id) === Number(deptClientId);
  }
  if (scope === "department") {
    return Number(user.dept_id) === Number(session.dept_id);
  }
  if (scope === "own_sessions") {
    return (
      Number(user.dept_id) === Number(session.dept_id) &&
      Number(user.user_id) === Number(session.host_id)
    );
  }
  return false;
}

function assertSessionWriteAccess(user, session) {
  if (canAccessSession(user, session)) return;
  const error = new Error("Forbidden: session access denied");
  error.statusCode = 403;
  throw error;
}

function canCreateDepartments(user) {
  if (isSuperAdmin(user)) return true;
  if (isSubAdmin(user)) {
    return getSubAdminAccess(user) === "all" || getSubAdminAccess(user) === "clients";
  }
  return getDataScope(user) === "client";
}

function canSwitchDepartments(user) {
  if (isUnrestrictedPlatformActor(user)) return true;
  if (isSubAdmin(user)) {
    const mode = getSubAdminAccess(user);
    return mode === "all" || mode === "clients";
  }
  return getDataScope(user) === "client";
}

function needsClientOnUser(scope) {
  return scope === "client" || scope === "department" || scope === "own_sessions";
}

function needsDepartmentOnUser(scope) {
  return scope === "department" || scope === "own_sessions";
}

function buildSubAdminClientWhere(user) {
  if (!isSubAdmin(user)) return null;
  const mode = getSubAdminAccess(user);
  if (mode === "all") return null;
  if (mode === "clients") {
    const ids = getAllowedClientIds(user);
    return ids.length ? { client_id: ids } : { client_id: -1 };
  }
  return null;
}

function buildSubAdminDepartmentWhere(user) {
  if (!isSubAdmin(user)) return null;
  const mode = getSubAdminAccess(user);
  if (mode === "all") return null;
  if (mode === "clients") {
    const ids = getAllowedClientIds(user);
    return ids.length ? { client_id: ids } : { client_id: -1 };
  }
  if (mode === "departments") {
    const ids = getAllowedDeptIds(user);
    return ids.length ? { dept_id: ids } : { dept_id: -1 };
  }
  return null;
}

function buildSubAdminUserWhere(user) {
  if (!isSubAdmin(user)) return null;
  const mode = getSubAdminAccess(user);
  if (mode === "all") return null;
  if (mode === "clients") {
    const ids = getAllowedClientIds(user);
    return ids.length ? { client_id: ids } : { client_id: -1 };
  }
  if (mode === "departments") {
    const ids = getAllowedDeptIds(user);
    return ids.length ? { dept_id: ids } : { dept_id: -1 };
  }
  return null;
}

module.exports = {
  isPlatformScope,
  isUnrestrictedPlatformActor,
  canAccessClientId,
  canAccessDepartment,
  canAccessSession,
  assertSessionWriteAccess,
  canCreateDepartments,
  canSwitchDepartments,
  needsClientOnUser,
  needsDepartmentOnUser,
  buildSubAdminClientWhere,
  buildSubAdminDepartmentWhere,
  buildSubAdminUserWhere
};
