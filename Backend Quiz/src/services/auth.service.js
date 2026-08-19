const bcrypt = require("bcryptjs");
const { User, Plan } = require("../models");
const { sequelize } = require("../config/database");
const { getWebsiteSignupOrganization } = require("./websiteSignupOrg.service");
const {
  assertPaymentEligibleForSignup,
  linkPaymentToUser
} = require("./payment.service");
const { sendPasswordResetEmail, sendWebsiteSignupWelcomeEmail } = require("./email.service");
const { generateTemporaryPassword } = require("../utils/password");
const { addDaysToDateOnly, toDateOnlyString } = require("./plan.service");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} = require("../utils/jwt");

const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "Reset credentials have been sent to your email. Please check your inbox.";

const FORGOT_PASSWORD_NOT_FOUND_MESSAGE =
  "Account for the given email does not exist";

function isMustChangePassword(value) {
  return value === true || value === 1;
}

function isHintsCompleted(value) {
  return value === true || value === 1;
}

function buildUserPayload(user) {
  return {
    user_id: user.user_id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    client_id: user.client_id,
    dept_id: user.dept_id,
    must_change_password: isMustChangePassword(user.must_change_password),
    hints_completed: isHintsCompleted(user.hints_completed)
  };
}

function buildAuthTokens(payload) {
  return {
    access_token: signAccessToken(payload),
    refresh_token: signRefreshToken(payload)
  };
}

async function registerUser(input) {
  const existingUser = await User.findOne({
    where: { email: input.email.toLowerCase() }
  });

  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const password_hash = await bcrypt.hash(input.password, 10);

  const user = await User.create({
    full_name: input.full_name,
    email: input.email.toLowerCase(),
    password_hash,
    role: input.role,
    client_id: input.client_id || null,
    dept_id: input.dept_id || null,
    must_change_password: false
  });

  const payload = buildUserPayload(user);
  const tokens = buildAuthTokens(payload);
  return { user: payload, tokens };
}

async function signupUser(input) {
  const email = input.email.toLowerCase().trim();
  const existingUser = await User.findOne({ where: { email } });

  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const planId = Number(input.plan_id);
  const plan = await Plan.findOne({
    where: { plan_id: planId, is_active: true }
  });

  if (!plan) {
    const error = new Error("Selected plan is not available");
    error.statusCode = 400;
    throw error;
  }

  if (plan.is_free) {
    const error = new Error("Free Demo cannot be selected during signup");
    error.statusCode = 400;
    throw error;
  }

  const paymentId = Number(input.payment_id);
  if (!input.payment_id || Number.isNaN(paymentId) || paymentId < 1) {
    const error = new Error("payment_id is required");
    error.statusCode = 400;
    throw error;
  }

  await assertPaymentEligibleForSignup({
    paymentId,
    email,
    planId: plan.plan_id
  });

  const planExpiresAt = plan.default_duration_days
    ? addDaysToDateOnly(plan.default_duration_days)
    : null;

  const password_hash = await bcrypt.hash(input.password, 10);
  const transaction = await sequelize.transaction();

  try {
    const { client, department } = await getWebsiteSignupOrganization({ transaction });

    const user = await User.create(
      {
        full_name: input.full_name.trim(),
        email,
        password_hash,
        role: "host",
        client_id: client.client_id,
        dept_id: department.dept_id,
        plan_id: plan.plan_id,
        plan_expires_at: planExpiresAt,
        must_change_password: false,
        is_active: true
      },
      { transaction }
    );

    await linkPaymentToUser(paymentId, user.user_id, { transaction });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  try {
    await sendWebsiteSignupWelcomeEmail({
      to: email,
      fullName: input.full_name.trim(),
      email,
      password: input.password,
      planName: plan.name,
      planExpiresAt: toDateOnlyString(planExpiresAt),
      companyName: input.company_name ? String(input.company_name).trim() : null
    });
  } catch (err) {
    console.error("signupUser welcome email failed:", err);
  }

  const createdUser = await User.findOne({ where: { email } });
  const payload = buildUserPayload(createdUser);
  const tokens = buildAuthTokens(payload);
  return { user: payload, tokens, plan: { plan_id: plan.plan_id, name: plan.name } };
}

async function loginUser(input) {
  const user = await User.findOne({
    where: { email: input.email.toLowerCase() }
  });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordMatch = await bcrypt.compare(input.password, user.password_hash);
  if (!isPasswordMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error("User account is inactive");
    error.statusCode = 403;
    throw error;
  }

  user.last_login_at = new Date();
  await user.save();

  const payload = buildUserPayload(user);
  const tokens = buildAuthTokens(payload);
  return { user: payload, tokens };
}

async function refreshAccessToken(refreshToken) {
  let decoded;

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findByPk(decoded.user_id);
  if (!user || !user.is_active) {
    const error = new Error("User not found or inactive");
    error.statusCode = 401;
    throw error;
  }

  const payload = buildUserPayload(user);
  return {
    access_token: signAccessToken(payload)
  };
}

async function requestPasswordReset(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });

  if (!user || !user.is_active) {
    const error = new Error(FORGOT_PASSWORD_NOT_FOUND_MESSAGE);
    error.statusCode = 404;
    throw error;
  }

  const temporaryPassword = generateTemporaryPassword();
  user.password_hash = await bcrypt.hash(temporaryPassword, 10);
  user.must_change_password = true;
  await user.save();

  await sendPasswordResetEmail({
    to: user.email,
    fullName: user.full_name,
    temporaryPassword
  });

  return { message: FORGOT_PASSWORD_SUCCESS_MESSAGE, sent: true };
}

async function changePassword(userId, body = {}) {
  const user = await User.findByPk(userId);
  if (!user || !user.is_active) {
    const error = new Error("User not found or inactive");
    error.statusCode = 401;
    throw error;
  }

  const newPassword = body.new_password ?? body.newPassword;
  if (!newPassword || typeof newPassword !== "string") {
    const error = new Error("new_password is required");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("new_password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }

  const forcedChange = isMustChangePassword(user.must_change_password);
  const currentPassword = body.current_password ?? body.currentPassword;

  if (!forcedChange) {
    if (!currentPassword || typeof currentPassword !== "string") {
      const error = new Error("current_password is required");
      error.statusCode = 400;
      throw error;
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      const error = new Error("Current password is incorrect");
      error.statusCode = 400;
      throw error;
    }
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
  if (isSamePassword) {
    const error = new Error("New password must be different from the current password");
    error.statusCode = 400;
    throw error;
  }

  user.password_hash = await bcrypt.hash(newPassword, 10);
  user.must_change_password = false;
  await user.save();

  const payload = buildUserPayload(user);
  return {
    user: payload,
    tokens: buildAuthTokens(payload)
  };
}

async function setHintsCompleted(userId, completed) {
  const user = await User.findByPk(userId);
  if (!user || !user.is_active) {
    const error = new Error("User not found or inactive");
    error.statusCode = 401;
    throw error;
  }

  user.hints_completed = Boolean(completed);
  await user.save();

  return { user: buildUserPayload(user) };
}

module.exports = {
  registerUser,
  signupUser,
  loginUser,
  refreshAccessToken,
  requestPasswordReset,
  changePassword,
  setHintsCompleted,
  isMustChangePassword,
  isHintsCompleted
};
