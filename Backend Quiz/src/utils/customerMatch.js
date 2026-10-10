const CUSTOMER_MATCH_ZONES = Object.freeze(["East", "West", "North", "South"]);

function normalizeCustomerMatchZone(raw) {
  const zone = String(raw || "").trim();
  if (!zone) return null;
  const match = CUSTOMER_MATCH_ZONES.find(
    (z) => z.toLowerCase() === zone.toLowerCase()
  );
  return match || null;
}

function normalizeCustomerMatchWcCode(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) return null;
  return s;
}

/**
 * Resolve persisted customer-match config from API input.
 * When disabled, clears wc/zone. When enabled, requires valid wc + zone.
 */
function resolveCustomerMatchFields(input = {}, { previous = null } = {}) {
  const enabled =
    input.customer_match_enabled !== undefined
      ? Boolean(input.customer_match_enabled)
      : Boolean(previous?.customer_match_enabled);

  if (!enabled) {
    return {
      customer_match_enabled: false,
      customer_match_wc_code: null,
      customer_match_zone: null,
    };
  }

  const wcRaw =
    input.customer_match_wc_code !== undefined
      ? input.customer_match_wc_code
      : previous?.customer_match_wc_code;
  const zoneRaw =
    input.customer_match_zone !== undefined
      ? input.customer_match_zone
      : previous?.customer_match_zone;

  const wc = normalizeCustomerMatchWcCode(wcRaw);
  const zone = normalizeCustomerMatchZone(zoneRaw);

  if (!wc || !zone) {
    const error = new Error(
      "Customer match requires a valid WC code (numbers only) and zone (East, West, North, or South)."
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    customer_match_enabled: true,
    customer_match_wc_code: wc,
    customer_match_zone: zone,
  };
}

function getSessionCustomerMatchConfig(session) {
  if (!session?.customer_match_enabled) return null;
  const wc = normalizeCustomerMatchWcCode(session.customer_match_wc_code);
  const zone = normalizeCustomerMatchZone(session.customer_match_zone);
  if (!wc || !zone) return null;
  return { wcCode: wc, zone };
}

module.exports = {
  CUSTOMER_MATCH_ZONES,
  normalizeCustomerMatchZone,
  normalizeCustomerMatchWcCode,
  resolveCustomerMatchFields,
  getSessionCustomerMatchConfig,
};
