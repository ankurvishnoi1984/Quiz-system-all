const { getSessionCustomerMatchConfig } = require("../utils/customerMatch");

const CUSTOMER_MATCH_TIMEOUT_MS = 8000;

function getCustomerMatchBaseUrl() {
  return String(process.env.CUSTOMER_MATCH_API_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
}

function normalizeMatchBody(body) {
  if (body == null) return false;
  if (typeof body === "boolean") return body;
  if (typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "match")) {
    return body.match === true || body.match === "true" || body.match === 1;
  }
  return false;
}

/**
 * Call Netcast (or local) customer-match API.
 * @returns {Promise<{ match: boolean }>}
 */
async function verifyCustomerMatch({ email, wcCode, zone }) {
  const base = getCustomerMatchBaseUrl();
  if (!base) {
    const error = new Error(
      "Customer match verification is not configured (CUSTOMER_MATCH_API_BASE_URL)."
    );
    error.statusCode = 503;
    throw error;
  }

  const emailNorm = String(email || "").trim();
  const wc = String(wcCode || "").trim();
  const zoneNorm = String(zone || "").trim();
  if (!emailNorm || !wc || !zoneNorm) {
    const error = new Error("email, wc_code, and zone are required for customer match.");
    error.statusCode = 400;
    throw error;
  }

  const url = new URL(`${base}/customer/match`);
  url.searchParams.set("email", emailNorm);
  url.searchParams.set("wc_code", wc);
  url.searchParams.set("zone", zoneNorm);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CUSTOMER_MATCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const error = new Error(
        `Customer match service returned ${res.status}. Please try again.`
      );
      error.statusCode = 502;
      throw error;
    }
    return { match: normalizeMatchBody(body) };
  } catch (err) {
    if (err.statusCode) throw err;
    if (err.name === "AbortError") {
      const error = new Error("Customer match verification timed out. Please try again.");
      error.statusCode = 504;
      throw error;
    }
    const error = new Error(
      err.message || "Unable to reach customer match service."
    );
    error.statusCode = 502;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Enforce customer match when the session flag is on.
 * WC code and zone come from session configuration, not the join payload.
 */
async function assertCustomerMatchForJoin(session, { email } = {}) {
  if (!session?.customer_match_enabled) return;

  const config = getSessionCustomerMatchConfig(session);
  if (!config) {
    const error = new Error(
      "Customer match is enabled for this session but WC code and zone are not configured. Contact the host."
    );
    error.statusCode = 503;
    throw error;
  }

  const emailNorm = String(email || "").trim();
  if (!emailNorm) {
    const error = new Error(
      "This session requires customer verification. Provide your email to join."
    );
    error.statusCode = 403;
    throw error;
  }

  const result = await verifyCustomerMatch({
    email: emailNorm,
    wcCode: config.wcCode,
    zone: config.zone,
  });
  if (!result.match) {
    const error = new Error(
      "You are not allowed to join this session."
    );
    error.statusCode = 403;
    throw error;
  }
}

module.exports = {
  verifyCustomerMatch,
  assertCustomerMatchForJoin,
  getCustomerMatchBaseUrl,
};
