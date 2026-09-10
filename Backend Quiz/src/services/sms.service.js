const env = require("../config/env");
const { mobileForSmsApi } = require("../utils/phone");

/**
 * Flash49 (or compatible) SMS gateway — same pattern as the other HV project.
 *
 * Env:
 *   SMS_URL            GET URL with {0}=to and {1}=message
 *   SMS_MSG_TEMPLATE   Message body with {0}=otp (alias: SMS_MSG)
 *   SMS_OTP_ENABLED    optional kill-switch (false/0/off)
 */
const DEFAULT_SMS_URL =
  "https://api.flash49.com/fe/api/v1/send?username=hsplotp.trans&password=Jkrnk&unicode=false&from=HVSOPL&to={0}&text={1}&dltContentId=1107172983543962142";

const DEFAULT_SMS_MSG_TEMPLATE =
  "{0} is your otp to verify your number for doctor engagement survey activity. Thank you - Highvoltage Softwares Pvt Ltd.";

function formatSmsMessage(otp) {
  const template =
    process.env.SMS_MSG_TEMPLATE ||
    process.env.SMS_MSG ||
    env.sms?.messageTemplate ||
    DEFAULT_SMS_MSG_TEMPLATE;
  return String(template).replace(/\{0\}/g, String(otp));
}

function buildSmsUrl(mobile, message) {
  const urlTemplate =
    process.env.SMS_URL || env.sms?.urlTemplate || DEFAULT_SMS_URL;
  return String(urlTemplate)
    .replace(/\{0\}/g, encodeURIComponent(mobile))
    .replace(/\{1\}/g, encodeURIComponent(message));
}

function isSmsEnabled() {
  if (process.env.SMS_OTP_ENABLED != null && String(process.env.SMS_OTP_ENABLED).trim() !== "") {
    const raw = String(process.env.SMS_OTP_ENABLED).trim().toLowerCase();
    if (["0", "false", "off", "no", "disabled"].includes(raw)) return false;
  }
  return true;
}

/**
 * Send OTP SMS via Flash49-style HTTP GET gateway.
 * @param {{ mobile: string, code: string }} params
 * @returns {Promise<{ sent: boolean, to: string, skipped?: boolean, response?: unknown }>}
 */
async function sendOtpSms({ mobile, code }) {
  const to = mobileForSmsApi(mobile);
  if (!to) {
    const error = new Error("A valid mobile number is required for SMS");
    error.statusCode = 400;
    throw error;
  }

  if (!isSmsEnabled()) {
    console.warn("[sms] SMS_OTP_ENABLED is off — skipping SMS send");
    if (process.env.NODE_ENV !== "production") {
      console.log(`[sms] DEV OTP for ${to}: ${code}`);
    }
    return { sent: false, to, skipped: true };
  }

  const message = formatSmsMessage(code);
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
    return { sent: true, to, response: bodyText };
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
  formatSmsMessage,
  buildSmsMessage: formatSmsMessage,
  buildSmsUrl
};
