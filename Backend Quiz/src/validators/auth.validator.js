const VALID_ROLES = ["super_admin", "client_admin", "dept_admin", "host"];

function validateRegisterPayload(payload) {
  const errors = [];

  if (!payload?.full_name || typeof payload.full_name !== "string") {
    errors.push("full_name is required");
  }

  if (!payload?.email || typeof payload.email !== "string") {
    errors.push("email is required");
  }

  if (!payload?.password || typeof payload.password !== "string") {
    errors.push("password is required");
  } else if (payload.password.length < 8) {
    errors.push("password must be at least 8 characters");
  }

  if (!payload?.role || !VALID_ROLES.includes(payload.role)) {
    errors.push(`role must be one of: ${VALID_ROLES.join(", ")}`);
  }

  return errors;
}

function validateLoginPayload(payload) {
  const errors = [];

  if (!payload?.email || typeof payload.email !== "string") {
    errors.push("email is required");
  }

  if (!payload?.password || typeof payload.password !== "string") {
    errors.push("password is required");
  }

  return errors;
}

function validateForgotPasswordPayload(payload) {
  const errors = [];

  if (!payload?.email || typeof payload.email !== "string" || !payload.email.trim()) {
    errors.push("email is required");
  }

  return errors;
}

function validateChangePasswordPayload(payload, { mustChangePassword = false } = {}) {
  const errors = [];

  if (!mustChangePassword) {
    if (!payload?.current_password || typeof payload.current_password !== "string") {
      errors.push("current_password is required");
    }
  }

  if (!payload?.new_password || typeof payload.new_password !== "string") {
    errors.push("new_password is required");
  } else if (payload.new_password.length < 8) {
    errors.push("new_password must be at least 8 characters");
  }

  return errors;
}

function isValidSignupMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
  if (digits.length === 12 && digits.startsWith("91")) return /^91[6-9]\d{9}$/.test(digits);
  if (digits.startsWith("0") && digits.length === 11) return /^0[6-9]\d{9}$/.test(digits);
  return false;
}

function validateSignupPayload(payload) {
  const errors = [];

  if (!payload?.full_name || typeof payload.full_name !== "string" || !payload.full_name.trim()) {
    errors.push("full_name is required");
  }

  if (!payload?.email || typeof payload.email !== "string" || !payload.email.trim()) {
    errors.push("email is required");
  }

  const mobile = payload?.mobile_number || payload?.mobile;
  if (!mobile || typeof mobile !== "string" || !String(mobile).trim()) {
    errors.push("mobile_number is required");
  } else if (!isValidSignupMobile(mobile)) {
    errors.push("mobile_number must be a valid 10-digit Indian mobile number");
  }

  if (!payload?.password || typeof payload.password !== "string") {
    errors.push("password is required");
  } else if (payload.password.length < 8) {
    errors.push("password must be at least 8 characters");
  }

  const planId = Number(payload?.plan_id);
  if (!payload?.plan_id || Number.isNaN(planId) || planId < 1) {
    errors.push("plan_id is required");
  }

  if (payload?.company_name != null && typeof payload.company_name !== "string") {
    errors.push("company_name must be a string");
  }

  const paymentId = Number(payload?.payment_id);
  if (!payload?.payment_id || Number.isNaN(paymentId) || paymentId < 1) {
    errors.push("payment_id is required");
  }

  return errors;
}

function validateSendOtpPayload(payload) {
  const errors = [];
  const purpose = String(payload?.purpose || "").toLowerCase();
  if (!["payment", "login", "plan_renew"].includes(purpose)) {
    errors.push("purpose must be payment, login, or plan_renew");
  }
  if (purpose === "login") {
    if (!payload?.challenge_token || typeof payload.challenge_token !== "string") {
      errors.push("challenge_token is required to resend login OTP");
    }
  } else if (!payload?.email || typeof payload.email !== "string" || !payload.email.trim()) {
    errors.push("email is required");
  }
  if (purpose === "payment") {
    const mobile = payload?.mobile || payload?.mobile_number;
    if (!mobile || typeof mobile !== "string" || !String(mobile).trim()) {
      errors.push("mobile is required for payment verification");
    } else if (!isValidSignupMobile(mobile)) {
      errors.push("mobile must be a valid 10-digit Indian mobile number");
    }
  }
  if (payload?.full_name != null && typeof payload.full_name !== "string") {
    errors.push("full_name must be a string");
  }
  return errors;
}

function validateVerifyOtpPayload(payload) {
  const errors = [];
  if (!payload?.email || typeof payload.email !== "string" || !payload.email.trim()) {
    errors.push("email is required");
  }
  const purpose = String(payload?.purpose || "").toLowerCase();
  if (!["payment", "login", "plan_renew"].includes(purpose)) {
    errors.push("purpose must be payment, login, or plan_renew");
  }

  if (purpose === "payment") {
    const mobile = payload?.mobile || payload?.mobile_number;
    if (!mobile || typeof mobile !== "string" || !String(mobile).trim()) {
      errors.push("mobile is required for payment verification");
    } else if (!isValidSignupMobile(mobile)) {
      errors.push("mobile must be a valid 10-digit Indian mobile number");
    }
    const emailCode = String(payload?.email_code || payload?.code || "").trim();
    if (!/^\d{6}$/.test(emailCode)) {
      errors.push("email_code must be a 6-digit number");
    }
    const mobileCode = String(payload?.mobile_code || "").trim();
    if (!/^\d{6}$/.test(mobileCode)) {
      errors.push("mobile_code must be a 6-digit number");
    }
  } else {
    const code = String(payload?.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      errors.push("code must be a 6-digit number");
    }
  }
  return errors;
}

function validateVerifyLoginOtpPayload(payload) {
  const errors = [];
  if (!payload?.challenge_token || typeof payload.challenge_token !== "string") {
    errors.push("challenge_token is required");
  }
  const code = String(payload?.code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    errors.push("code must be a 6-digit number");
  }
  return errors;
}

function validateRenewStartPayload(payload) {
  const errors = [];
  if (!payload?.email || typeof payload.email !== "string" || !payload.email.trim()) {
    errors.push("email is required");
  }
  return errors;
}

function validateRenewVerifyOtpPayload(payload) {
  const errors = [];
  if (!payload?.email || typeof payload.email !== "string" || !payload.email.trim()) {
    errors.push("email is required");
  }
  const code = String(payload?.code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    errors.push("code must be a 6-digit number");
  }
  return errors;
}

function validateRenewApplyPayload(payload) {
  const errors = [];
  if (!payload?.renew_token || typeof payload.renew_token !== "string") {
    errors.push("renew_token is required");
  }
  const paymentId = Number(payload?.payment_id);
  if (!payload?.payment_id || Number.isNaN(paymentId) || paymentId < 1) {
    errors.push("payment_id is required");
  }
  const planId = Number(payload?.plan_id);
  if (!payload?.plan_id || Number.isNaN(planId) || planId < 1) {
    errors.push("plan_id is required");
  }
  return errors;
}

module.exports = {
  validateRegisterPayload,
  validateLoginPayload,
  validateForgotPasswordPayload,
  validateChangePasswordPayload,
  validateSignupPayload,
  validateSendOtpPayload,
  validateVerifyOtpPayload,
  validateVerifyLoginOtpPayload,
  validateRenewStartPayload,
  validateRenewVerifyOtpPayload,
  validateRenewApplyPayload
};
