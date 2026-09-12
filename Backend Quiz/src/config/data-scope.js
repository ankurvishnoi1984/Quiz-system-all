const { getDataScope } = require("./user-rights");

function isPlatformScope(user) {
  return getDataScope(user) === "platform" || user?.role === "super_admin";
}

function canAccessDepartment(user, department) {
  if (!user || !department) return false;
  if (isPlatformScope(user)) return true;
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
  if (isPlatformScope(user)) return true;
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
  return isPlatformScope(user) || getDataScope(user) === "client";
}

function canSwitchDepartments(user) {
  const scope = getDataScope(user);
  return isPlatformScope(user) || scope === "client";
}

function needsClientOnUser(scope) {
  return scope === "client" || scope === "department" || scope === "own_sessions";
}

function needsDepartmentOnUser(scope) {
  return scope === "department" || scope === "own_sessions";
}

module.exports = {
  isPlatformScope,
  canAccessDepartment,
  canAccessSession,
  assertSessionWriteAccess,
  canCreateDepartments,
  canSwitchDepartments,
  needsClientOnUser,
  needsDepartmentOnUser
};
