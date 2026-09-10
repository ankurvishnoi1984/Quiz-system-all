const crypto = require("crypto");
const { Op } = require("sequelize");
const { EmailOtp, SmsOtp, User, NotificationRecipient, Session } = require("../models");
const { sendEmailOtpMail } = require("./email.service");
const { sendOtpSms } = require("./sms.service");
const { signAccessToken, verifyAccessToken } = require("../utils/jwt");
const { isValidMobile, normalizeMobile } = require("../utils/phone");
const {
  isPaymentOtpEnabled,
  isLoginOtpEnabled,
  isAdminActionOtpEnabled,
  isParticipantJoinOtpEnabled
} = require("../config/auth-features");
const env = require("../config/env");

const PURPOSES = {
  PAYMENT: "payment",
  LOGIN: "login",
  PLAN_RENEW: "plan_renew",
  ADMIN_ACTION: "admin_action",
  SESSION_JOIN: "session_join"
};

const CONTACT_JOIN_TYPES = new Set(["name_email", "name_mobile", "name_email_mobile"]);
const SESSION_STATE_JOIN_TYPES = CONTACT_JOIN_TYPES;

/** Stable storage key for admin-action OTPs (not a real mailbox). */
const ADMIN_ACTION_OTP_STORAGE_EMAIL = "admin-action@otp.internal";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFIED_TOKEN_TTL = "15m";
const LOGIN_CHALLENGE_TTL = "10m";
const PLAN_RENEW_TOKEN_TTL = "30m";

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function getOtpPepper() {
  return process.env.OTP_PEPPER || env.jwt.accessSecret || "otp-pepper";
}

function hashOtpCode(code) {
  return crypto.createHash("sha256").update(`${getOtpPepper()}:${code}`).digest("hex");
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function assertPurpose(purpose) {
  if (
    ![
      PURPOSES.PAYMENT,
      PURPOSES.LOGIN,
      PURPOSES.PLAN_RENEW,
      PURPOSES.ADMIN_ACTION,
      PURPOSES.SESSION_JOIN
    ].includes(purpose)
  ) {
    const error = new Error("Invalid OTP purpose");
    error.statusCode = 400;
    throw error;
  }
}

function assertFeatureEnabled(purpose) {
  if (
    (purpose === PURPOSES.PAYMENT || purpose === PURPOSES.PLAN_RENEW) &&
    !isPaymentOtpEnabled()
  ) {
    const error = new Error("Payment email OTP is disabled");
    error.statusCode = 400;
    throw error;
  }
  if (purpose === PURPOSES.LOGIN && !isLoginOtpEnabled()) {
    const error = new Error("Login email OTP is disabled");
    error.statusCode = 400;
    throw error;
  }
  if (purpose === PURPOSES.ADMIN_ACTION && !isAdminActionOtpEnabled()) {
    const error = new Error("Admin action OTP is disabled");
    error.statusCode = 400;
    throw error;
  }
  if (purpose === PURPOSES.SESSION_JOIN && !isParticipantJoinOtpEnabled()) {
    const error = new Error("Participant join OTP is disabled");
    error.statusCode = 400;
    throw error;
  }
}

async function assertResendCooldown(Model, where) {
  const latest = await Model.findOne({
    where: { ...where, consumed_at: null },
    order: [["created_at", "DESC"]]
  });

  if (latest) {
    const ageMs = Date.now() - new Date(latest.created_at).getTime();
    if (ageMs < OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - ageMs) / 1000);
      const error = new Error(`Please wait ${waitSec}s before requesting another code`);
      error.statusCode = 429;
      throw error;
    }
  }
}

async function consumeOpenOtps(Model, where) {
  await Model.update(
    { consumed_at: new Date() },
    { where: { ...where, consumed_at: null } }
  );
}

async function createOtpRecord(Model, fields) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await Model.create({
    ...fields,
    code_hash: hashOtpCode(code),
    attempts: 0,
    expires_at: expiresAt,
    consumed_at: null
  });
  return code;
}

async function verifyOtpRecord(Model, where, code, label) {
  const normalizedCode = String(code || "").trim();
  const channel = label === "email" ? "email" : "mobile";
  if (!/^\d{6}$/.test(normalizedCode)) {
    const error = new Error(
      channel === "email"
        ? "Enter the 6-digit code we sent to your email."
        : "Enter the 6-digit code we sent to your mobile."
    );
    error.statusCode = 400;
    throw error;
  }

  const record = await Model.findOne({
    where: {
      ...where,
      consumed_at: null,
      expires_at: { [Op.gt]: new Date() }
    },
    order: [["created_at", "DESC"]]
  });

  if (!record) {
    const latest = await Model.findOne({
      where,
      order: [["created_at", "DESC"]]
    });

    let message;
    if (!latest) {
      message =
        channel === "email"
          ? "No email code was found for this address. Please tap Resend codes and try again."
          : "No mobile code was found for this number. Please tap Resend codes and try again.";
    } else if (latest.consumed_at) {
      message =
        channel === "email"
          ? "This email code was already used. Please tap Resend codes to get a new one."
          : "This mobile code was already used. Please tap Resend codes to get a new one.";
    } else {
      message =
        channel === "email"
          ? "This email code has expired. Please tap Resend codes to get a new one."
          : "This mobile code has expired. Please tap Resend codes to get a new one.";
    }

    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  if (Number(record.attempts) >= MAX_VERIFY_ATTEMPTS) {
    record.consumed_at = new Date();
    await record.save();
    const error = new Error(
      "Too many incorrect attempts for this code. Please tap Resend codes to get a new one."
    );
    error.statusCode = 429;
    throw error;
  }

  if (record.code_hash !== hashOtpCode(normalizedCode)) {
    record.attempts = Number(record.attempts) + 1;
    await record.save();
    const remaining = MAX_VERIFY_ATTEMPTS - record.attempts;
    const error = new Error(
      remaining > 0
        ? `Incorrect ${channel} code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts for this code. Please tap Resend codes to get a new one."
    );
    error.statusCode = 400;
    throw error;
  }

  record.consumed_at = new Date();
  await record.save();
  return record;
}

async function sendOtp({ email, purpose, fullName, mobile }) {
  assertPurpose(purpose);
  assertFeatureEnabled(purpose);

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    const error = new Error("A valid email is required");
    error.statusCode = 400;
    throw error;
  }

  let normalizedMobile = null;
  if (purpose === PURPOSES.PAYMENT) {
    if (!isValidMobile(mobile)) {
      const error = new Error("A valid mobile number is required");
      error.statusCode = 400;
      throw error;
    }
    normalizedMobile = normalizeMobile(mobile);

    const existingEmail = await User.findOne({ where: { email: normalizedEmail } });
    if (existingEmail) {
      const error = new Error("Email already registered");
      error.statusCode = 409;
      throw error;
    }

    const existingMobile = await User.findOne({ where: { mobile_number: normalizedMobile } });
    if (existingMobile) {
      const error = new Error("Mobile number already registered");
      error.statusCode = 409;
      throw error;
    }
  }

  if (purpose === PURPOSES.PLAN_RENEW) {
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user || !user.is_active) {
      const error = new Error("No active host account found for this email");
      error.statusCode = 404;
      throw error;
    }
  }

  if (purpose === PURPOSES.LOGIN) {
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user || !user.is_active) {
      const error = new Error("Unable to send verification code");
      error.statusCode = 400;
      throw error;
    }
  }

  await assertResendCooldown(EmailOtp, { email: normalizedEmail, purpose });
  if (normalizedMobile) {
    await assertResendCooldown(SmsOtp, { mobile: normalizedMobile, purpose });
  }

  await consumeOpenOtps(EmailOtp, { email: normalizedEmail, purpose });
  if (normalizedMobile) {
    await consumeOpenOtps(SmsOtp, { mobile: normalizedMobile, purpose });
  }

  const emailCode = await createOtpRecord(EmailOtp, {
    email: normalizedEmail,
    purpose
  });

  let smsCode = null;
  let smsResult = null;
  if (normalizedMobile) {
    smsCode = await createOtpRecord(SmsOtp, {
      mobile: normalizedMobile,
      purpose
    });
  }

  await sendEmailOtpMail({
    to: normalizedEmail,
    fullName: fullName || null,
    code: emailCode,
    purpose,
    expiresInMinutes: Math.round(OTP_TTL_MS / 60000)
  });

  if (normalizedMobile && smsCode) {
    smsResult = await sendOtpSms({ mobile: normalizedMobile, code: smsCode });
  }

  return {
    sent: true,
    email: normalizedEmail,
    mobile: normalizedMobile || undefined,
    email_sent: true,
    sms_sent: Boolean(smsResult?.sent),
    sms_skipped: Boolean(smsResult?.skipped),
    purpose,
    expires_in_seconds: Math.round(OTP_TTL_MS / 1000)
  };
}

function signVerifiedToken({ email, purpose, userId, mobile, sessionCode, channel, nickname }) {
  const payload = {
    typ: "otp_verified",
    purpose
  };
  if (email) {
    payload.email = normalizeEmail(email);
  }
  if (userId != null) {
    payload.user_id = Number(userId);
  }
  if (mobile) {
    payload.mobile = normalizeMobile(mobile);
  }
  if (sessionCode) {
    payload.session_code = String(sessionCode).trim().toUpperCase();
  }
  if (channel) {
    payload.channel = channel;
  }
  if (nickname) {
    payload.nickname = String(nickname).trim();
  }
  return signAccessToken(payload, { expiresIn: VERIFIED_TOKEN_TTL });
}

function assertOtpVerifiedToken(token, { purpose, email, mobile } = {}) {
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    const error = new Error("Email verification expired or invalid. Please verify again.");
    error.statusCode = 401;
    throw error;
  }

  if (decoded?.typ !== "otp_verified") {
    const error = new Error("Email verification expired or invalid. Please verify again.");
    error.statusCode = 401;
    throw error;
  }

  if (purpose && decoded.purpose !== purpose) {
    const error = new Error("Email verification does not match this step");
    error.statusCode = 401;
    throw error;
  }

  if (email && normalizeEmail(decoded.email) !== normalizeEmail(email)) {
    const error = new Error("Email verification does not match this account");
    error.statusCode = 401;
    throw error;
  }

  if (mobile) {
    const expected = normalizeMobile(mobile);
    if (!expected || decoded.mobile !== expected) {
      const error = new Error("Mobile verification does not match this account");
      error.statusCode = 401;
      throw error;
    }
  }

  if (purpose === PURPOSES.PAYMENT && !decoded.mobile) {
    const error = new Error("Mobile verification is required. Please verify again.");
    error.statusCode = 401;
    throw error;
  }

  return decoded;
}

async function verifyOtp({ email, purpose, code, email_code, mobile, mobile_code }) {
  assertPurpose(purpose);
  assertFeatureEnabled(purpose);

  const normalizedEmail = normalizeEmail(email);

  if (purpose === PURPOSES.PAYMENT) {
    if (!isValidMobile(mobile)) {
      const error = new Error("A valid mobile number is required");
      error.statusCode = 400;
      throw error;
    }
    const normalizedMobile = normalizeMobile(mobile);
    const emailCode = email_code != null && String(email_code).trim() !== "" ? email_code : code;
    const mobileCode = mobile_code;

    await verifyOtpRecord(
      EmailOtp,
      { email: normalizedEmail, purpose },
      emailCode,
      "email"
    );
    await verifyOtpRecord(
      SmsOtp,
      { mobile: normalizedMobile, purpose },
      mobileCode,
      "mobile"
    );

    const otp_token = signVerifiedToken({
      email: normalizedEmail,
      purpose,
      mobile: normalizedMobile
    });

    return {
      verified: true,
      email: normalizedEmail,
      mobile: normalizedMobile,
      purpose,
      otp_token
    };
  }

  await verifyOtpRecord(EmailOtp, { email: normalizedEmail, purpose }, code, "email");

  let userId = null;
  if (purpose === PURPOSES.LOGIN || purpose === PURPOSES.PLAN_RENEW) {
    const user = await User.findOne({ where: { email: normalizedEmail } });
    userId = user?.user_id || null;
  }

  const otp_token = signVerifiedToken({
    email: normalizedEmail,
    purpose,
    userId
  });

  return {
    verified: true,
    email: normalizedEmail,
    purpose,
    otp_token
  };
}

function signLoginChallengeToken(user) {
  return signAccessToken(
    {
      typ: "login_challenge",
      user_id: user.user_id,
      email: normalizeEmail(user.email)
    },
    { expiresIn: LOGIN_CHALLENGE_TTL }
  );
}

function verifyLoginChallengeToken(token) {
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    const error = new Error("Login verification expired. Please sign in again.");
    error.statusCode = 401;
    throw error;
  }

  if (decoded?.typ !== "login_challenge" || !decoded.user_id) {
    const error = new Error("Login verification expired. Please sign in again.");
    error.statusCode = 401;
    throw error;
  }

  return decoded;
}

function signPlanRenewToken(user) {
  return signAccessToken(
    {
      typ: "plan_renew",
      user_id: user.user_id,
      email: normalizeEmail(user.email)
    },
    { expiresIn: PLAN_RENEW_TOKEN_TTL }
  );
}

function assertPlanRenewToken(token) {
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    const error = new Error("Renewal session expired. Please verify your account again.");
    error.statusCode = 401;
    throw error;
  }

  if (decoded?.typ !== "plan_renew" || !decoded.user_id) {
    const error = new Error("Renewal session expired. Please verify your account again.");
    error.statusCode = 401;
    throw error;
  }

  return decoded;
}

async function listAdminActionOtpEmails() {
  const rows = await NotificationRecipient.findAll({
    where: {
      purpose: NotificationRecipient.ADMIN_ACTION_OTP_PURPOSE,
      is_active: true
    },
    attributes: ["email"],
    order: [["id", "ASC"]]
  });
  const seen = new Set();
  return rows
    .map((row) => normalizeEmail(row.email))
    .filter((address) => {
      if (!address || !address.includes("@") || seen.has(address)) return false;
      seen.add(address);
      return true;
    });
}

async function sendAdminActionOtp({ fullName } = {}) {
  assertFeatureEnabled(PURPOSES.ADMIN_ACTION);

  const recipients = await listAdminActionOtpEmails();
  if (!recipients.length) {
    const error = new Error(
      "No admin OTP recipients configured. Add active rows with purpose admin_action_otp in notification_recipients."
    );
    error.statusCode = 400;
    throw error;
  }

  const storageEmail = ADMIN_ACTION_OTP_STORAGE_EMAIL;
  const purpose = PURPOSES.ADMIN_ACTION;

  await assertResendCooldown(EmailOtp, { email: storageEmail, purpose });
  await consumeOpenOtps(EmailOtp, { email: storageEmail, purpose });

  const code = await createOtpRecord(EmailOtp, {
    email: storageEmail,
    purpose
  });

  const sendErrors = [];
  for (const to of recipients) {
    try {
      await sendEmailOtpMail({
        to,
        fullName: fullName || null,
        code,
        purpose,
        expiresInMinutes: Math.round(OTP_TTL_MS / 60000)
      });
    } catch (err) {
      console.error("sendAdminActionOtp mail failed:", to, err.message);
      sendErrors.push(to);
    }
  }

  if (sendErrors.length === recipients.length) {
    const error = new Error("Unable to send verification code to configured admin emails");
    error.statusCode = 502;
    throw error;
  }

  return {
    sent: true,
    purpose,
    recipient_count: recipients.length - sendErrors.length,
    expires_in_seconds: Math.round(OTP_TTL_MS / 1000)
  };
}

async function verifyAdminActionOtp({ code }) {
  const result = await verifyOtp({
    email: ADMIN_ACTION_OTP_STORAGE_EMAIL,
    purpose: PURPOSES.ADMIN_ACTION,
    code
  });
  return result;
}

function assertAdminActionOtpToken(token) {
  if (!isAdminActionOtpEnabled()) return null;
  if (!token || typeof token !== "string") {
    const error = new Error("Verification code is required before saving this change");
    error.statusCode = 401;
    throw error;
  }
  return assertOtpVerifiedToken(token, { purpose: PURPOSES.ADMIN_ACTION });
}

function isContactJoinType(joinType) {
  return CONTACT_JOIN_TYPES.has(joinType);
}

function supportsParticipantSessionState(joinType) {
  return SESSION_STATE_JOIN_TYPES.has(joinType);
}

function normalizeJoinNickname(nickname) {
  const value = String(nickname || "").trim();
  return value || null;
}

function resolveSessionJoinChannel(joinType, channel) {
  if (joinType === "name_email") return "email";
  if (joinType === "name_mobile") return "mobile";
  if (joinType === "name_email_mobile") {
    const normalized = String(channel || "").trim().toLowerCase();
    if (normalized !== "email" && normalized !== "mobile") {
      const error = new Error("Choose email or mobile to receive your verification code");
      error.statusCode = 400;
      throw error;
    }
    return normalized;
  }
  const error = new Error("This session does not require a verification code");
  error.statusCode = 400;
  throw error;
}

function assertSessionJoinIdentityFields(joinType, { nickname, email, mobile }) {
  const normalizedNickname = normalizeJoinNickname(nickname);
  if (!normalizedNickname) {
    const error = new Error("Name is required to join this session");
    error.statusCode = 400;
    throw error;
  }

  let normalizedEmail = null;
  let normalizedMobile = null;

  if (joinType === "name_email" || joinType === "name_email_mobile") {
    normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      const error = new Error("A valid email is required to join this session");
      error.statusCode = 400;
      throw error;
    }
  }

  if (joinType === "name_mobile" || joinType === "name_email_mobile") {
    if (!isValidMobile(mobile)) {
      const error = new Error("A valid mobile number is required to join this session");
      error.statusCode = 400;
      throw error;
    }
    normalizedMobile = normalizeMobile(mobile);
  }

  return {
    nickname: normalizedNickname,
    email: normalizedEmail,
    mobile: normalizedMobile
  };
}

async function getSessionForJoinOtp(code) {
  const session = await Session.findOne({
    where: { session_code: String(code || "").trim().toUpperCase() },
    attributes: ["session_id", "session_code", "join_type", "title", "status"]
  });
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }
  if (!isContactJoinType(session.join_type)) {
    const error = new Error("This session does not require a verification code");
    error.statusCode = 400;
    throw error;
  }
  return session;
}

async function sendSessionJoinOtp({ code, nickname, email, mobile, channel }) {
  assertFeatureEnabled(PURPOSES.SESSION_JOIN);

  const session = await getSessionForJoinOtp(code);
  const identity = assertSessionJoinIdentityFields(session.join_type, {
    nickname,
    email,
    mobile
  });
  const resolvedChannel = resolveSessionJoinChannel(session.join_type, channel);
  const purpose = PURPOSES.SESSION_JOIN;

  if (resolvedChannel === "email") {
    await assertResendCooldown(EmailOtp, { email: identity.email, purpose });
    await consumeOpenOtps(EmailOtp, { email: identity.email, purpose });
    const otpCode = await createOtpRecord(EmailOtp, {
      email: identity.email,
      purpose
    });
    await sendEmailOtpMail({
      to: identity.email,
      fullName: identity.nickname,
      code: otpCode,
      purpose,
      expiresInMinutes: Math.round(OTP_TTL_MS / 60000)
    });
    return {
      sent: true,
      channel: "email",
      email: identity.email,
      purpose,
      expires_in_seconds: Math.round(OTP_TTL_MS / 1000)
    };
  }

  await assertResendCooldown(SmsOtp, { mobile: identity.mobile, purpose });
  await consumeOpenOtps(SmsOtp, { mobile: identity.mobile, purpose });
  const otpCode = await createOtpRecord(SmsOtp, {
    mobile: identity.mobile,
    purpose
  });
  const smsResult = await sendOtpSms({ mobile: identity.mobile, code: otpCode });

  return {
    sent: true,
    channel: "mobile",
    mobile: identity.mobile,
    sms_sent: Boolean(smsResult?.sent),
    sms_skipped: Boolean(smsResult?.skipped),
    purpose,
    expires_in_seconds: Math.round(OTP_TTL_MS / 1000)
  };
}

async function verifySessionJoinOtp({ code, nickname, email, mobile, channel, otp_code }) {
  assertFeatureEnabled(PURPOSES.SESSION_JOIN);

  const session = await getSessionForJoinOtp(code);
  const identity = assertSessionJoinIdentityFields(session.join_type, {
    nickname,
    email,
    mobile
  });
  const resolvedChannel = resolveSessionJoinChannel(session.join_type, channel);
  const purpose = PURPOSES.SESSION_JOIN;

  if (resolvedChannel === "email") {
    await verifyOtpRecord(EmailOtp, { email: identity.email, purpose }, otp_code, "email");
  } else {
    await verifyOtpRecord(SmsOtp, { mobile: identity.mobile, purpose }, otp_code, "mobile");
  }

  const otp_token = signVerifiedToken({
    purpose,
    email: identity.email || undefined,
    mobile: identity.mobile || undefined,
    sessionCode: session.session_code,
    channel: resolvedChannel,
    nickname: identity.nickname
  });

  return {
    verified: true,
    channel: resolvedChannel,
    email: identity.email || undefined,
    mobile: identity.mobile || undefined,
    purpose,
    otp_token
  };
}

function assertSessionJoinOtpToken(token, { sessionCode, nickname, email, mobile } = {}) {
  if (!isParticipantJoinOtpEnabled()) return null;

  if (!token || typeof token !== "string") {
    const error = new Error("Verification is required before joining this session");
    error.statusCode = 401;
    throw error;
  }

  const decoded = assertOtpVerifiedToken(token, { purpose: PURPOSES.SESSION_JOIN });
  const expectedCode = String(sessionCode || "")
    .trim()
    .toUpperCase();
  if (!expectedCode || decoded.session_code !== expectedCode) {
    const error = new Error("Verification does not match this session. Please verify again.");
    error.statusCode = 401;
    throw error;
  }

  const expectedNickname = normalizeJoinNickname(nickname);
  if (
    !expectedNickname ||
    String(decoded.nickname || "").trim().toLowerCase() !== expectedNickname.toLowerCase()
  ) {
    const error = new Error("Verification does not match this name. Please verify again.");
    error.statusCode = 401;
    throw error;
  }

  if (decoded.channel === "email") {
    if (!email || normalizeEmail(decoded.email) !== normalizeEmail(email)) {
      const error = new Error("Verification does not match this email. Please verify again.");
      error.statusCode = 401;
      throw error;
    }
  } else if (decoded.channel === "mobile") {
    const expectedMobile = normalizeMobile(mobile);
    if (!expectedMobile || decoded.mobile !== expectedMobile) {
      const error = new Error("Verification does not match this mobile number. Please verify again.");
      error.statusCode = 401;
      throw error;
    }
  } else {
    const error = new Error("Verification expired or invalid. Please verify again.");
    error.statusCode = 401;
    throw error;
  }

  return decoded;
}

module.exports = {
  PURPOSES,
  sendOtp,
  verifyOtp,
  assertOtpVerifiedToken,
  signLoginChallengeToken,
  verifyLoginChallengeToken,
  signPlanRenewToken,
  assertPlanRenewToken,
  sendAdminActionOtp,
  verifyAdminActionOtp,
  assertAdminActionOtpToken,
  listAdminActionOtpEmails,
  normalizeEmail,
  isContactJoinType,
  supportsParticipantSessionState,
  assertSessionJoinIdentityFields,
  sendSessionJoinOtp,
  verifySessionJoinOtp,
  assertSessionJoinOtpToken
};
