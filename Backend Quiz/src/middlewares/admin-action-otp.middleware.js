const { assertAdminActionOtpToken } = require("../services/otp.service");
const { errorResponse } = require("../utils/response");

/**
 * Require a verified admin-action token for mutations performed by
 * super admins and sub admins. Other staff keep existing permissions.
 */
function requireAdminActionOtp(req, res, next) {
  if (req.user?.role !== "super_admin" && req.user?.role !== "sub_admin") return next();

  try {
    const token =
      req.body?.otp_token ||
      req.get("x-admin-action-otp-token");
    assertAdminActionOtpToken(token);
    return next();
  } catch (error) {
    // This is an action-verification failure, not an expired login session.
    // Use 403 so API clients do not refresh/logout the authenticated admin.
    return errorResponse(res, error.message, 403);
  }
}

module.exports = requireAdminActionOtp;
