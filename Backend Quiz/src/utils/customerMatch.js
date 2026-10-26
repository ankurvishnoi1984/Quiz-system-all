const CUSTOMER_MATCH_REGION_ZONES = Object.freeze([
  "East",
  "West",
  "North",
  "South",
]);
const CUSTOMER_MATCH_ZONES = Object.freeze([
  "All",
  ...CUSTOMER_MATCH_REGION_ZONES,
]);

function normalizeCustomerMatchZone(raw) {
  const zone = String(raw || "").trim();
  if (!zone) return null;
  const match = CUSTOMER_MATCH_ZONES.find(
    (z) => z.toLowerCase() === zone.toLowerCase()
  );
  return match || null;
}

/**
 * Normalize one or more zones into a deduped array in canonical order.
 * Accepts null/undefined, a single string (legacy), a comma-separated string, or an array.
 * All may be combined with East/West/North/South.
 * @returns {string[]|null}
 */
function normalizeCustomerMatchZones(raw) {
  if (raw == null || raw === "") return null;

  let items;
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === "string") {
    items = raw.includes(",")
      ? raw.split(",")
      : [raw];
  } else {
    return null;
  }

  const seen = new Set();
  for (const item of items) {
    const zone = normalizeCustomerMatchZone(item);
    if (zone) seen.add(zone);
  }

  const zones = CUSTOMER_MATCH_ZONES.filter((z) => seen.has(z));
  return zones.length > 0 ? zones : null;
}

function normalizeCustomerMatchWcCode(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) return null;
  return s;
}

function pickZonesRaw(input = {}, previous = null) {
  if (input.customer_match_zones !== undefined) {
    return input.customer_match_zones;
  }
  // Legacy singular alias during rollout
  if (input.customer_match_zone !== undefined) {
    return input.customer_match_zone;
  }
  if (previous?.customer_match_zones !== undefined) {
    return previous.customer_match_zones;
  }
  if (previous?.customer_match_zone !== undefined) {
    return previous.customer_match_zone;
  }
  return undefined;
}

/**
 * Resolve persisted customer-match config from API input.
 * When disabled, clears wc/zones. When enabled, requires valid wc + at least one zone.
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
      customer_match_zones: null,
    };
  }

  const wcRaw =
    input.customer_match_wc_code !== undefined
      ? input.customer_match_wc_code
      : previous?.customer_match_wc_code;
  const zonesRaw = pickZonesRaw(input, previous);

  const wc = normalizeCustomerMatchWcCode(wcRaw);
  const zones = normalizeCustomerMatchZones(zonesRaw);

  if (!wc || !zones) {
    const error = new Error(
      "Customer match requires a valid WC code (numbers only) and at least one zone (All, East, West, North, or South)."
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    customer_match_enabled: true,
    customer_match_wc_code: wc,
    customer_match_zones: zones,
  };
}

function getSessionCustomerMatchConfig(session) {
  if (!session?.customer_match_enabled) return null;
  const wc = normalizeCustomerMatchWcCode(session.customer_match_wc_code);
  const zones = normalizeCustomerMatchZones(
    session.customer_match_zones ?? session.customer_match_zone
  );
  if (!wc || !zones) return null;
  return { wcCode: wc, zones };
}

module.exports = {
  CUSTOMER_MATCH_REGION_ZONES,
  CUSTOMER_MATCH_ZONES,
  normalizeCustomerMatchZone,
  normalizeCustomerMatchZones,
  normalizeCustomerMatchWcCode,
  resolveCustomerMatchFields,
  getSessionCustomerMatchConfig,
};
