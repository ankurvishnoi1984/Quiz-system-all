const { successResponse, errorResponse } = require("../utils/response");
const {
  initiatePayment,
  confirmDummyPayment
} = require("../services/payment.service");
const {
  validateInitiatePaymentPayload,
  validateConfirmPaymentPayload
} = require("../validators/payment.validator");

async function initiate(req, res) {
  try {
    const errors = validateInitiatePaymentPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const payment = await initiatePayment(req.body);
    return successResponse(res, { payment }, "Payment initiated", 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function confirm(req, res) {
  try {
    const errors = validateConfirmPaymentPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const payment = await confirmDummyPayment(req.body);
    return successResponse(res, { payment }, "Payment successful", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  initiate,
  confirm
};
