const { assertAdminActionOtpToken } = require("../services/otp.service");
const { errorResponse } = require("../utils/response");

/**
 * Require a verified admin-action token for mutations performed by super admins.
 * Non-super-admin staff keep their existing department-level permissions.
 */
function requireAdminActionOtp(req, res, next) {
  if (req.user?.role !== "super_admin") return next();

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
