/**
 * Auth / checkout OTP feature flags.
 *
 * Set in Backend Quiz `.env` (or process environment):
 *   PAYMENT_OTP_ENABLED=true|false
 *   LOGIN_OTP_ENABLED=true|false
 *   ADMIN_ACTION_OTP_ENABLED=true|false
 *   PARTICIPANT_JOIN_OTP_ENABLED=true|false
 *   FIREBASE_AUTH_ENABLED=true|false (optional; defaults to configured when credentials exist)
 *
 * Defaults: all enabled. Set to false/0/off to skip OTP without code changes.
 */
const { parseFlag } = require("./integrations");
const { isFirebaseAuthConfigured } = require("./firebase-admin");

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

function isGoogleAuthEnabled() {
  return isFirebaseAuthConfigured();
}

function getAuthFeatureFlags() {
  return {
    payment_otp_enabled: isPaymentOtpEnabled(),
    login_otp_enabled: isLoginOtpEnabled(),
    admin_action_otp_enabled: isAdminActionOtpEnabled(),
    participant_join_otp_enabled: isParticipantJoinOtpEnabled(),
    google_auth_enabled: isGoogleAuthEnabled()
  };
}

module.exports = {
  isPaymentOtpEnabled,
  isLoginOtpEnabled,
  isAdminActionOtpEnabled,
  isParticipantJoinOtpEnabled,
  isGoogleAuthEnabled,
  getAuthFeatureFlags
};
