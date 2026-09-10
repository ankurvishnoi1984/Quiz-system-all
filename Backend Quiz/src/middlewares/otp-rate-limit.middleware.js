const { createIpRateLimiter } = require("../utils/ip-rate-limit");

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** OTP send: default 8 requests / IP / 15 minutes */
const otpSendIpRateLimit = createIpRateLimiter({
  keyPrefix: "otp-send",
  windowMs: envInt("OTP_IP_SEND_WINDOW_MS", 15 * 60 * 1000),
  max: envInt("OTP_IP_SEND_MAX", 8),
  message:
    "Too many verification codes requested from this network. Please wait a few minutes and try again."
});

/** OTP verify: default 30 attempts / IP / 15 minutes */
const otpVerifyIpRateLimit = createIpRateLimiter({
  keyPrefix: "otp-verify",
  windowMs: envInt("OTP_IP_VERIFY_WINDOW_MS", 15 * 60 * 1000),
  max: envInt("OTP_IP_VERIFY_MAX", 30),
  message:
    "Too many verification attempts from this network. Please wait a few minutes and try again."
});

module.exports = {
  otpSendIpRateLimit,
  otpVerifyIpRateLimit
};
