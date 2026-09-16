const { verifyAccessToken } = require("../utils/jwt");
const { User, Role } = require("../models");
const { isMustChangePassword, isHintsCompleted } = require("../services/auth.service");
const { getEffectiveRights, getDataScope } = require("../config/user-rights");
const { errorResponse } = require("../utils/response");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(res, "Authorization token is required", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);

    if (decoded?.typ) {
      return errorResponse(res, "Invalid or expired token", 401);
    }

    const user = await User.findByPk(decoded.user_id, {
      include: [{ model: Role, as: "assignedRole", required: false }]
    });

    if (!user || !user.is_active) {
      return errorResponse(res, "User not found or inactive", 401);
    }

    if (user.assignedRole && !user.assignedRole.is_active) {
      return errorResponse(res, "This role is disabled. Contact an administrator.", 403);
    }

    const userWithRole = user;
    req.user = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      role_name: user.assignedRole?.name || user.role,
      data_scope: getDataScope(userWithRole),
      client_id: user.client_id,
      dept_id: user.dept_id,
      parent_id: user.parent_id || null,
      email_verified: Boolean(user.email_verified_at),
      email_verified_at: user.email_verified_at || null,
      rights: getEffectiveRights(userWithRole),
      assignedRole: user.assignedRole || null,
      must_change_password: isMustChangePassword(user.must_change_password),
      hints_completed: isHintsCompleted(user.hints_completed)
    };

    const mayAccessVerification =
      req.originalUrl.endsWith("/auth/me") ||
      req.originalUrl.endsWith("/auth/resend-email-verification");
    if (user.parent_id && !user.email_verified_at && !mayAccessVerification) {
      return res.status(403).json({
        success: false,
        message: "Verify your email before accessing the dashboard",
        code: "EMAIL_NOT_VERIFIED",
        errors: null
      });
    }
    return next();
  } catch (err) {
    return errorResponse(res, "Invalid or expired token", 401);
  }
}

module.exports = authMiddleware;
