const { successResponse, errorResponse } = require("../utils/response");
const { listRoles, createRole, updateRole, deleteRole } = require("../services/role.service");

async function list(req, res) {
  try {
    const roles = await listRoles();
    return successResponse(res, { roles }, "Roles fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function create(req, res) {
  try {
    const role = await createRole(req.body || {});
    return successResponse(res, { role }, "Role created", 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function update(req, res) {
  try {
    const roleId = Number(req.params.roleId);
    if (Number.isNaN(roleId)) return errorResponse(res, "roleId must be a number", 400);
    const role = await updateRole({
      roleId,
      name: req.body?.name,
      data_scope: req.body?.data_scope,
      permissions: req.body?.permissions,
      is_active: req.body?.is_active
    });
    return successResponse(res, { role }, "Role updated", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function remove(req, res) {
  try {
    const roleId = Number(req.params.roleId);
    if (Number.isNaN(roleId)) return errorResponse(res, "roleId must be a number", 400);
    await deleteRole(roleId);
    return successResponse(res, { deleted: true }, "Role deleted", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = { list, create, update, remove };
