const { Op } = require("sequelize");
const RateLimitEvent = require("../models/rate-limit-event.model");

const RETENTION_DAYS = 7;
const LIST_LIMIT = 500;
const MONITOR_LIST_LIMIT = 50;
const PURGE_THROTTLE_MS = 60 * 60 * 1000;

let lastPurgeAt = 0;

function normalizeIdentity(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 255);
}

function normalizeSessionCode(value) {
  if (value == null) return null;
  const trimmed = String(value).trim().toUpperCase();
  if (!trimmed) return null;
  return trimmed.slice(0, 32);
}

async function recordRateLimitEvent({
  ipAddress,
  action,
  sessionCode = null,
  identity = null,
  attemptCount,
  windowMs,
  limitMax
} = {}) {
  const ip = String(ipAddress || "").trim();
  if (!ip || !action) return null;

  return RateLimitEvent.create({
    ip_address: ip.slice(0, 64),
    action: String(action).slice(0, 32),
    session_code: normalizeSessionCode(sessionCode),
    identity: normalizeIdentity(identity),
    attempt_count: Math.max(1, Number(attemptCount) || 1),
    window_ms: Math.max(1, Number(windowMs) || 1),
    limit_max: Math.max(1, Number(limitMax) || 1)
  });
}

/**
 * Delete events older than retention. Throttled so monitor polls do not DELETE every 5s.
 */
async function purgeExpiredRateLimitEvents({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastPurgeAt < PURGE_THROTTLE_MS) {
    return { purged: false, skipped: true };
  }
  lastPurgeAt = now;
  const cutoff = new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await RateLimitEvent.destroy({
    where: {
      created_at: { [Op.lt]: cutoff }
    }
  }).catch(() => 0);
  return { purged: true, deleted: Number(deleted) || 0 };
}

async function listRecentRateLimitEvents({ limit = LIST_LIMIT } = {}) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const cappedLimit = Math.min(Math.max(1, Number(limit) || LIST_LIMIT), LIST_LIMIT);

  const rows = await RateLimitEvent.findAll({
    where: {
      created_at: { [Op.gte]: cutoff }
    },
    order: [["created_at", "DESC"]],
    limit: cappedLimit
  });

  return rows.map((row) => ({
    event_id: row.event_id,
    ip_address: row.ip_address,
    action: row.action,
    session_code: row.session_code || null,
    identity: row.identity || null,
    attempt_count: row.attempt_count,
    window_ms: row.window_ms,
    limit_max: row.limit_max,
    created_at: row.created_at
  }));
}

module.exports = {
  recordRateLimitEvent,
  listRecentRateLimitEvents,
  purgeExpiredRateLimitEvents,
  normalizeIdentity,
  normalizeSessionCode,
  MONITOR_LIST_LIMIT,
  LIST_LIMIT
};
