const fs = require("fs");
const path = require("path");
const env = require("../config/env");

let currentDayKey = null;
let stream = null;
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function getLogDir() {
  const configured = String(env.appLog?.dir || "").trim();
  if (configured) return path.resolve(configured);
  return path.resolve(process.cwd(), "logs");
}

function dayKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ensureStream() {
  const key = dayKey();
  if (stream && currentDayKey === key) return stream;

  if (stream) {
    try {
      stream.end();
    } catch (_) {
      /* ignore */
    }
    stream = null;
  }

  const dir = getLogDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `app-${key}.jsonl`);
  stream = fs.createWriteStream(filePath, { flags: "a", encoding: "utf8" });
  stream.on("error", (err) => {
    console.error(`[log-file] write stream error: ${err.message}`);
  });
  currentDayKey = key;
  return stream;
}

function serializeDoc(doc) {
  const created =
    doc.created_at instanceof Date
      ? doc.created_at.toISOString()
      : doc.created_at || new Date().toISOString();
  return {
    ...doc,
    app: "quiz-api",
    ts: created,
    created_at: created
  };
}

function maybeCleanupOldFiles() {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  const retentionDays = Number(env.appLog?.retentionDays) || 7;
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  const dir = getLogDir();

  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch (_) {
    return;
  }

  for (const name of entries) {
    if (!/^app-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)) continue;
    const full = path.join(dir, name);
    try {
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) fs.unlinkSync(full);
    } catch (_) {
      /* ignore */
    }
  }
}

/**
 * Append one JSON log line. Never throws.
 */
function writeLogLine(doc) {
  try {
    const line = `${JSON.stringify(serializeDoc(doc))}\n`;
    ensureStream().write(line);
    maybeCleanupOldFiles();
  } catch (err) {
    console.error(`[log-file] write failed: ${err.message}`);
  }
}

function closeLogFile() {
  if (!stream) return;
  try {
    stream.end();
  } catch (_) {
    /* ignore */
  }
  stream = null;
  currentDayKey = null;
}

module.exports = {
  writeLogLine,
  closeLogFile,
  getLogDir
};
