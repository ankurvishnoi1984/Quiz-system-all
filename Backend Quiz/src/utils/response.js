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
