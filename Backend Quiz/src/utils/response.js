const { logError } = require("../services/error-log.service");

function successResponse(res, data = {}, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function errorResponse(
  res,
  message = "Something went wrong",
  statusCode = 500,
  errors = null,
  code = null
) {
  try {
    logError({
      level: statusCode >= 500 ? "error" : "warn",
      source: "api",
      message,
      statusCode,
      code,
      extra: errors != null ? { errors } : null
    });
  } catch (_) {
    /* never break the HTTP response */
  }

  const body = {
    success: false,
    message,
    errors
  };
  if (code) body.code = code;
  return res.status(statusCode).json(body);
}

module.exports = {
  successResponse,
  errorResponse
};
