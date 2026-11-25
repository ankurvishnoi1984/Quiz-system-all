const env = require("../config/env");
const {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  statusClass,
  routeLabel
} = require("../config/metrics");
const { writeLogLine } = require("../services/log-file.service");
const { requestMetadataFromContext } = require("../utils/audit-context");

function httpMetricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    try {
      const elapsedNs = Number(process.hrtime.bigint() - start);
      const durationSec = elapsedNs / 1e9;
      const method = String(req.method || "UNKNOWN").toUpperCase();
      const route = routeLabel(req);
      const sc = statusClass(res.statusCode);

      httpRequestDurationSeconds.observe(
        { method, route, status_class: sc },
        durationSec
      );
      httpRequestsTotal.inc({ method, route, status_class: sc });

      const slowMs = Number(env.metrics?.slowRequestMs) || 1500;
      if (durationSec * 1000 >= slowMs) {
        const meta = requestMetadataFromContext();
        // JSONL only — do not write slow requests to Mongo error_logs
        writeLogLine({
          created_at: new Date(),
          level: "warn",
          source: "api",
          message: `Slow request ${method} ${route} ${Math.round(durationSec * 1000)}ms`,
          stack: null,
          status_code: res.statusCode || null,
          code: "slow_request",
          request_id: meta.request_id,
          http_method: method,
          request_path: meta.request_path || req.originalUrl || null,
          ip_address: meta.ip_address,
          user_agent: meta.user_agent,
          actor_type: meta.actor_type,
          actor_id: meta.actor_id,
          client_id: meta.client_id,
          dept_id: meta.dept_id,
          session_id: meta.session_id,
          env: env.nodeEnv,
          host: require("os").hostname(),
          extra: {
            duration_ms: Math.round(durationSec * 1000),
            route,
            status_class: sc
          }
        });
      }
    } catch (_) {
      /* never break the response */
    }
  });

  next();
}

module.exports = {
  httpMetricsMiddleware
};
