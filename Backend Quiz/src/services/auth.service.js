const bcrypt = require("bcryptjs");
const { User, Plan, Role } = require("../models");
const { sequelize } = require("../config/database");
const { getWebsiteSignupOrganization } = require("./websiteSignupOrg.service");
const {
  assertPaymentEligibleForSignup,
  linkPaymentToUser
} = require("./payment.service");
const {
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendWebsiteSignupWelcomeEmail
} = require("./email.service");
const { generateTemporaryPassword } = require("../utils/password");
const { addDaysToDateOnly, toDateOnlyString, getHostPlanUsage, canSelfServePlanChange } = require("./plan.service");
const { recordPlanAssignment, PLAN_HISTORY_SOURCES } = require("./plan-history.service");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  verifyEmailVerificationToken
} = require("../utils/jwt");
const { isPaymentOtpEnabled, isLoginOtpEnabled } = require("../config/auth-features");
const {
  PURPOSES,
  sendOtp,
  verifyOtp,
  signLoginChallengeToken,
  verifyLoginChallengeToken,
  signPlanRenewToken
} = require("./otp.service");
const { normalizeMobile, isValidMobile } = require("../utils/phone");
const { getEffectiveRights, getDataScope } = require("../config/user-rights");
const {
  isFirebaseAuthConfigured,
  verifyFirebaseIdToken
} = require("../config/firebase-admin");

const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "Reset credentials have been sent to your email. Please check your inbox.";

const FORGOT_PASSWORD_NOT_FOUND_MESSAGE =
  "Account for the given email does not exist";

const GOOGLE_ONLY_LOGIN_MESSAGE =
  "This account uses Google sign-in. Please continue with Google.";

const GOOGLE_ONLY_FORGOT_PASSWORD_MESSAGE =
  "This account uses Google sign-in. Use Continue with Google on the login page instead of resetting a password.";

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
    mobile_number: user.mobile_number || null,
    full_name: user.full_name,
    role: user.role,
    role_name: user.assignedRole?.name || user.role,
    data_scope: getDataScope(user),
    client_id: user.client_id,
    dept_id: user.dept_id,
    parent_id: user.parent_id || null,
    email_verified: Boolean(user.email_verified_at),
    email_verified_at: user.email_verified_at || null,
    rights: getEffectiveRights(user),
    rights_overrides: Array.isArray(user.rights_overrides) ? user.rights_overrides : null,
    sub_admin_access: user.sub_admin_access || null,
    allowed_client_ids: Array.isArray(user.allowed_client_ids) ? user.allowed_client_ids : null,
    allowed_dept_ids: Array.isArray(user.allowed_dept_ids) ? user.allowed_dept_ids : null,
    must_change_password: isMustChangePassword(user.must_change_password),
    hints_completed: isHintsCompleted(user.hints_completed)
  };
}

async function findUserWithRole(where) {
  return User.findOne({
    where,
    include: [{ model: Role, as: "assignedRole", required: false }]
  });
}

function assertRoleActive(user) {
  if (user?.assignedRole && !user.assignedRole.is_active) {
    const error = new Error("This role is disabled. Contact an administrator.");
    error.statusCode = 403;
    throw error;
  }
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
    email_verified_at: new Date(),
    must_change_password: false
  });

  const payload = buildUserPayload(user);
  const tokens = buildAuthTokens(payload);
  return { user: payload, tokens };
}

async function signupUser(input) {
  const email = input.email.toLowerCase().trim();
  const mobileRaw = input.mobile_number || input.mobile;
  if (!isValidMobile(mobileRaw)) {
    const error = new Error("A valid mobile number is required");
    error.statusCode = 400;
    throw error;
  }
  const mobileNumber = normalizeMobile(mobileRaw);

  const firebaseToken = String(
    input.firebase_id_token || input.firebaseIdToken || input.idToken || input.id_token || ""
  ).trim();
  const usingGoogle = Boolean(firebaseToken);
  let firebaseIdentity = null;

  if (usingGoogle) {
    firebaseIdentity = await verifyFirebaseIdToken(firebaseToken);
    if (firebaseIdentity.email !== email) {
      const error = new Error("Google account email does not match the registration email");
      error.statusCode = 400;
      throw error;
    }
  } else if (!input.password || typeof input.password !== "string") {
    const error = new Error("password is required");
    error.statusCode = 400;
    throw error;
  } else if (input.password.length < 8) {
    const error = new Error("password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({ where: { email } });

  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  if (usingGoogle) {
    const existingFirebase = await User.findOne({
      where: { firebase_uid: firebaseIdentity.uid }
    });
    if (existingFirebase) {
      const error = new Error("This Google account is already linked to another user");
      error.statusCode = 409;
      throw error;
    }
  }

  const existingMobile = await User.findOne({ where: { mobile_number: mobileNumber } });
  if (existingMobile) {
    const error = new Error("Mobile number already registered");
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

  const password_hash = usingGoogle
    ? null
    : await bcrypt.hash(input.password, 10);
  const fullName = String(
    input.full_name || firebaseIdentity?.name || ""
  ).trim();
  const transaction = await sequelize.transaction();

  try {
    const { client, department } = await getWebsiteSignupOrganization({ transaction });

    const user = await User.create(
      {
        full_name: fullName,
        email,
        mobile_number: mobileNumber,
        password_hash,
        firebase_uid: usingGoogle ? firebaseIdentity.uid : null,
        avatar_url: usingGoogle ? firebaseIdentity.picture : null,
        role: "host",
        client_id: client.client_id,
        dept_id: department.dept_id,
        plan_id: plan.plan_id,
        plan_expires_at: planExpiresAt,
        email_verified_at: new Date(),
        must_change_password: false,
        is_active: true
      },
      { transaction }
    );

    await linkPaymentToUser(paymentId, user.user_id, { transaction });
    await recordPlanAssignment({
      userId: user.user_id,
      planId: plan.plan_id,
      plan,
      expiresAt: planExpiresAt,
      source: PLAN_HISTORY_SOURCES.SIGNUP,
      paymentId,
      transaction
    });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  try {
    await sendWebsiteSignupWelcomeEmail({
      to: email,
      fullName,
      email,
      password: usingGoogle ? undefined : input.password,
      omitCredentials: usingGoogle,
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
  const user = await findUserWithRole({ email: input.email.toLowerCase() });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.password_hash) {
    const error = new Error(GOOGLE_ONLY_LOGIN_MESSAGE);
    error.statusCode = 400;
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
  assertRoleActive(user);

  if (isLoginOtpEnabled()) {
    await sendOtp({
      email: user.email,
      purpose: PURPOSES.LOGIN,
      fullName: user.full_name
    });

    return {
      requires_otp: true,
      challenge_token: signLoginChallengeToken(user),
      email: user.email,
      expires_in_seconds: 600
    };
  }

  user.last_login_at = new Date();
  await user.save();

  const payload = buildUserPayload(user);
  const tokens = buildAuthTokens(payload);
  return { user: payload, tokens };
}

/**
 * Host Portal Google login via Firebase ID token.
 * Links existing email accounts; does not create unpaid hosts.
 */
async function loginWithGoogle(input) {
  if (!isFirebaseAuthConfigured()) {
    const error = new Error("Google sign-in is not configured");
    error.statusCode = 503;
    throw error;
  }

  const idToken = input.idToken || input.id_token || input.firebase_id_token;
  const identity = await verifyFirebaseIdToken(idToken);

  let user = await findUserWithRole({ firebase_uid: identity.uid });
  if (!user) {
    user = await findUserWithRole({ email: identity.email });
  }

  if (!user) {
    const error = new Error(
      "No account found for this Google email. Please register on the website first."
    );
    error.statusCode = 404;
    error.code = "ACCOUNT_NOT_FOUND";
    throw error;
  }

  if (!user.is_active) {
    const error = new Error("User account is inactive");
    error.statusCode = 403;
    throw error;
  }
  assertRoleActive(user);

  let dirty = false;
  if (user.firebase_uid && user.firebase_uid !== identity.uid) {
    const error = new Error("This email is linked to a different Google account");
    error.statusCode = 409;
    throw error;
  }
  if (!user.firebase_uid) {
    user.firebase_uid = identity.uid;
    dirty = true;
  }
  if (!user.email_verified_at) {
    user.email_verified_at = new Date();
    dirty = true;
  }
  if (!user.full_name && identity.name) {
    user.full_name = identity.name;
    dirty = true;
  }
  if (!user.avatar_url && identity.picture) {
    user.avatar_url = identity.picture;
    dirty = true;
  }
  // Google-only users should not be stuck on forced password change.
  if (!user.password_hash && isMustChangePassword(user.must_change_password)) {
    user.must_change_password = false;
    dirty = true;
  }

  user.last_login_at = new Date();
  dirty = true;
  if (dirty) await user.save();

  const payload = buildUserPayload(user);
  const tokens = buildAuthTokens(payload);
  return { user: payload, tokens };
}

async function verifyLoginOtp(input) {
  if (!isLoginOtpEnabled()) {
    const error = new Error("Login email OTP is disabled");
    error.statusCode = 400;
    throw error;
  }

  const challenge = verifyLoginChallengeToken(input.challenge_token);
  const email = String(input.email || challenge.email || "").toLowerCase().trim();

  if (email !== String(challenge.email || "").toLowerCase()) {
    const error = new Error("Email does not match this login challenge");
    error.statusCode = 400;
    throw error;
  }

  await verifyOtp({
    email,
    purpose: PURPOSES.LOGIN,
    code: input.code
  });

  const user = await User.findByPk(challenge.user_id, {
    include: [{ model: Role, as: "assignedRole", required: false }]
  });
  if (!user || !user.is_active) {
    const error = new Error("User not found or inactive");
    error.statusCode = 401;
    throw error;
  }
  assertRoleActive(user);

  if (String(user.email || "").toLowerCase() !== email) {
    const error = new Error("Login verification mismatch");
    error.statusCode = 401;
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

  const user = await User.findByPk(decoded.user_id, {
    include: [{ model: Role, as: "assignedRole", required: false }]
  });
  if (!user || !user.is_active) {
    const error = new Error("User not found or inactive");
    error.statusCode = 401;
    throw error;
  }
  assertRoleActive(user);

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

  if (!user.password_hash) {
    const error = new Error(GOOGLE_ONLY_FORGOT_PASSWORD_MESSAGE);
    error.statusCode = 400;
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

    if (!user.password_hash) {
      const error = new Error(GOOGLE_ONLY_LOGIN_MESSAGE);
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

  if (user.password_hash) {
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      const error = new Error("New password must be different from the current password");
      error.statusCode = 400;
      throw error;
    }
  }

  user.password_hash = await bcrypt.hash(newPassword, 10);
  user.must_change_password = false;
  await user.save();

  let confirmation_email_sent = true;
  try {
    await sendPasswordChangedEmail({
      to: user.email,
      fullName: user.full_name
    });
  } catch (error) {
    confirmation_email_sent = false;
    console.error("Password change confirmation email failed:", error);
  }

  const payload = buildUserPayload(user);
  return {
    user: payload,
    tokens: buildAuthTokens(payload),
    confirmation_email_sent
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

async function verifyTeamMemberEmail(token) {
  let decoded;
  try {
    decoded = verifyEmailVerificationToken(String(token || ""));
  } catch {
    const error = new Error("Verification link is invalid or has expired");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findByPk(decoded.user_id);
  if (
    !user ||
    !user.is_active ||
    !user.parent_id ||
    String(user.email).toLowerCase() !== String(decoded.email).toLowerCase()
  ) {
    const error = new Error("Verification link is invalid");
    error.statusCode = 400;
    throw error;
  }

  if (!user.email_verified_at) {
    user.email_verified_at = new Date();
    await user.save();
  }
  return { user: buildUserPayload(user) };
}

function buildPlanRenewSessionResult(user, usage = null) {
  const assigned = usage?.assigned_plan;
  const planName = assigned?.name || usage?.plan?.name || null;
  return {
    renew_token: signPlanRenewToken(user),
    email: user.email,
    full_name: user.full_name,
    user_id: user.user_id,
    current_plan_id: assigned?.plan_id ?? user.plan_id ?? null,
    current_plan_name: planName,
    plan_expires_at: usage?.plan_expires_at ?? toDateOnlyString(user.plan_expires_at),
    days_until_expiry:
      usage?.days_until_expiry == null ? null : Number(usage.days_until_expiry),
    can_self_serve_plan_change: usage ? canSelfServePlanChange(usage) : false
  };
}

async function buildPlanRenewSessionResultForUser(user) {
  const usage = await getHostPlanUsage(user.user_id);
  return buildPlanRenewSessionResult(user, usage);
}

async function startPlanRenew(input) {
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  const user = await User.findOne({ where: { email } });

  if (!user) {
    const error = new Error("No host account found for this email");
    error.statusCode = 404;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error("User account is inactive");
    error.statusCode = 403;
    throw error;
  }

  if (isPaymentOtpEnabled()) {
    await sendOtp({
      email: user.email,
      purpose: PURPOSES.PLAN_RENEW,
      fullName: user.full_name
    });

    return {
      requires_otp: true,
      email: user.email,
      expires_in_seconds: 600
    };
  }

  return buildPlanRenewSessionResultForUser(user);
}

async function verifyPlanRenewOtp(input) {
  if (!isPaymentOtpEnabled()) {
    const error = new Error("Payment email OTP is disabled");
    error.statusCode = 400;
    throw error;
  }

  const email = String(input.email || "")
    .toLowerCase()
    .trim();

  await verifyOtp({
    email,
    purpose: PURPOSES.PLAN_RENEW,
    code: input.code
  });

  const user = await User.findOne({ where: { email } });
  if (!user || !user.is_active) {
    const error = new Error("User not found or inactive");
    error.statusCode = 401;
    throw error;
  }

  return buildPlanRenewSessionResultForUser(user);
}

module.exports = {
  registerUser,
  signupUser,
  loginUser,
  loginWithGoogle,
  verifyLoginOtp,
  startPlanRenew,
  verifyPlanRenewOtp,
  refreshAccessToken,
  requestPasswordReset,
  changePassword,
  setHintsCompleted,
  verifyTeamMemberEmail,
  isMustChangePassword,
  isHintsCompleted
};
