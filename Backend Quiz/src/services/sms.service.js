const env = require("../config/env");
const { mobileForSmsApi } = require("../utils/phone");

/**
 * Build Flash49 (or compatible) SMS URL.
 * SMS_URL may include {0}=to and {1}=message text.
 * SMS_MSG may include {0}=otp code.
 */
function buildSmsMessage(otpCode) {
  const template =
    process.env.SMS_MSG ||
    env.sms?.messageTemplate ||
    "{0} is your otp to verify your number. Thank you - Highvoltage Softwares Pvt Ltd.";
  return String(template).replace(/\{0\}/g, String(otpCode));
}

function buildSmsUrl(to, message) {
  const urlTemplate =
    process.env.SMS_URL ||
    env.sms?.urlTemplate ||
    "";
  if (!urlTemplate) {
    const error = new Error("SMS_URL is not configured");
    error.statusCode = 500;
    throw error;
  }
  return String(urlTemplate)
    .replace(/\{0\}/g, encodeURIComponent(to))
    .replace(/\{1\}/g, encodeURIComponent(message));
}

function isSmsEnabled() {
  if (process.env.SMS_OTP_ENABLED != null && String(process.env.SMS_OTP_ENABLED).trim() !== "") {
    const raw = String(process.env.SMS_OTP_ENABLED).trim().toLowerCase();
    if (["0", "false", "off", "no", "disabled"].includes(raw)) return false;
  }
  return Boolean(process.env.SMS_URL || env.sms?.urlTemplate);
}

/**
 * Send OTP SMS via configured HTTP GET gateway.
 * @returns {Promise<{ sent: boolean, to: string, skipped?: boolean }>}
 */
async function sendOtpSms({ mobile, code }) {
  const to = mobileForSmsApi(mobile);
  if (!to) {
    const error = new Error("A valid mobile number is required for SMS");
    error.statusCode = 400;
    throw error;
  }

  if (!isSmsEnabled()) {
    console.warn("[sms] SMS_URL not configured — skipping SMS send (dev)");
    if (process.env.NODE_ENV !== "production") {
      console.log(`[sms] DEV OTP for ${to}: ${code}`);
    }
    return { sent: false, to, skipped: true };
  }

  const message = buildSmsMessage(code);
  const url = buildSmsUrl(to, message);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });
    const bodyText = await response.text().catch(() => "");

    if (!response.ok) {
      console.error("[sms] gateway error", response.status, bodyText.slice(0, 300));
      const error = new Error("Unable to send SMS verification code. Please try again.");
      error.statusCode = 502;
      throw error;
    }

    console.log("[sms] sent", { to, status: response.status, body: bodyText.slice(0, 120) });
    return { sent: true, to };
  } catch (err) {
    if (err.statusCode) throw err;
    console.error("[sms] request failed", err.message);
    const error = new Error("Unable to send SMS verification code. Please try again.");
    error.statusCode = 502;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  sendOtpSms,
  isSmsEnabled,
  buildSmsMessage,
  buildSmsUrl
};
