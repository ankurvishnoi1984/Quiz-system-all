const client = require("prom-client");

const register = new client.Registry();

const httpRequestDurationSeconds = new client.Histogram({
  name: "quiz_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_class"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const httpRequestsTotal = new client.Counter({
  name: "quiz_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_class"],
  registers: [register]
});

const wsConnections = new client.Gauge({
  name: "quiz_ws_connections",
  help: "Open WebSocket connections by role",
  labelNames: ["role"],
  registers: [register]
});

const wsEventsTotal = new client.Counter({
  name: "quiz_ws_events_total",
  help: "WebSocket lifecycle events",
  labelNames: ["event"],
  registers: [register]
});

const sessionEventsTotal = new client.Counter({
  name: "quiz_session_events_total",
  help: "Quiz session lifecycle events",
  labelNames: ["event"],
  registers: [register]
});

const participantEventsTotal = new client.Counter({
  name: "quiz_participant_events_total",
  help: "Participant activity events",
  labelNames: ["event"],
  registers: [register]
});

function statusClass(statusCode) {
  const code = Number(statusCode) || 0;
  if (code >= 500) return "5xx";
  if (code >= 400) return "4xx";
  if (code >= 300) return "3xx";
  if (code >= 200) return "2xx";
  return "other";
}

/**
 * Low-cardinality route label: matched Express pattern only.
 */
function routeLabel(req) {
  if (req.route && req.route.path != null) {
    const base = req.baseUrl || "";
    const routePath = String(req.route.path);
    return `${base}${routePath}` || "unmatched";
  }
  return "unmatched";
}

async function metricsText() {
  return register.metrics();
}

function metricsContentType() {
  return register.contentType;
}

module.exports = {
  register,
  httpRequestDurationSeconds,
  httpRequestsTotal,
  wsConnections,
  wsEventsTotal,
  sessionEventsTotal,
  participantEventsTotal,
  statusClass,
  routeLabel,
  metricsText,
  metricsContentType
};
