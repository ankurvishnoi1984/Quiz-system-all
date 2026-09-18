const { successResponse, errorResponse } = require("../utils/response");
const {
  listSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  listSubAdminActions
} = require("../services/sub-admin.service");

async function list(req, res) {
  try {
    const data = await listSubAdmins();
    return successResponse(res, data, "Sub admins fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function create(req, res) {
  try {
    const result = await createSubAdmin(req.body);
    const message = result.email_sent
      ? "Sub admin created and welcome email sent"
      : "Sub admin created, but welcome email could not be sent";
    return successResponse(res, result, message, 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function update(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }
    const result = await updateSubAdmin(userId, req.body);
    return successResponse(res, result, "Sub admin updated", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function actions(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }
    const data = await listSubAdminActions(userId, req.query);
    return successResponse(res, data, "Sub admin actions fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  list,
  create,
  update,
  actions
};
