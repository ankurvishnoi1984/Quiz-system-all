const { errorResponse } = require("../utils/response");
const { extractRequestIp } = require("../utils/ip");
const { isIpBlocked } = require("../services/blocked-ip.service");

/**
 * Paths that must stay reachable even if the caller IP is blocked
 * (so a super admin who blocked their own loopback can still unblock).
 */
function isIpBlockExemptPath(req) {
  const path = `${req.baseUrl || ""}${req.path || ""}`;
  if (path === "/api/v1/health" || path.endsWith("/health")) return true;
  if (path.includes("/monitor/websockets")) return true;
  if (path.includes("/auth/login") || path.includes("/auth/refresh")) return true;
  return false;
}

function blockedIpMiddleware(req, res, next) {
  if (isIpBlockExemptPath(req)) return next();

  const ip = extractRequestIp(req);
  if (!ip || !isIpBlocked(ip)) return next();

  return errorResponse(
    res,
    "This IP address has been blocked by an administrator.",
    403,
    { code: "ip_blocked", ip_address: ip }
  );
}

module.exports = blockedIpMiddleware;
