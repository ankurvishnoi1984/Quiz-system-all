const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const apiRoutes = require("./routes");
const { healthHandler } = require("./health");
const { errorResponse } = require("./utils/response");
const { getFrontendPublicUrl, buildSessionJoinPath } = require("./config/publicAppUrl");
const { requestContextMiddleware } = require("./utils/audit-context");
const { isIntegrationsEnabled } = require("./config/integrations");
const { embedFrameHeadersMiddleware } = require("./config/embedSecurity");
const { httpMetricsMiddleware } = require("./middlewares/http-metrics.middleware");
const { metricsEndpoint } = require("./middlewares/metrics-endpoint.middleware");

const app = express();

app.get("/health", healthHandler);
app.get("/metrics", metricsEndpoint);

const integrationsOn = isIntegrationsEnabled();

app.use(
  helmet({
    // Allow frontend apps on another origin to embed uploaded images/videos.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Only open framing when integrations are enabled; otherwise keep Helmet's
    // default X-Frame-Options DENY so core app behaviour matches pre-Phase-0.
    frameguard: integrationsOn ? false : undefined,
    contentSecurityPolicy: false
  })
);
if (integrationsOn) {
  app.use(embedFrameHeadersMiddleware);
}
app.use(cors());
app.use(requestContextMiddleware);
app.use(httpMetricsMiddleware);
// Question import previews can contain up to 500 parsed rows.
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  "/uploads",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static("uploads")
);
app.use(
  "/branding",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(__dirname, "../assets"))
);

/**
 * Participant join links must open the React app, not the JSON API.
 * Redirect /join/:code (e.g. from old QR codes pointing at the API host) to the frontend.
 */
app.get("/join", (req, res) => {
  const frontendOrigin = getFrontendPublicUrl(req);
  if (!frontendOrigin) {
    return errorResponse(
      res,
      "FRONTEND_PUBLIC_URL is not configured on the server",
      503
    );
  }
  return res.redirect(302, `${frontendOrigin}/join`);
});

app.get("/join/:code", (req, res) => {
  const frontendOrigin = getFrontendPublicUrl(req);
  const path = buildSessionJoinPath(req.params.code);
  if (!frontendOrigin) {
    return errorResponse(
      res,
      "FRONTEND_PUBLIC_URL is not configured on the server",
      503
    );
  }
  return res.redirect(302, `${frontendOrigin}${path}`);
});

const blockedIpMiddleware = require("./middlewares/blocked-ip.middleware");
app.use("/api/v1", blockedIpMiddleware);
app.use("/api/v1", apiRoutes);

app.use((_req, res) => {
  return errorResponse(res, "Route not found", 404);
});

// Express error middleware (stacks for thrown / body-parser / multer errors).
// Responds directly so we do not double-log via errorResponse().
app.use((err, _req, res, _next) => {
  const { logError } = require("./services/error-log.service");
  const statusCode = Number(err.status || err.statusCode) || 500;
  logError({
    level: statusCode >= 500 ? "error" : "warn",
    source: "api",
    message: err.message || "Unhandled error",
    stack: err.stack,
    statusCode,
    code: err.code || "express_error"
  });
  if (res.headersSent) return;
  const body = {
    success: false,
    message:
      statusCode >= 500
        ? "Something went wrong"
        : err.message || "Request failed",
    errors: null
  };
  if (err.code) body.code = err.code;
  return res.status(statusCode).json(body);
});

module.exports = app;
