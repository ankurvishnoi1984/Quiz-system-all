const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { User, Client, Department, Role } = require("../models");
const {
  ASSIGNABLE_SUB_ADMIN_RIGHTS,
  SUB_ADMIN_ACCESS_MODES,
  normalizeRightList,
  normalizeIdList,
  getEffectiveRights,
  RIGHT_LABELS
} = require("../config/user-rights");
const { listAuditLogs } = require("./audit-log.service");
const { sendNewUserWelcomeEmail } = require("./email.service");

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toSubAdminPayload(user) {
  const rights = normalizeRightList(user.rights_overrides || []);
  return {
    user_id: user.user_id,
    email: user.email,
    full_name: user.full_name,
    role: "sub_admin",
    role_name: user.assignedRole?.name || "Sub admin",
    is_active: Boolean(user.is_active),
    last_login_at: user.last_login_at || null,
    created_at: user.created_at || null,
    rights,
    rights_labels: rights.map((key) => RIGHT_LABELS[key] || key),
    sub_admin_access: user.sub_admin_access || "all",
    allowed_client_ids: normalizeIdList(user.allowed_client_ids),
    allowed_dept_ids: normalizeIdList(user.allowed_dept_ids)
  };
}

async function assertClientsExist(clientIds) {
  if (!clientIds.length) return;
  const count = await Client.count({ where: { client_id: { [Op.in]: clientIds } } });
  if (count !== clientIds.length) {
    throw createError("One or more selected clients were not found", 400);
  }
}

async function assertDepartmentsExist(deptIds) {
  if (!deptIds.length) return;
  const count = await Department.count({ where: { dept_id: { [Op.in]: deptIds } } });
  if (count !== deptIds.length) {
    throw createError("One or more selected departments were not found", 400);
  }
}

function normalizeSubAdminAccessInput(input = {}) {
  const access = String(input.sub_admin_access || "all").trim();
  if (!SUB_ADMIN_ACCESS_MODES.includes(access)) {
    throw createError("sub_admin_access must be all, clients, or departments", 400);
  }

  const rights = normalizeRightList(input.rights || input.rights_overrides || []);
  if (!rights.length) {
    throw createError("Select at least one permission for the sub admin", 400);
  }
  const invalid = (Array.isArray(input.rights) ? input.rights : []).filter(
    (key) => !ASSIGNABLE_SUB_ADMIN_RIGHTS.includes(String(key || "").trim())
  );
  if (invalid.includes("manage_roles")) {
    throw createError("Role management cannot be assigned to sub admins", 400);
  }

  const allowedClientIds = normalizeIdList(input.allowed_client_ids);
  const allowedDeptIds = normalizeIdList(input.allowed_dept_ids);

  if (access === "clients" && !allowedClientIds.length) {
    throw createError("Select at least one client for client-scoped access", 400);
  }
  if (access === "departments" && !allowedDeptIds.length) {
    throw createError("Select at least one department for department-scoped access", 400);
  }
  if (access === "all") {
    return {
      rights,
      sub_admin_access: "all",
      allowed_client_ids: null,
      allowed_dept_ids: null
    };
  }
  if (access === "clients") {
    return {
      rights,
      sub_admin_access: "clients",
      allowed_client_ids: allowedClientIds,
      allowed_dept_ids: null
    };
  }
  return {
    rights,
    sub_admin_access: "departments",
    allowed_client_ids: null,
    allowed_dept_ids: allowedDeptIds
  };
}

async function listSubAdmins() {
  const users = await User.findAll({
    where: { role: "sub_admin" },
    include: [{ model: Role, as: "assignedRole", required: false }],
    order: [["user_id", "DESC"]]
  });
  const payload = users.map(toSubAdminPayload);
  return {
    summary: {
      total: payload.length,
      active: payload.filter((row) => row.is_active).length
    },
    sub_admins: payload
  };
}

async function createSubAdmin(input) {
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  const fullName = String(input.full_name || "").trim();
  const password = String(input.password || "");
  if (!email) throw createError("email is required", 400);
  if (!fullName) throw createError("full_name is required", 400);
  if (password.length < 8) throw createError("password must be at least 8 characters", 400);

  const existing = await User.findOne({ where: { email } });
  if (existing) throw createError("Email already registered", 409);

  const role = await Role.findOne({ where: { slug: "sub_admin", is_active: true } });
  if (!role) throw createError("sub_admin role is not available — run migrations", 500);

  const access = normalizeSubAdminAccessInput(input);
  if (access.allowed_client_ids?.length) await assertClientsExist(access.allowed_client_ids);
  if (access.allowed_dept_ids?.length) await assertDepartmentsExist(access.allowed_dept_ids);

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    full_name: fullName,
    email,
    password_hash,
    role: "sub_admin",
    client_id: null,
    dept_id: null,
    plan_id: null,
    plan_expires_at: null,
    email_verified_at: new Date(),
    must_change_password: false,
    rights_overrides: access.rights,
    sub_admin_access: access.sub_admin_access,
    allowed_client_ids: access.allowed_client_ids,
    allowed_dept_ids: access.allowed_dept_ids,
    is_active: true
  });

  let email_sent = false;
  try {
    await sendNewUserWelcomeEmail({
      to: user.email,
      fullName: user.full_name,
      email: user.email,
      password,
      roleLabel: "Sub admin",
      clientName: null,
      deptName: null,
      createdByName: "Administrator"
    });
    email_sent = true;
  } catch (err) {
    console.error("createSubAdmin welcome email failed:", err);
  }

  const fresh = await User.findByPk(user.user_id, {
    include: [{ model: Role, as: "assignedRole", required: false }]
  });
  return { sub_admin: toSubAdminPayload(fresh), email_sent };
}

async function updateSubAdmin(userId, input = {}) {
  const user = await User.findByPk(Number(userId), {
    include: [{ model: Role, as: "assignedRole", required: false }]
  });
  if (!user || user.role !== "sub_admin") {
    throw createError("Sub admin not found", 404);
  }

  if (input.full_name !== undefined) {
    const fullName = String(input.full_name || "").trim();
    if (!fullName) throw createError("full_name is required", 400);
    user.full_name = fullName;
  }

  if (input.is_active !== undefined) {
    user.is_active = Boolean(input.is_active);
  }

  if (
    input.rights !== undefined ||
    input.rights_overrides !== undefined ||
    input.sub_admin_access !== undefined ||
    input.allowed_client_ids !== undefined ||
    input.allowed_dept_ids !== undefined
  ) {
    const access = normalizeSubAdminAccessInput({
      rights: input.rights ?? input.rights_overrides ?? user.rights_overrides,
      sub_admin_access: input.sub_admin_access ?? user.sub_admin_access ?? "all",
      allowed_client_ids:
        input.allowed_client_ids !== undefined
          ? input.allowed_client_ids
          : user.allowed_client_ids,
      allowed_dept_ids:
        input.allowed_dept_ids !== undefined ? input.allowed_dept_ids : user.allowed_dept_ids
    });
    if (access.allowed_client_ids?.length) await assertClientsExist(access.allowed_client_ids);
    if (access.allowed_dept_ids?.length) await assertDepartmentsExist(access.allowed_dept_ids);
    user.rights_overrides = access.rights;
    user.sub_admin_access = access.sub_admin_access;
    user.allowed_client_ids = access.allowed_client_ids;
    user.allowed_dept_ids = access.allowed_dept_ids;
  }

  if (input.password) {
    const password = String(input.password);
    if (password.length < 8) throw createError("password must be at least 8 characters", 400);
    user.password_hash = await bcrypt.hash(password, 10);
  }

  await user.save();
  await user.reload({ include: [{ model: Role, as: "assignedRole", required: false }] });
  return { sub_admin: toSubAdminPayload(user) };
}

async function listSubAdminActions(userId, filters = {}) {
  const user = await User.findByPk(Number(userId));
  if (!user || user.role !== "sub_admin") {
    throw createError("Sub admin not found", 404);
  }
  return listAuditLogs({
    ...filters,
    actor_type: "user",
    actor_id: String(user.user_id)
  });
}

module.exports = {
  listSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  listSubAdminActions,
  toSubAdminPayload,
  getEffectiveRights
};
