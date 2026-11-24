const { normalizeIp } = require("../utils/ip");
const { metricsText, metricsContentType } = require("../config/metrics");

/**
 * Only trust the direct TCP peer for /metrics (ignore X-Forwarded-For spoofing).
 */
function isDirectLoopback(req) {
  const raw = req.socket?.remoteAddress || req.connection?.remoteAddress;
  const ip = normalizeIp(raw);
  return ip === "127.0.0.1" || ip === "::1";
}

async function metricsEndpoint(req, res) {
  if (!isDirectLoopback(req)) {
    return res.status(404).end();
  }

  try {
    res.set("Content-Type", metricsContentType());
    res.set("Cache-Control", "no-store");
    const body = await metricsText();
    return res.status(200).send(body);
  } catch (err) {
    return res.status(500).type("text/plain").send(`metrics error: ${err.message}`);
  }
}

module.exports = {
  metricsEndpoint,
  isDirectLoopback
};
