/**
 * Indian-focused mobile helpers for signup SMS OTP.
 */

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

/**
 * Normalize to E.164-ish digits without plus: 91XXXXXXXXXX (12 digits for IN).
 * Accepts 10-digit local, 91XXXXXXXXXX, or +91XXXXXXXXXX.
 */
function normalizeMobile(value) {
  let digits = digitsOnly(value);
  if (!digits) return null;

  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  // Allow other country codes as raw digits (8–15)
  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  return null;
}

function isValidMobile(value) {
  const normalized = normalizeMobile(value);
  if (!normalized) return false;
  // Prefer Indian mobile: 91 + starts with 6-9
  if (normalized.length === 12 && normalized.startsWith("91")) {
    return /^91[6-9]\d{9}$/.test(normalized);
  }
  return normalized.length >= 8 && normalized.length <= 15;
}

function formatMobileDisplay(value) {
  const normalized = normalizeMobile(value);
  if (!normalized) return String(value || "").trim();
  if (normalized.length === 12 && normalized.startsWith("91")) {
    return `+91 ${normalized.slice(2, 7)} ${normalized.slice(7)}`;
  }
  return `+${normalized}`;
}

/** Flash49 / SMS gateway "to" field — typically country code + number without +. */
function mobileForSmsApi(value) {
  return normalizeMobile(value);
}

module.exports = {
  digitsOnly,
  normalizeMobile,
  isValidMobile,
  formatMobileDisplay,
  mobileForSmsApi
};
