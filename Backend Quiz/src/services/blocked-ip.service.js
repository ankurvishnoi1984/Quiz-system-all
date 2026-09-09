const { Op } = require("sequelize");
const { BlockedIp, User } = require("../models");
const { normalizeIp, isValidIp, expandIpAliases } = require("../utils/ip");

/** @type {Set<string>} */
const blockedIpCache = new Set();
let cacheLoaded = false;

function requireReason(reason, actionLabel) {
  const note = reason == null ? "" : String(reason).trim();
  if (!note) {
    const error = new Error(`A reason is required to ${actionLabel}`);
    error.statusCode = 400;
    throw error;
  }
  return note.slice(0, 255);
}

function addAliasesToCache(ip) {
  for (const alias of expandIpAliases(ip)) {
    blockedIpCache.add(alias);
  }
}

function removeAliasesFromCache(ip) {
  for (const alias of expandIpAliases(ip)) {
    blockedIpCache.delete(alias);
  }
}

function isIpBlocked(ip) {
  const aliases = expandIpAliases(ip);
  if (!aliases.length) return false;
  return aliases.some((alias) => blockedIpCache.has(alias));
}

async function loadBlockedIpCache() {
  try {
    const rows = await BlockedIp.findAll({
      attributes: ["ip_address"],
      where: { is_active: true },
      raw: true
    });
    blockedIpCache.clear();
    for (const row of rows) {
      addAliasesToCache(row.ip_address);
    }
    cacheLoaded = true;
    console.log(
      `[blocked-ip] Loaded ${rows.length} blocked IP(s) (${blockedIpCache.size} match keys)`
    );
  } catch (err) {
    // Older schema without is_active — fall back to all rows
    try {
      const rows = await BlockedIp.findAll({
        attributes: ["ip_address"],
        raw: true
      });
      blockedIpCache.clear();
      for (const row of rows) {
        addAliasesToCache(row.ip_address);
      }
      cacheLoaded = true;
      console.log(`[blocked-ip] Loaded ${rows.length} blocked IP(s) (legacy schema)`);
    } catch (inner) {
      console.error("[blocked-ip] Failed to load cache:", err.message, inner.message);
      cacheLoaded = false;
    }
  }
}

function toBlockedIpPayload(row) {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : row;
  return {
    blocked_ip_id: plain.blocked_ip_id,
    ip_address: plain.ip_address,
    reason: plain.reason || null,
    blocked_by: plain.blocked_by || null,
    blocked_by_name: plain.blocker?.full_name || null,
    blocked_by_email: plain.blocker?.email || null,
    is_active: plain.is_active !== false,
    unblock_reason: plain.unblock_reason || null,
    unblocked_by: plain.unblocked_by || null,
    unblocked_at: plain.unblocked_at || null,
    created_at: plain.created_at,
    updated_at: plain.updated_at
  };
}

async function listBlockedIps() {
  const rows = await BlockedIp.findAll({
    where: { is_active: true },
    include: [
      {
        model: User,
        as: "blocker",
        attributes: ["user_id", "full_name", "email"],
        required: false
      }
    ],
    order: [
      ["created_at", "DESC"],
      ["blocked_ip_id", "DESC"]
    ]
  });
  return rows.map(toBlockedIpPayload);
}

async function blockIp({ ipAddress, reason = null, blockedBy = null } = {}) {
  const ip = normalizeIp(ipAddress);
  if (!isValidIp(ip)) {
    const error = new Error("Enter a valid IPv4 or IPv6 address");
    error.statusCode = 400;
    throw error;
  }

  const note = requireReason(reason, "block an IP");

  let row = await BlockedIp.findOne({
    where: { ip_address: { [Op.in]: expandIpAliases(ip) } }
  });

  let created = false;
  if (!row) {
    row = await BlockedIp.create({
      ip_address: ip,
      reason: note,
      blocked_by: blockedBy || null,
      is_active: true,
      unblock_reason: null,
      unblocked_by: null,
      unblocked_at: null
    });
    created = true;
  } else {
    const wasActive = row.is_active !== false;
    row.ip_address = ip;
    row.reason = note;
    row.blocked_by = blockedBy || row.blocked_by || null;
    row.is_active = true;
    row.unblock_reason = null;
    row.unblocked_by = null;
    row.unblocked_at = null;
    await row.save();
    created = !wasActive;
  }

  addAliasesToCache(ip);

  const full = await BlockedIp.findByPk(row.blocked_ip_id, {
    include: [
      {
        model: User,
        as: "blocker",
        attributes: ["user_id", "full_name", "email"],
        required: false
      }
    ]
  });

  return {
    blocked: toBlockedIpPayload(full),
    created: Boolean(created),
    match_aliases: expandIpAliases(ip)
  };
}

async function unblockIp(ipAddress, { reason = null, unblockedBy = null } = {}) {
  const ip = normalizeIp(ipAddress);
  if (!isValidIp(ip)) {
    const error = new Error("Enter a valid IPv4 or IPv6 address");
    error.statusCode = 400;
    throw error;
  }

  const note = requireReason(reason, "unblock an IP");
  const aliases = expandIpAliases(ip);

  const row = await BlockedIp.findOne({
    where: {
      ip_address: { [Op.in]: aliases },
      is_active: true
    }
  });

  if (!row) {
    const error = new Error("IP address is not blocked");
    error.statusCode = 404;
    throw error;
  }

  row.is_active = false;
  row.unblock_reason = note;
  row.unblocked_by = unblockedBy || null;
  row.unblocked_at = new Date();
  await row.save();

  removeAliasesFromCache(row.ip_address);

  return {
    ip_address: row.ip_address,
    unblocked: true,
    unblock_reason: note,
    match_aliases: aliases
  };
}

module.exports = {
  isIpBlocked,
  loadBlockedIpCache,
  listBlockedIps,
  blockIp,
  unblockIp,
  blockedIpCache,
  get cacheLoaded() {
    return cacheLoaded;
  }
};
