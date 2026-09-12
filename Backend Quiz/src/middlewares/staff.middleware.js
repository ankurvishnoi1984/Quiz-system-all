const { errorResponse } = require("../utils/response");

function authorizeStaff(req, res, next) {
  if (!req.user) {
    return errorResponse(res, "Unauthorized", 401);
  }
  return next();
}

module.exports = authorizeStaff;
