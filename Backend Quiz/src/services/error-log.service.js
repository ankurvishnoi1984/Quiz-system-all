const os = require("os");
const env = require("../config/env");
const { getMongoDb, isMongoReady } = require("../config/mongo");
const { requestMetadataFromContext } = require("../utils/audit-context");

const SENSITIVE_KEY =
  /pass(word)?|otp|token|secret|authorization|cookie|private[_-]?key/i;
const MAX_MESSAGE = 4000;
const MAX_STACK = 8000;

function truncate(value, max) {
  if (value == null) return null;
  const text = String(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function redactValue(value, depth = 0) {
  if (value == null) return value;
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) {
        out[key] = "[redacted]";
      } else {
        out[key] = redactValue(nested, depth + 1);
      }
    }
    return out;
  }
  if (typeof value === "string" && value.length > 2000) {
    return truncate(value, 2000);
  }
  return value;
}

function normalizeLevel(level, statusCode) {
  const raw = String(level || "").toLowerCase();
  if (raw === "fatal" || raw === "error" || raw === "warn") return raw;
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warn";
  return "error";
}

function buildDocument(payload = {}) {
  const meta = requestMetadataFromContext();
  const statusCode =
    payload.statusCode != null ? Number(payload.statusCode) : null;
  return {
    created_at: new Date(),
    level: normalizeLevel(payload.level, statusCode),
    source: payload.source || "api",
    message: truncate(payload.message || "Unknown error", MAX_MESSAGE),
    stack: truncate(payload.stack || null, MAX_STACK),
    status_code: Number.isFinite(statusCode) ? statusCode : null,
    code: payload.code != null ? String(payload.code) : null,
    request_id: meta.request_id,
    http_method: meta.http_method,
    request_path: meta.request_path,
    ip_address: meta.ip_address,
    user_agent: meta.user_agent,
    actor_type: meta.actor_type,
    actor_id: meta.actor_id,
    client_id: meta.client_id,
    dept_id: meta.dept_id,
    session_id: meta.session_id,
    env: env.nodeEnv,
    host: os.hostname(),
    extra: payload.extra != null ? redactValue(payload.extra) : null
  };
}

/**
 * Fire-and-forget error logger. Never throws; never blocks the caller.
 */
function logError(payload = {}) {
  const doc = buildDocument(payload);

  if (!env.mongo.logEnabled || !isMongoReady()) {
    const line = `[error-log:${doc.level}] ${doc.source} ${doc.message}`;
    if (doc.level === "warn") console.warn(line);
    else console.error(line, doc.stack || "");
    return;
  }

  const database = getMongoDb();
  Promise.resolve()
    .then(() => database.collection("error_logs").insertOne(doc))
    .catch((err) => {
      console.error(
        `[error-log] insert failed: ${err.message} | ${doc.level} ${doc.message}`
      );
    });
}

module.exports = {
  logError
};
