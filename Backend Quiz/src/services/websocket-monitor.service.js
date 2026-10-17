const { Op } = require("sequelize");
const {
  activeConnections,
  closeMatchingConnections,
  closeAllSessionConnections,
  closeConnectionsByIp
} = require("./websocket.service");
const {
  listBlockedIps,
  blockIp,
  unblockIp,
  isIpBlocked
} = require("./blocked-ip.service");
const {
  listRecentRateLimitEvents,
  purgeExpiredRateLimitEvents,
  MONITOR_LIST_LIMIT
} = require("./rate-limit-event.service");
const { getLiveRateLimitWindows } = require("../utils/ip-rate-limit");
const { Session, User, Department, Client } = require("../models");
const { normalizeIp } = require("../utils/ip");

const WS_OPEN = 1;
const HISTORY_MAX_POINTS = 120;
const SWEEP_THROTTLE_MS = 30 * 1000;

const history = [];
let lastSweepAt = 0;
let lastSweepResult = { swept: 0, closed: 0 };

function parseBucketKey(bucketKey) {
  const colonIndex = bucketKey.indexOf(":");
  if (colonIndex === -1) {
    return { sessionCode: bucketKey, role: "unknown" };
  }
  return {
    sessionCode: bucketKey.slice(0, colonIndex),
    role: bucketKey.slice(colonIndex + 1) || "unknown"
  };
}

function forEachOpenConnection(callback) {
  for (const [bucketKey, connSet] of activeConnections.entries()) {
    const { sessionCode, role } = parseBucketKey(bucketKey);
    for (const ws of connSet) {
      if (ws.readyState !== WS_OPEN) continue;
      callback({
        sessionCode,
        role,
        bucketKey,
        authStatus: ws.authStatus || "unknown",
        connectionId: ws.connectionId || null,
        remoteAddress: normalizeIp(ws.remoteAddress),
        connectedAt: ws.connectedAt || null
      });
    }
  }
}

function buildSnapshot() {
  const byRole = {};
  const byAuthStatus = {};
  const sessionMap = new Map();
  const buckets = [];
  const connections = [];
  let totalConnections = 0;

  for (const [bucketKey, connSet] of activeConnections.entries()) {
    const { sessionCode, role } = parseBucketKey(bucketKey);
    let openCount = 0;

    for (const ws of connSet) {
      if (ws.readyState !== WS_OPEN) continue;
      openCount += 1;
      totalConnections += 1;

      byRole[role] = (byRole[role] || 0) + 1;
      const authStatus = ws.authStatus || "unknown";
      byAuthStatus[authStatus] = (byAuthStatus[authStatus] || 0) + 1;

      const ipAddress = normalizeIp(ws.remoteAddress);
      // Slim row — session title/host/dept come from sessions[] on the client.
      connections.push({
        connection_id: ws.connectionId || null,
        session_code: sessionCode,
        role,
        auth_status: authStatus,
        ip_address: ipAddress,
        is_blocked: ipAddress ? isIpBlocked(ipAddress) : false,
        connected_at: ws.connectedAt ? new Date(ws.connectedAt).toISOString() : null
      });

      if (!sessionMap.has(sessionCode)) {
        sessionMap.set(sessionCode, {
          session_code: sessionCode,
          total_connections: 0,
          by_role: {},
          ip_addresses: [],
          _ipSet: new Set()
        });
      }
      const sessionRow = sessionMap.get(sessionCode);
      sessionRow.total_connections += 1;
      sessionRow.by_role[role] = (sessionRow.by_role[role] || 0) + 1;
      if (ipAddress && !sessionRow._ipSet.has(ipAddress)) {
        sessionRow._ipSet.add(ipAddress);
        sessionRow.ip_addresses.push(ipAddress);
      }
    }

    if (openCount > 0) {
      buckets.push({
        bucket_key: bucketKey,
        session_code: sessionCode,
        role,
        connections: openCount
      });
    }
  }

  connections.sort((a, b) => {
    const aTime = a.connected_at ? Date.parse(a.connected_at) : 0;
    const bTime = b.connected_at ? Date.parse(b.connected_at) : 0;
    return bTime - aTime;
  });

  const sessions = [...sessionMap.values()].map((row) => {
    const { _ipSet, ...rest } = row;
    return rest;
  }).sort((a, b) => b.total_connections - a.total_connections);

  buckets.sort((a, b) => b.connections - a.connections);

  return {
    timestamp: new Date().toISOString(),
    total_connections: totalConnections,
    active_buckets: buckets.length,
    unique_sessions: sessions.length,
    by_role: byRole,
    by_auth_status: byAuthStatus,
    buckets,
    sessions,
    connections
  };
}

function appendHistory(snapshot) {
  history.push({
    timestamp: snapshot.timestamp,
    total_connections: snapshot.total_connections,
    unique_sessions: snapshot.unique_sessions,
    active_buckets: snapshot.active_buckets,
    by_role: { ...snapshot.by_role }
  });

  if (history.length > HISTORY_MAX_POINTS) {
    history.splice(0, history.length - HISTORY_MAX_POINTS);
  }
}

async function enrichSessionsWithMetadata(sessions) {
  if (!sessions.length) return [];

  const codes = sessions.map((row) => row.session_code).filter(Boolean);
  const dbSessions = await Session.findAll({
    where: { session_code: { [Op.in]: codes } },
    attributes: ["session_id", "session_code", "title", "status", "dept_id", "host_id"],
    include: [
      {
        model: User,
        as: "user",
        attributes: ["user_id", "full_name", "email"],
        required: false
      },
      {
        model: Department,
        as: "department",
        attributes: ["dept_id", "name", "client_id"],
        required: false,
        include: [
          {
            model: Client,
            as: "client",
            attributes: ["client_id", "name"],
            required: false
          }
        ]
      }
    ]
  });

  const byCode = new Map(dbSessions.map((row) => [row.session_code, row]));

  return sessions.map((row) => {
    const meta = byCode.get(row.session_code) || byCode.get(String(row.session_code || "").toUpperCase());
    const status = meta?.status ?? null;
    return {
      ...row,
      session_id: meta?.session_id ?? null,
      title: meta?.title ?? null,
      status,
      /** Explicit DB status for ops: live/paused/draft/completed/archived/missing */
      db_status: status || "missing",
      dept_id: meta?.dept_id ?? null,
      host_id: meta?.host_id ?? null,
      host_name: meta?.user?.full_name || null,
      host_email: meta?.user?.email || null,
      department_name: meta?.department?.name || null,
      client_id: meta?.department?.client_id ?? meta?.department?.client?.client_id ?? null,
      client_name: meta?.department?.client?.name || null
    };
  });
}

/**
 * Close lingering sockets for session codes that are missing from DB or already
 * completed/archived (leftovers from before terminate-on-end, or failed notifies).
 */
async function sweepTerminalSessionConnections() {
  const codes = new Set();
  for (const bucketKey of activeConnections.keys()) {
    const { sessionCode } = parseBucketKey(bucketKey);
    if (sessionCode) codes.add(sessionCode);
  }
  if (!codes.size) return { swept: 0, closed: 0 };

  const upperCodes = [...codes].map((c) => String(c).trim().toUpperCase());
  const dbSessions = await Session.findAll({
    where: { session_code: { [Op.in]: [...new Set(upperCodes)] } },
    attributes: ["session_code", "status"]
  });
  const statusByCode = new Map(
    dbSessions.map((row) => [String(row.session_code).toUpperCase(), row.status])
  );

  let swept = 0;
  let closed = 0;
  for (const code of codes) {
    const status = statusByCode.get(String(code).trim().toUpperCase());
    const missing = status == null;
    const terminal = status === "completed" || status === "archived";
    if (!missing && !terminal) continue;
    const reason = missing
      ? "session_not_found"
      : status === "archived"
        ? "session_archived"
        : "session_ended";
    const result = closeAllSessionConnections(code, { reason });
    if (result.length) {
      swept += 1;
      closed += result.length;
    }
  }
  return { swept, closed };
}

async function maybeSweepTerminalSessionConnections() {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_THROTTLE_MS) {
    return { ...lastSweepResult, throttled: true };
  }
  lastSweepAt = now;
  try {
    lastSweepResult = await sweepTerminalSessionConnections();
  } catch (err) {
    console.error("websocket monitor terminal sweep failed:", err.message);
    lastSweepResult = { swept: 0, closed: 0, error: err.message };
  }
  return { ...lastSweepResult, throttled: false };
}

async function getWebSocketMonitorData() {
  const sweep = await maybeSweepTerminalSessionConnections();

  // Rebuild after sweep so closed sockets are not returned in this snapshot.
  const snapshot = buildSnapshot();
  appendHistory(snapshot);

  void purgeExpiredRateLimitEvents().catch(() => {});

  const [sessions, blockedIps, rateLimitEvents] = await Promise.all([
    enrichSessionsWithMetadata(snapshot.sessions),
    listBlockedIps().catch((err) => {
      console.error("list blocked ips for monitor failed:", err.message);
      return [];
    }),
    listRecentRateLimitEvents({ limit: MONITOR_LIST_LIMIT }).catch((err) => {
      console.error("list rate limit events for monitor failed:", err.message);
      return [];
    })
  ]);

  return {
    ...snapshot,
    sessions,
    // Slim connections — join session meta from sessions[] on the client
    connections: snapshot.connections,
    blocked_ips: blockedIps,
    rate_limit: {
      live: getLiveRateLimitWindows({ minCount: 2 }),
      events: rateLimitEvents
    },
    history: [...history],
    sweep,
    server: {
      process_uptime_seconds: Math.floor(process.uptime()),
      memory_heap_used_mb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
      memory_rss_mb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1))
    }
  };
}

function closeMonitorConnections({ sessionCode, role, connectionId } = {}) {
  return closeMatchingConnections({ sessionCode, role, connectionId });
}

async function blockMonitorIp({ ipAddress, reason = null, blockedBy = null, closeExisting = true } = {}) {
  const result = await blockIp({ ipAddress, reason, blockedBy });
  let closed = [];
  if (closeExisting) {
    closed = closeConnectionsByIp(result.blocked.ip_address);
  }
  return {
    ...result,
    closed_count: closed.length,
    closed
  };
}

async function unblockMonitorIp(ipAddress, { reason = null, unblockedBy = null } = {}) {
  return unblockIp(ipAddress, { reason, unblockedBy });
}

module.exports = {
  getWebSocketMonitorData,
  closeMonitorConnections,
  blockMonitorIp,
  unblockMonitorIp,
  buildSnapshot,
  forEachOpenConnection,
  sweepTerminalSessionConnections
};
