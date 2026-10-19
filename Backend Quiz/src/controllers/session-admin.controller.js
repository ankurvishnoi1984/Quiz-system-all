const { successResponse, errorResponse } = require("../utils/response");
const {
  getSessionAdminDashboard,
  changeSessionAdminPassword
} = require("../services/session-admin.service");

async function dashboard(req, res) {
  try {
    const data = await getSessionAdminDashboard({ user: req.user });
    return successResponse(res, data, "Session Admin dashboard fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function changePassword(req, res) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (Number.isNaN(sessionId)) {
      return errorResponse(res, "sessionId must be a number", 400);
    }
    const newPassword = req.body?.new_password ?? req.body?.newPassword;
    const result = await changeSessionAdminPassword({
      sessionId,
      actor: req.user,
      newPassword
    });
    return successResponse(res, result, "Session Admin password updated", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  dashboard,
  changePassword
};
