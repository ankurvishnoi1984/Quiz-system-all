const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");
const { connectMongo, closeMongo } = require("./config/mongo");
const { logError } = require("./services/error-log.service");
const { closeLogFile } = require("./services/log-file.service");
const { setupWebSocketServer } = require("./services/websocket.service");
const { startSessionAutoEndScheduler } = require("./services/session-auto-end.service");
const { startWeeklySummaryScheduler } = require("./services/weekly-summary-scheduler.service");
const {
  startPlanExpiryReminderScheduler
} = require("./services/plan-expiry-reminder-scheduler.service");
const { loadBlockedIpCache } = require("./services/blocked-ip.service");
const { isRateLimitEnabled } = require("./utils/ip-rate-limit");

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} received, closing Mongo…`);
  try {
    await closeMongo();
  } catch (_) {
    /* ignore */
  }
  try {
    closeLogFile();
  } catch (_) {
    /* ignore */
  }
  process.exit(0);
}

function registerProcessHandlers() {
  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    console.error("[process] unhandledRejection:", err.message);
    logError({
      level: "error",
      source: "process",
      message: err.message,
      stack: err.stack,
      code: "unhandledRejection"
    });
  });

  process.on("uncaughtException", async (err) => {
    console.error("[process] uncaughtException:", err.message);
    logError({
      level: "fatal",
      source: "process",
      message: err.message,
      stack: err.stack,
      code: "uncaughtException"
    });
    try {
      await new Promise((r) => setTimeout(r, 500));
      await closeMongo();
    } catch (_) {
      /* ignore */
    }
    process.exit(1);
  });

  process.on("SIGINT", () => {
    shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    shutdown("SIGTERM");
  });
}

async function bootstrap() {
  registerProcessHandlers();
  try {
    await connectDatabase();
    // Non-fatal: API starts even if Mongo/tunnel fails
    await connectMongo();
    await loadBlockedIpCache();
    if (!isRateLimitEnabled()) {
      console.warn(
        "[rate-limit] RATE_LIMIT_ENABLED=false — IP/OTP rate limits not enforcing"
      );
    }
    const server = app.listen(env.port, () => {
      console.log(`Server is running on port ${env.port}`);
    });
    setupWebSocketServer(server);
    startSessionAutoEndScheduler();
    startWeeklySummaryScheduler();
    startPlanExpiryReminderScheduler();
    console.log("WebSocket server initialized");
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

bootstrap();
