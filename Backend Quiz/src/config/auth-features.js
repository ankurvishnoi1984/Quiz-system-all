/**
 * Auth / checkout OTP feature flags.
 *
 * Set in Backend Quiz `.env` (or process environment):
 *   PAYMENT_OTP_ENABLED=true|false
 *   LOGIN_OTP_ENABLED=true|false
 *   ADMIN_ACTION_OTP_ENABLED=true|false
 *   PARTICIPANT_JOIN_OTP_ENABLED=true|false
 *
 * Defaults: all enabled. Set to false/0/off to skip OTP without code changes.
 */
const { parseFlag } = require("./integrations");

function isPaymentOtpEnabled() {
  return parseFlag(process.env.PAYMENT_OTP_ENABLED, true);
}

function isLoginOtpEnabled() {
  return parseFlag(process.env.LOGIN_OTP_ENABLED, true);
}

function isAdminActionOtpEnabled() {
  return parseFlag(process.env.ADMIN_ACTION_OTP_ENABLED, true);
}

function isParticipantJoinOtpEnabled() {
  return parseFlag(process.env.PARTICIPANT_JOIN_OTP_ENABLED, true);
}

function getAuthFeatureFlags() {
  return {
    payment_otp_enabled: isPaymentOtpEnabled(),
    login_otp_enabled: isLoginOtpEnabled(),
    admin_action_otp_enabled: isAdminActionOtpEnabled(),
    participant_join_otp_enabled: isParticipantJoinOtpEnabled()
  };
}

module.exports = {
  isPaymentOtpEnabled,
  isLoginOtpEnabled,
  isAdminActionOtpEnabled,
  isParticipantJoinOtpEnabled,
  getAuthFeatureFlags
};
