const { createIpRateLimiter } = require("../utils/ip-rate-limit");

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function sessionCodeFromReq(req) {
  return req.params?.code || null;
}

function identityFromJoinBody(req) {
  const body = req.body || {};
  const email = body.email != null ? String(body.email).trim() : "";
  if (email) return email.slice(0, 255);
  const mobile = body.mobile != null ? String(body.mobile).trim() : "";
  if (mobile) return mobile.slice(0, 255);
  const name = body.name != null ? String(body.name).trim() : "";
  if (name) return name.slice(0, 255);
  return null;
}

/** Public join: observe-only (count for monitor, never 429) */
const joinIpRateLimit = createIpRateLimiter({
  keyPrefix: "join",
  action: "join",
  enforce: false,
  windowMs: envInt("JOIN_IP_WINDOW_MS", 5 * 60 * 1000),
  max: envInt("JOIN_IP_MAX", 20),
  getKeyExtra: sessionCodeFromReq,
  getSessionCode: sessionCodeFromReq,
  getIdentity: identityFromJoinBody
});

/** Join OTP send: observe-only */
const joinOtpSendIpRateLimit = createIpRateLimiter({
  keyPrefix: "join-otp-send",
  action: "join_otp_send",
  enforce: false,
  windowMs: envInt("OTP_IP_SEND_WINDOW_MS", 15 * 60 * 1000),
  max: envInt("OTP_IP_SEND_MAX", 8),
  getKeyExtra: sessionCodeFromReq,
  getSessionCode: sessionCodeFromReq,
  getIdentity: identityFromJoinBody
});

/** Join OTP verify: observe-only */
const joinOtpVerifyIpRateLimit = createIpRateLimiter({
  keyPrefix: "join-otp-verify",
  action: "join_otp_verify",
  enforce: false,
  windowMs: envInt("OTP_IP_VERIFY_WINDOW_MS", 15 * 60 * 1000),
  max: envInt("OTP_IP_VERIFY_MAX", 30),
  getKeyExtra: sessionCodeFromReq,
  getSessionCode: sessionCodeFromReq,
  getIdentity: identityFromJoinBody
});

module.exports = {
  joinIpRateLimit,
  joinOtpSendIpRateLimit,
  joinOtpVerifyIpRateLimit
};
