const { createIpRateLimiter } = require("../utils/ip-rate-limit");

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function identityFromBody(req) {
  const body = req.body || {};
  const email = body.email != null ? String(body.email).trim() : "";
  if (email) return email.slice(0, 255);
  const mobile = body.mobile != null ? String(body.mobile).trim() : "";
  if (mobile) return mobile.slice(0, 255);
  return null;
}

/** OTP send: default 8 requests / IP / 15 minutes */
const otpSendIpRateLimit = createIpRateLimiter({
  keyPrefix: "otp-send",
  action: "otp_send",
  windowMs: envInt("OTP_IP_SEND_WINDOW_MS", 15 * 60 * 1000),
  max: envInt("OTP_IP_SEND_MAX", 8),
  message:
    "Too many verification codes requested from this network. Please wait a few minutes and try again.",
  getIdentity: identityFromBody
});

/** OTP verify: default 30 attempts / IP / 15 minutes */
const otpVerifyIpRateLimit = createIpRateLimiter({
  keyPrefix: "otp-verify",
  action: "otp_verify",
  windowMs: envInt("OTP_IP_VERIFY_WINDOW_MS", 15 * 60 * 1000),
  max: envInt("OTP_IP_VERIFY_MAX", 30),
  message:
    "Too many verification attempts from this network. Please wait a few minutes and try again.",
  getIdentity: identityFromBody
});

module.exports = {
  otpSendIpRateLimit,
  otpVerifyIpRateLimit
};
