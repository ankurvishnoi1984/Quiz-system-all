const { extractRequestIp } = require("./ip");
const { errorResponse } = require("./response");

/**
 * Simple in-memory fixed-window rate limiter keyed by client IP.
 * Suitable for single-process Node deployments (not shared across instances).
 */
function createIpRateLimiter({
  windowMs,
  max,
  message = "Too many requests from this network. Please try again later.",
  keyPrefix = "rl"
} = {}) {
  const hits = new Map();
  const safeWindow = Math.max(1000, Number(windowMs) || 15 * 60 * 1000);
  const safeMax = Math.max(1, Number(max) || 10);

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (!entry || entry.resetAt <= now) hits.delete(key);
    }
  }, Math.min(safeWindow, 60 * 1000));
  if (typeof cleanup.unref === "function") cleanup.unref();

  return function ipRateLimitMiddleware(req, res, next) {
    const ip = extractRequestIp(req) || "unknown";
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + safeWindow };
      hits.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, safeMax - entry.count);
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    res.setHeader("X-RateLimit-Limit", String(safeMax));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > safeMax) {
      res.setHeader("Retry-After", String(retryAfterSec));
      return errorResponse(res, message, 429, {
        code: "rate_limited",
        retry_after_seconds: retryAfterSec
      });
    }

    return next();
  };
}

module.exports = {
  createIpRateLimiter
};
