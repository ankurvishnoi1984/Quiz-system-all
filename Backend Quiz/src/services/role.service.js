const { Op } = require("sequelize");
const { Role, User } = require("../models");
const {
  ASSIGNABLE_DATA_SCOPES,
  OPERATIONAL_RIGHTS,
  normalizeRightList,
  slugifyRoleName,
  toRolePayload
} = require("../config/user-rights");

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeOperationalPermissions(values) {
  return normalizeRightList(values).filter((right) => OPERATIONAL_RIGHTS.includes(right));
}

async function getRoleBySlug(slug) {
  if (!slug) return null;
  return Role.findOne({ where: { slug: String(slug).trim() } });
}

async function listRoles() {
  const roles = await Role.findAll({ order: [["role_id", "ASC"]] });
  const counts = await User.findAll({
    attributes: ["role", [User.sequelize.fn("COUNT", User.sequelize.col("user_id")), "users_count"]],
    group: ["role"],
    raw: true
  });
  const countBySlug = new Map(
    counts.map((row) => [row.role, Number(row.users_count || 0)])
  );
  return roles.map((role) =>
    toRolePayload(role, { users_count: countBySlug.get(role.slug) || 0 })
  );
}

async function uniqueSlugFromName(name, excludeRoleId = null) {
  const base = slugifyRoleName(name);
  let slug = base;
  let i = 2;
  while (true) {
    const where = { slug };
    if (excludeRoleId) where.role_id = { [Op.ne]: excludeRoleId };
    const existing = await Role.findOne({ where });
    if (!existing) return slug;
    slug = `${base}_${i}`.slice(0, 64);
    i += 1;
  }
}

async function createRole({ name, data_scope, permissions }) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) throw createError("name is required", 400);
  if (!ASSIGNABLE_DATA_SCOPES.includes(data_scope)) {
    throw createError("data_scope must be client, department, or own_sessions", 400);
  }

  const slug = await uniqueSlugFromName(trimmedName);
  const role = await Role.create({
    slug,
    name: trimmedName,
    data_scope,
    permissions: normalizeOperationalPermissions(permissions),
    is_system: false,
    is_active: true
  });
  return toRolePayload(role, { users_count: 0 });
}

async function updateRole({ roleId, name, data_scope, permissions, is_active }) {
  const role = await Role.findByPk(roleId);
  if (!role) throw createError("Role not found", 404);
  if (role.slug === "super_admin") {
    throw createError("Super admin role cannot be changed", 400);
  }
  if (role.slug === "sub_admin") {
    throw createError("Sub admin role permissions are assigned per user, not on the role", 400);
  }

  if (name !== undefined) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) throw createError("name is required", 400);
    role.name = trimmedName;
  }

  if (data_scope !== undefined) {
    if (role.is_system) {
      throw createError("System role data scope cannot be changed", 400);
    }
    if (!ASSIGNABLE_DATA_SCOPES.includes(data_scope)) {
      throw createError("data_scope must be client, department, or own_sessions", 400);
    }
    role.data_scope = data_scope;
  }

  if (permissions !== undefined) {
    if (["author", "auditor"].includes(role.slug)) {
      const requested = normalizeOperationalPermissions(permissions);
      if (requested.length) {
        throw createError(
          "Question Author and Question Auditor cannot receive session permissions",
          400
        );
      }
      role.permissions = [];
    } else {
      role.permissions = normalizeOperationalPermissions(permissions);
    }
  }

  if (is_active !== undefined) {
    role.is_active = Boolean(is_active);
  }

  await role.save();
  const users_count = await User.count({ where: { role: role.slug } });
  return toRolePayload(role, { users_count });
}

async function deleteRole(roleId) {
  const role = await Role.findByPk(roleId);
  if (!role) throw createError("Role not found", 404);
  if (role.is_system || role.slug === "super_admin") {
    throw createError("System roles cannot be deleted", 400);
  }
  const users_count = await User.count({ where: { role: role.slug } });
  if (users_count > 0) {
    throw createError("Reassign users before deleting this role", 400);
  }
  await role.destroy();
  return { deleted: true };
}

module.exports = {
  getRoleBySlug,
  listRoles,
  createRole,
  updateRole,
  deleteRole
};
