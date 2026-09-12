const { errorResponse } = require("../utils/response");
const { userHasRight } = require("../config/user-rights");

function authorizeRights(...requiredRights) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const missing = requiredRights.filter((right) => !userHasRight(req.user, right));
    if (missing.length) {
      return errorResponse(res, "Forbidden: insufficient permissions", 403);
    }

    return next();
  };
}

function authorizeAnyRight(...allowedRights) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    if (allowedRights.some((right) => userHasRight(req.user, right))) {
      return next();
    }

    return errorResponse(res, "Forbidden: insufficient permissions", 403);
  };
}

module.exports = {
  authorizeRights,
  authorizeAnyRight
};
