function validateInitiatePaymentPayload(payload) {
  const errors = [];

  const planId = Number(payload?.plan_id);
  if (!payload?.plan_id || Number.isNaN(planId) || planId < 1) {
    errors.push("plan_id is required");
  }

  if (!payload?.email || typeof payload.email !== "string" || !payload.email.trim()) {
    errors.push("email is required");
  }

  if (!payload?.payer_name || typeof payload.payer_name !== "string" || !payload.payer_name.trim()) {
    errors.push("payer_name is required");
  }

  if (payload?.company_name != null && typeof payload.company_name !== "string") {
    errors.push("company_name must be a string");
  }

  if (payload?.otp_token != null && typeof payload.otp_token !== "string") {
    errors.push("otp_token must be a string");
  }

  return errors;
}

function validateConfirmPaymentPayload(payload) {
  const errors = [];

  const paymentId = Number(payload?.payment_id);
  if (!payload?.payment_id || Number.isNaN(paymentId) || paymentId < 1) {
    errors.push("payment_id is required");
  }

  if (!payload?.email || typeof payload.email !== "string" || !payload.email.trim()) {
    errors.push("email is required");
  }

  const method = String(payload?.payment_method || "").toLowerCase();
  if (!["card", "upi"].includes(method)) {
    errors.push("payment_method must be card or upi");
  }

  if (method === "card") {
    if (!payload?.cardholder_name || typeof payload.cardholder_name !== "string") {
      errors.push("cardholder_name is required for card payments");
    }
    if (!payload?.card_number || typeof payload.card_number !== "string") {
      errors.push("card_number is required for card payments");
    }
    if (!payload?.expiry || typeof payload.expiry !== "string") {
      errors.push("expiry is required for card payments");
    }
    if (!payload?.cvv || typeof payload.cvv !== "string") {
      errors.push("cvv is required for card payments");
    }
  }

  if (method === "upi") {
    if (!payload?.upi_vpa || typeof payload.upi_vpa !== "string") {
      errors.push("upi_vpa is required for UPI payments");
    }
  }

  return errors;
}

function validateInitiateRenewalPaymentPayload(payload) {
  const errors = [];

  const planId = Number(payload?.plan_id);
  if (!payload?.plan_id || Number.isNaN(planId) || planId < 1) {
    errors.push("plan_id is required");
  }

  if (!payload?.renew_token || typeof payload.renew_token !== "string") {
    errors.push("renew_token is required");
  }

  if (payload?.payer_name != null && typeof payload.payer_name !== "string") {
    errors.push("payer_name must be a string");
  }

  if (payload?.company_name != null && typeof payload.company_name !== "string") {
    errors.push("company_name must be a string");
  }

  return errors;
}

module.exports = {
  validateInitiatePaymentPayload,
  validateConfirmPaymentPayload,
  validateInitiateRenewalPaymentPayload
};
