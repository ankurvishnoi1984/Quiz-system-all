/**
 * Normalize remote IP addresses for storage and block-list matching.
 * Handles IPv4-mapped IPv6 (::ffff:x.x.x.x) and strips surrounding brackets.
 */
function normalizeIp(value) {
  if (value == null) return null;
  let ip = String(value).trim();
  if (!ip || ip === "unknown") return null;

  if (ip.startsWith("[") && ip.endsWith("]")) {
    ip = ip.slice(1, -1);
  }

  // Strip optional port from IPv4 host:port (not for IPv6 without brackets)
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.replace(/:\d+$/, "");
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  if (ip === "localhost") return "127.0.0.1";

  return ip.toLowerCase();
}

/** Localhost loopback forms that should match each other when blocking. */
const LOCALHOST_ALIASES = ["127.0.0.1", "::1"];

function expandIpAliases(value) {
  const ip = normalizeIp(value);
  if (!ip) return [];
  const aliases = new Set([ip]);
  if (LOCALHOST_ALIASES.includes(ip)) {
    for (const alias of LOCALHOST_ALIASES) aliases.add(alias);
  }
  return [...aliases];
}

function extractRequestIp(req) {
  if (!req) return null;

  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    const first = String(forwarded).split(",")[0].trim();
    const normalized = normalizeIp(first);
    if (normalized) return normalized;
  }

  const candidates = [
    req.headers?.["x-real-ip"],
    req.ip,
    req.socket?.remoteAddress,
    req.connection?.remoteAddress
  ];

  for (const candidate of candidates) {
    const normalized = normalizeIp(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function isValidIp(value) {
  const ip = normalizeIp(value);
  if (!ip) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return ip.split(".").every((part) => {
      const n = Number(part);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }
  // Basic IPv6 check
  return /^[0-9a-f:]+$/i.test(ip) && ip.includes(":");
}

module.exports = {
  normalizeIp,
  expandIpAliases,
  extractRequestIp,
  isValidIp
};
