const {
  registerUser,
  signupUser,
  loginUser,
  verifyLoginOtp,
  startPlanRenew,
  verifyPlanRenewOtp,
  refreshAccessToken,
  requestPasswordReset,
  changePassword,
  setHintsCompleted,
  verifyTeamMemberEmail
} = require("../services/auth.service");
const { resendOwnTeamVerification } = require("../services/team.service");
const { applyPlanRenewal } = require("../services/payment.service");
const { sendOtp, verifyOtp, PURPOSES, verifyLoginChallengeToken, sendAdminActionOtp, verifyAdminActionOtp } = require("../services/otp.service");
const { getAuthFeatureFlags } = require("../config/auth-features");
const {
  validateLoginPayload,
  validateRegisterPayload,
  validateForgotPasswordPayload,
  validateSignupPayload,
  validateSendOtpPayload,
  validateVerifyOtpPayload,
  validateVerifyLoginOtpPayload,
  validateRenewStartPayload,
  validateRenewVerifyOtpPayload,
  validateRenewApplyPayload
} = require("../validators/auth.validator");
const { successResponse, errorResponse } = require("../utils/response");

async function register(req, res) {
  try {
    const errors = validateRegisterPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const result = await registerUser(req.body);
    return successResponse(res, result, "User registered successfully", 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function signup(req, res) {
  try {
    const errors = validateSignupPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const result = await signupUser(req.body);
    return successResponse(res, result, "Account created successfully", 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function login(req, res) {
  try {
    const errors = validateLoginPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const result = await loginUser(req.body);
    const message = result.requires_otp
      ? "Verification code sent to your email"
      : "Login successful";
    return successResponse(res, result, message, 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function verifyLoginOtpHandler(req, res) {
  try {
    const errors = validateVerifyLoginOtpPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const result = await verifyLoginOtp(req.body);
    return successResponse(res, result, "Login successful", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function sendOtpHandler(req, res) {
  try {
    const errors = validateSendOtpPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const purpose = String(req.body.purpose).toLowerCase();

    if (purpose === PURPOSES.LOGIN) {
      const challengeToken = req.body.challenge_token;
      if (!challengeToken) {
        return errorResponse(
          res,
          "Login OTP is sent automatically after password verification",
          400
        );
      }
      const challenge = verifyLoginChallengeToken(challengeToken);
      const result = await sendOtp({
        email: challenge.email,
        purpose: PURPOSES.LOGIN,
        fullName: req.body.full_name || req.body.fullName
      });
      return successResponse(res, result, "Verification code sent", 200);
    }

    const result = await sendOtp({
      email: req.body.email,
      purpose,
      fullName: req.body.full_name || req.body.fullName,
      mobile: req.body.mobile || req.body.mobile_number
    });
    return successResponse(res, result, "Verification code sent", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function verifyOtpHandler(req, res) {
  try {
    const errors = validateVerifyOtpPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const purpose = String(req.body.purpose).toLowerCase();
    if (purpose === PURPOSES.LOGIN) {
      return errorResponse(res, "Use /auth/login/verify-otp for login verification", 400);
    }

    const result = await verifyOtp({
      email: req.body.email,
      purpose,
      code: req.body.code,
      email_code: req.body.email_code,
      mobile: req.body.mobile || req.body.mobile_number,
      mobile_code: req.body.mobile_code
    });
    return successResponse(
      res,
      result,
      purpose === PURPOSES.PAYMENT ? "Email and mobile verified" : "Email verified",
      200
    );
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function features(req, res) {
  return successResponse(res, getAuthFeatureFlags(), "Auth feature flags", 200);
}

async function me(req, res) {
  return successResponse(res, { user: req.user }, "Current user fetched", 200);
}

async function refresh(req, res) {
  try {
    const refreshToken = req.body?.refresh_token;

    if (!refreshToken) {
      return errorResponse(res, "refresh_token is required", 400);
    }

    const result = await refreshAccessToken(refreshToken);
    return successResponse(res, result, "Access token refreshed", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function forgotPassword(req, res) {
  try {
    const errors = validateForgotPasswordPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const result = await requestPasswordReset(req.body.email);
    return successResponse(res, result, result.message, 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function changePasswordHandler(req, res) {
  try {
    const result = await changePassword(req.user.user_id, req.body);
    return successResponse(res, result, "Password updated successfully", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function hintsCompleted(req, res) {
  try {
    const completed = req.body?.completed ?? req.body?.hints_completed;
    if (typeof completed !== "boolean" && completed !== 0 && completed !== 1) {
      return errorResponse(res, "completed is required", 400);
    }

    const result = await setHintsCompleted(req.user.user_id, Boolean(completed));
    return successResponse(res, result, "Hints status updated", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function verifyEmail(req, res) {
  try {
    if (!req.body?.token) {
      return errorResponse(res, "token is required", 400);
    }
    const result = await verifyTeamMemberEmail(req.body.token);
    return successResponse(res, result, "Email verified successfully", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function resendEmailVerification(req, res) {
  try {
    const result = await resendOwnTeamVerification(req.user.user_id);
    return successResponse(
      res,
      result,
      result.already_verified ? "Email is already verified" : "Verification email sent",
      200
    );
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function renewStart(req, res) {
  try {
    const errors = validateRenewStartPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const result = await startPlanRenew(req.body);
    const message = result.requires_otp
      ? "Verification code sent to your email"
      : "Account verified for renewal";
    return successResponse(res, result, message, 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function renewVerifyOtp(req, res) {
  try {
    const errors = validateRenewVerifyOtpPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const result = await verifyPlanRenewOtp(req.body);
    return successResponse(res, result, "Account verified for renewal", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function renewApply(req, res) {
  try {
    const errors = validateRenewApplyPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const result = await applyPlanRenewal(req.body);
    return successResponse(res, result, "Plan renewed successfully", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function sendAdminActionOtpHandler(req, res) {
  try {
    const result = await sendAdminActionOtp({
      fullName: req.user?.full_name || null
    });
    return successResponse(res, result, "Verification code sent to configured admin emails", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function verifyAdminActionOtpHandler(req, res) {
  try {
    const code = String(req.body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return errorResponse(res, "Validation failed", 400, ["code must be a 6-digit number"]);
    }
    const result = await verifyAdminActionOtp({ code });
    return successResponse(res, result, "Admin action verified", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  register,
  signup,
  login,
  verifyLoginOtp: verifyLoginOtpHandler,
  renewStart,
  renewVerifyOtp,
  renewApply,
  sendAdminActionOtp: sendAdminActionOtpHandler,
  verifyAdminActionOtp: verifyAdminActionOtpHandler,
  sendOtp: sendOtpHandler,
  verifyOtp: verifyOtpHandler,
  features,
  me,
  refresh,
  forgotPassword,
  changePassword: changePasswordHandler,
  hintsCompleted,
  verifyEmail,
  resendEmailVerification
};
