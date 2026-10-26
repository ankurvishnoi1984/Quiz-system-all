const { normalizeMobile, isValidMobile } = require("./phone");

const MAX_ALLOWLIST_ENTRIES = 5000;

function normalizeAllowlistEmail(value) {
  if (value == null || value === "") return null;
  const email = String(value).trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 255) return null;
  // Light validation — full RFC not required
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function normalizeAllowlistMobile(value) {
  if (value == null || value === "") return null;
  if (!isValidMobile(value)) return null;
  return normalizeMobile(value);
}

/**
 * Normalize allowlist payload into { emails: string[], mobiles: string[] }.
 * Accepts:
 * - { emails, mobiles }
 * - array of strings (auto-detect email vs mobile)
 * - array of { email, mobile }
 */
function normalizeJoinAllowlist(input) {
  const emails = new Set();
  const mobiles = new Set();

  const addEmail = (value) => {
    const email = normalizeAllowlistEmail(value);
    if (email) emails.add(email);
  };
  const addMobile = (value) => {
    const mobile = normalizeAllowlistMobile(value);
    if (mobile) mobiles.add(mobile);
  };

  if (input == null) {
    return { emails: [], mobiles: [] };
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      if (item == null) continue;
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) continue;
        if (trimmed.includes("@")) addEmail(trimmed);
        else addMobile(trimmed);
        continue;
      }
      if (typeof item === "object") {
        if (item.email != null) addEmail(item.email);
        if (item.mobile != null) addMobile(item.mobile);
        // Common CSV header aliases
        if (item.Email != null) addEmail(item.Email);
        if (item.Mobile != null) addMobile(item.Mobile);
        if (item.phone != null) addMobile(item.phone);
        if (item.Phone != null) addMobile(item.Phone);
      }
    }
  } else if (typeof input === "object") {
    const emailList = input.emails || input.email_list || [];
    const mobileList = input.mobiles || input.mobile_list || input.phones || [];
    if (Array.isArray(emailList)) emailList.forEach(addEmail);
    if (Array.isArray(mobileList)) mobileList.forEach(addMobile);
  }

  return {
    emails: [...emails],
    mobiles: [...mobiles]
  };
}

function allowlistEntryCount(list) {
  const normalized = normalizeJoinAllowlist(list);
  return normalized.emails.length + normalized.mobiles.length;
}

function validateJoinAllowlistFields(payload) {
  const errors = [];
  if (payload?.join_allowlist_enabled !== undefined && typeof payload.join_allowlist_enabled !== "boolean") {
    errors.push("join_allowlist_enabled must be a boolean");
  }
  if (payload?.join_allowlist !== undefined && payload.join_allowlist !== null) {
    if (typeof payload.join_allowlist !== "object") {
      errors.push("join_allowlist must be an object, array, or null");
      return errors;
    }
    const normalized = normalizeJoinAllowlist(payload.join_allowlist);
    const count = normalized.emails.length + normalized.mobiles.length;
    if (count > MAX_ALLOWLIST_ENTRIES) {
      errors.push(`join_allowlist supports at most ${MAX_ALLOWLIST_ENTRIES} entries`);
    }
    if (payload.join_allowlist_enabled === true && count === 0) {
      errors.push("Upload at least one email or mobile when the join allowlist is enabled");
    }
  }
  if (payload?.join_allowlist_enabled === true) {
    const joinType = payload.join_type;
    if (
      joinType &&
      !["name_email", "name_mobile", "name_email_mobile"].includes(joinType)
    ) {
      errors.push("join allowlist requires Name + Email and/or Mobile join type");
    }
  }
  return errors;
}

/**
 * Resolve allowlist settings for create/update.
 * Disabled / wrong join type → cleared.
 */
function resolveJoinAllowlistFields(input = {}, { joinType, previous } = {}) {
  const contactTypes = new Set(["name_email", "name_mobile", "name_email_mobile"]);
  const effectiveJoinType = joinType || previous?.join_type || "name";
  const enabledInput =
    input.join_allowlist_enabled !== undefined
      ? Boolean(input.join_allowlist_enabled)
      : previous
        ? Boolean(previous.join_allowlist_enabled)
        : false;

  if (!contactTypes.has(effectiveJoinType) || !enabledInput) {
    return {
      join_allowlist_enabled: false,
      join_allowlist: null
    };
  }

  const sourceList =
    input.join_allowlist !== undefined
      ? input.join_allowlist
      : previous?.join_allowlist ?? null;
  const normalized = normalizeJoinAllowlist(sourceList);
  const count = normalized.emails.length + normalized.mobiles.length;
  if (count === 0) {
    return {
      join_allowlist_enabled: false,
      join_allowlist: null
    };
  }

  return {
    join_allowlist_enabled: true,
    join_allowlist: normalized
  };
}

/**
 * Throw 403 if identity is not on the session allowlist.
 */
function assertJoinAllowlist(session, { email, mobile } = {}) {
  if (!session?.join_allowlist_enabled) return;

  const list = normalizeJoinAllowlist(session.join_allowlist);
  if (!list.emails.length && !list.mobiles.length) {
    const error = new Error(
      "This session is restricted. No participants are on the allowed list yet."
    );
    error.statusCode = 403;
    throw error;
  }

  const normalizedEmail = normalizeAllowlistEmail(email);
  const normalizedMobile = normalizeAllowlistMobile(mobile);
  const emailOk = Boolean(normalizedEmail && list.emails.includes(normalizedEmail));
  const mobileOk = Boolean(normalizedMobile && list.mobiles.includes(normalizedMobile));

  const joinType = session.join_type || "name";
  let allowed = false;
  if (joinType === "name_email") {
    allowed = emailOk;
  } else if (joinType === "name_mobile") {
    allowed = mobileOk;
  } else if (joinType === "name_email_mobile") {
    allowed = emailOk || mobileOk;
  } else {
    return;
  }

  if (!allowed) {
    const hint =
      joinType === "name_mobile"
        ? "mobile number"
        : joinType === "name_email"
          ? "email"
          : "email or mobile number";
    const error = new Error(
      `You are not on the participant list for this session. Use the ${hint} that was shared with the host.`
    );
    error.statusCode = 403;
    throw error;
  }
}

module.exports = {
  MAX_ALLOWLIST_ENTRIES,
  normalizeAllowlistEmail,
  normalizeAllowlistMobile,
  normalizeJoinAllowlist,
  allowlistEntryCount,
  validateJoinAllowlistFields,
  resolveJoinAllowlistFields,
  assertJoinAllowlist
};
