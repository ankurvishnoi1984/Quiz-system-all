"use strict";

const env = require("../config/env");
const { mobileForSmsApi } = require("../utils/phone");

/**
 * WhatsApp send stub (Meta Cloud API shape).
 *
 * Env:
 *   WHATSAPP_ENABLED           true to attempt sends (default false)
 *   WHATSAPP_PROVIDER          meta (default)
 *   WHATSAPP_API_BASE_URL      e.g. https://graph.facebook.com/v21.0
 *   WHATSAPP_ACCESS_TOKEN      permanent/system user token
 *   WHATSAPP_PHONE_NUMBER_ID   WhatsApp Business phone number id
 *   WHATSAPP_TEMPLATE_PROMO    optional approved promo template name
 *   WHATSAPP_TEMPLATE_OTP      optional approved OTP template name
 *   WHATSAPP_TEMPLATE_LANGUAGE template language code (default en)
 *
 * SMS OTP remains the live channel; this module is ready for credentials later.
 */

function isWhatsAppEnabled() {
  if (!env.whatsapp?.enabled) return false;
  const raw = process.env.WHATSAPP_ENABLED;
  if (raw != null && String(raw).trim() !== "") {
    const normalized = String(raw).trim().toLowerCase();
    if (["0", "false", "off", "no", "disabled"].includes(normalized)) return false;
  }
  return true;
}

function hasWhatsAppCredentials() {
  return Boolean(env.whatsapp?.accessToken && env.whatsapp?.phoneNumberId);
}

function normalizeWhatsAppTo(mobile) {
  const digits = mobileForSmsApi(mobile);
  if (!digits) return null;
  // Meta expects E.164 without leading +
  return digits.startsWith("91") ? digits : `91${digits}`;
}

function skipResult(to, reason) {
  console.warn(`[whatsapp] skipped: ${reason}`);
  return { sent: false, to: to || null, skipped: true, reason };
}

/**
 * Low-level text message via Meta Cloud API.
 * @param {{ to: string, body: string }} params
 */
async function sendWhatsAppText({ to, body }) {
  const recipient = normalizeWhatsAppTo(to);
  if (!recipient) {
    const error = new Error("A valid mobile number is required for WhatsApp");
    error.statusCode = 400;
    throw error;
  }

  if (!isWhatsAppEnabled()) {
    return skipResult(recipient, "WHATSAPP_ENABLED is off");
  }
  if (!hasWhatsAppCredentials()) {
    return skipResult(recipient, "missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
  }

  const url = `${env.whatsapp.apiBaseUrl.replace(/\/$/, "")}/${env.whatsapp.phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: recipient,
    type: "text",
    text: { preview_url: false, body: String(body || "") }
  };

  return postMetaMessage({ url, payload, to: recipient });
}

/**
 * Send an approved WhatsApp template.
 * @param {{ to: string, templateName: string, language?: string, components?: unknown[] }} params
 */
async function sendWhatsAppTemplate({
  to,
  templateName,
  language,
  components
}) {
  const recipient = normalizeWhatsAppTo(to);
  if (!recipient) {
    const error = new Error("A valid mobile number is required for WhatsApp");
    error.statusCode = 400;
    throw error;
  }

  if (!isWhatsAppEnabled()) {
    return skipResult(recipient, "WHATSAPP_ENABLED is off");
  }
  if (!hasWhatsAppCredentials()) {
    return skipResult(recipient, "missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
  }

  const name = String(templateName || "").trim();
  if (!name) {
    return skipResult(recipient, "templateName is required");
  }

  const url = `${env.whatsapp.apiBaseUrl.replace(/\/$/, "")}/${env.whatsapp.phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: {
      name,
      language: {
        code: String(language || env.whatsapp.templateLanguage || "en").trim()
      },
      ...(Array.isArray(components) && components.length
        ? { components }
        : {})
    }
  };

  return postMetaMessage({ url, payload, to: recipient });
}

/**
 * Transactional / OTP helper for a future switch from SMS.
 * Does not replace sms.service.js until explicitly wired.
 */
async function sendOtpWhatsApp({ mobile, code }) {
  const template = env.whatsapp.templateOtp;
  if (template) {
    return sendWhatsAppTemplate({
      to: mobile,
      templateName: template,
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: String(code) }]
        }
      ]
    });
  }
  return sendWhatsAppText({
    to: mobile,
    body: `${code} is your verification code.`
  });
}

/**
 * Promotional / product updates. Requires marketing_opt_in when a user object is passed.
 * @param {{ user?: { mobile_number?: string, marketing_opt_in?: boolean }, mobile?: string, body?: string, templateName?: string, components?: unknown[] }} params
 */
async function sendPromotionalWhatsApp({
  user,
  mobile,
  body,
  templateName,
  components
} = {}) {
  if (user && !user.marketing_opt_in) {
    return skipResult(
      user.mobile_number || mobile || null,
      "user has not opted in to marketing"
    );
  }

  const to = mobile || user?.mobile_number;
  const template = String(templateName || env.whatsapp.templatePromo || "").trim();
  if (template) {
    return sendWhatsAppTemplate({
      to,
      templateName: template,
      components
    });
  }
  if (!body) {
    return skipResult(to, "promo body or WHATSAPP_TEMPLATE_PROMO required");
  }
  return sendWhatsAppText({ to, body });
}

async function postMetaMessage({ url, payload, to }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const bodyText = await response.text().catch(() => "");

    if (!response.ok) {
      console.error("[whatsapp] gateway error", response.status, bodyText.slice(0, 300));
      const error = new Error("Unable to send WhatsApp message. Please try again.");
      error.statusCode = 502;
      throw error;
    }

    let parsed = null;
    try {
      parsed = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      parsed = bodyText;
    }

    console.log("[whatsapp] sent", { to, status: response.status });
    return { sent: true, to, response: parsed };
  } catch (err) {
    if (err.statusCode) throw err;
    console.error("[whatsapp] request failed", err.message);
    const error = new Error("Unable to send WhatsApp message. Please try again.");
    error.statusCode = 502;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  isWhatsAppEnabled,
  hasWhatsAppCredentials,
  sendWhatsAppText,
  sendWhatsAppTemplate,
  sendOtpWhatsApp,
  sendPromotionalWhatsApp
};
