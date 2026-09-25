const { extractRequestIp } = require("./ip");
const { errorResponse } = require("./response");

/** @type {Map<string, Map<string, { count: number, resetAt: number, meta?: object }>>} */
const registries = new Map();

function getRegistry(keyPrefix) {
  const prefix = String(keyPrefix || "default");
  let map = registries.get(prefix);
  if (!map) {
    map = new Map();
    registries.set(prefix, map);

    const cleanup = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of map.entries()) {
        if (!entry || entry.resetAt <= now) map.delete(key);
      }
    }, 60 * 1000);
    if (typeof cleanup.unref === "function") cleanup.unref();
  }
  return map;
}

/**
 * In-memory fixed-window IP rate limiter for Express.
 * Suitable for single-process Node; use Redis for multi-instance.
 *
 * @param {object} options
 * @param {string} [options.keyPrefix]
 * @param {number} options.windowMs
 * @param {number} options.max
 * @param {string} [options.message]
 * @param {string} [options.action] - Label for monitor / persisted 429 events
 * @param {boolean} [options.enforce=true] - When false, count for monitor only (never 429)
 * @param {(req: import('express').Request) => string|null|undefined} [options.getKeyExtra]
 * @param {(req: import('express').Request) => string|null|undefined} [options.getIdentity]
 * @param {(req: import('express').Request) => string|null|undefined} [options.getSessionCode]
 */
function createIpRateLimiter({
  keyPrefix = "rl",
  windowMs,
  max,
  message = "Too many requests from this network. Please try again later.",
  action = null,
  enforce = true,
  getKeyExtra = null,
  getIdentity = null,
  getSessionCode = null
} = {}) {
  const safeWindow = Math.max(1000, Number(windowMs) || 15 * 60 * 1000);
  const safeMax = Math.max(1, Number(max) || 10);
  const hits = getRegistry(keyPrefix);
  const resolvedAction = action || String(keyPrefix || "rate_limit").replace(/-/g, "_");
  const shouldEnforce = enforce !== false;

  return function ipRateLimitMiddleware(req, res, next) {
    const ip = extractRequestIp(req) || "unknown";
    const extra =
      typeof getKeyExtra === "function" ? String(getKeyExtra(req) || "").trim() : "";
    const key = extra ? `${ip}:${extra}` : ip;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + safeWindow, meta: {} };
      hits.set(key, entry);
    }

    const identity = typeof getIdentity === "function" ? getIdentity(req) : null;
    const sessionCode =
      typeof getSessionCode === "function"
        ? getSessionCode(req)
        : req.params?.code || null;

    entry.meta = {
      ip,
      action: resolvedAction,
      identity:
        identity != null && String(identity).trim()
          ? String(identity).trim().slice(0, 255)
          : null,
      session_code:
        sessionCode != null && String(sessionCode).trim()
          ? String(sessionCode).trim().toUpperCase().slice(0, 32)
          : null,
      limit: safeMax,
      window_ms: safeWindow
    };

    entry.count += 1;

    const remaining = Math.max(0, safeMax - entry.count);
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    res.setHeader("X-RateLimit-Limit", String(safeMax));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (shouldEnforce && entry.count > safeMax) {
      res.setHeader("Retry-After", String(retryAfterSec));

      try {
        const { recordRateLimitEvent } = require("../services/rate-limit-event.service");
        recordRateLimitEvent({
          ipAddress: ip,
          action: resolvedAction,
          sessionCode: entry.meta.session_code,
          identity: entry.meta.identity,
          attemptCount: entry.count,
          windowMs: safeWindow,
          limitMax: safeMax
        }).catch((err) => {
          console.warn("[rate-limit] failed to persist 429 event:", err?.message || err);
        });
      } catch (err) {
        console.warn("[rate-limit] failed to load event service:", err?.message || err);
      }

      return errorResponse(
        res,
        message,
        429,
        {
          code: "rate_limited",
          retry_after_seconds: retryAfterSec
        },
        "rate_limited"
      );
    }

    return next();
  };
}

/**
 * Live windows across all IP limiters with count >= minCount.
 * @param {{ minCount?: number }} [options]
 */
function getLiveRateLimitWindows({ minCount = 2 } = {}) {
  const now = Date.now();
  const rows = [];
  const threshold = Math.max(1, Number(minCount) || 2);

  for (const [, hits] of registries) {
    for (const [key, entry] of hits) {
      if (!entry || entry.resetAt <= now) continue;
      if (entry.count < threshold) continue;

      const meta = entry.meta || {};
      rows.push({
        key,
        ip_address: meta.ip || String(key).split(":")[0] || key,
        action: meta.action || null,
        session_code: meta.session_code || null,
        identity: meta.identity || null,
        count: entry.count,
        limit: meta.limit ?? null,
        window_ms: meta.window_ms ?? null,
        reset_at: new Date(entry.resetAt).toISOString()
      });
    }
  }

  rows.sort(
    (a, b) =>
      b.count - a.count || String(a.ip_address).localeCompare(String(b.ip_address))
  );
  return rows;
}

module.exports = {
  createIpRateLimiter,
  getLiveRateLimitWindows
};
