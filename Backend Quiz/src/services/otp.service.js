const crypto = require("crypto");
const { Op } = require("sequelize");
const { EmailOtp, User } = require("../models");
const { sendEmailOtpMail } = require("./email.service");
const { signAccessToken, verifyAccessToken } = require("../utils/jwt");
const {
  isPaymentOtpEnabled,
  isLoginOtpEnabled
} = require("../config/auth-features");
const env = require("../config/env");

const PURPOSES = {
  PAYMENT: "payment",
  LOGIN: "login"
};

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFIED_TOKEN_TTL = "15m";
const LOGIN_CHALLENGE_TTL = "10m";

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
  if (![PURPOSES.PAYMENT, PURPOSES.LOGIN].includes(purpose)) {
    const error = new Error("Invalid OTP purpose");
    error.statusCode = 400;
    throw error;
  }
}

function assertFeatureEnabled(purpose) {
  if (purpose === PURPOSES.PAYMENT && !isPaymentOtpEnabled()) {
    const error = new Error("Payment email OTP is disabled");
    error.statusCode = 400;
    throw error;
  }
  if (purpose === PURPOSES.LOGIN && !isLoginOtpEnabled()) {
    const error = new Error("Login email OTP is disabled");
    error.statusCode = 400;
    throw error;
  }
}

async function sendOtp({ email, purpose, fullName }) {
  assertPurpose(purpose);
  assertFeatureEnabled(purpose);

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    const error = new Error("A valid email is required");
    error.statusCode = 400;
    throw error;
  }

  if (purpose === PURPOSES.PAYMENT) {
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      const error = new Error("Email already registered");
      error.statusCode = 409;
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

  const latest = await EmailOtp.findOne({
    where: {
      email: normalizedEmail,
      purpose,
      consumed_at: null
    },
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

  await EmailOtp.update(
    { consumed_at: new Date() },
    {
      where: {
        email: normalizedEmail,
        purpose,
        consumed_at: null
      }
    }
  );

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await EmailOtp.create({
    email: normalizedEmail,
    purpose,
    code_hash: hashOtpCode(code),
    attempts: 0,
    expires_at: expiresAt,
    consumed_at: null
  });

  await sendEmailOtpMail({
    to: normalizedEmail,
    fullName: fullName || null,
    code,
    purpose,
    expiresInMinutes: Math.round(OTP_TTL_MS / 60000)
  });

  return {
    sent: true,
    email: normalizedEmail,
    purpose,
    expires_in_seconds: Math.round(OTP_TTL_MS / 1000)
  };
}

function signVerifiedToken({ email, purpose, userId }) {
  const payload = {
    typ: "otp_verified",
    purpose,
    email: normalizeEmail(email)
  };
  if (userId != null) {
    payload.user_id = Number(userId);
  }
  return signAccessToken(payload, { expiresIn: VERIFIED_TOKEN_TTL });
}

function assertOtpVerifiedToken(token, { purpose, email } = {}) {
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

  return decoded;
}

async function verifyOtp({ email, purpose, code }) {
  assertPurpose(purpose);
  assertFeatureEnabled(purpose);

  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = String(code || "").trim();

  if (!/^\d{6}$/.test(normalizedCode)) {
    const error = new Error("Enter the 6-digit code from your email");
    error.statusCode = 400;
    throw error;
  }

  const record = await EmailOtp.findOne({
    where: {
      email: normalizedEmail,
      purpose,
      consumed_at: null,
      expires_at: { [Op.gt]: new Date() }
    },
    order: [["created_at", "DESC"]]
  });

  if (!record) {
    const error = new Error("Verification code expired or not found. Request a new code.");
    error.statusCode = 400;
    throw error;
  }

  if (Number(record.attempts) >= MAX_VERIFY_ATTEMPTS) {
    record.consumed_at = new Date();
    await record.save();
    const error = new Error("Too many incorrect attempts. Request a new code.");
    error.statusCode = 429;
    throw error;
  }

  if (record.code_hash !== hashOtpCode(normalizedCode)) {
    record.attempts = Number(record.attempts) + 1;
    await record.save();
    const remaining = MAX_VERIFY_ATTEMPTS - record.attempts;
    const error = new Error(
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts. Request a new code."
    );
    error.statusCode = 400;
    throw error;
  }

  record.consumed_at = new Date();
  await record.save();

  let userId = null;
  if (purpose === PURPOSES.LOGIN) {
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

module.exports = {
  PURPOSES,
  sendOtp,
  verifyOtp,
  assertOtpVerifiedToken,
  signLoginChallengeToken,
  verifyLoginChallengeToken,
  normalizeEmail
};
