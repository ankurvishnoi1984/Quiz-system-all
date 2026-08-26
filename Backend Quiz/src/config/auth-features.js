/**
 * Auth / checkout OTP feature flags.
 *
 * Set in Backend Quiz `.env` (or process environment):
 *   PAYMENT_OTP_ENABLED=true|false
 *   LOGIN_OTP_ENABLED=true|false
 *
 * Defaults: both enabled. Set to false/0/off to skip OTP without code changes.
 */
const { parseFlag } = require("./integrations");

function isPaymentOtpEnabled() {
  return parseFlag(process.env.PAYMENT_OTP_ENABLED, true);
}

function isLoginOtpEnabled() {
  return parseFlag(process.env.LOGIN_OTP_ENABLED, true);
}

function getAuthFeatureFlags() {
  return {
    payment_otp_enabled: isPaymentOtpEnabled(),
    login_otp_enabled: isLoginOtpEnabled()
  };
}

module.exports = {
  isPaymentOtpEnabled,
  isLoginOtpEnabled,
  getAuthFeatureFlags
};
