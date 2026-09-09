const { successResponse, errorResponse } = require("../utils/response");
const {
  getWebSocketMonitorData,
  closeMonitorConnections,
  blockMonitorIp,
  unblockMonitorIp
} = require("../services/websocket-monitor.service");

async function getMonitorStats(req, res) {
  try {
    const data = await getWebSocketMonitorData();
    return successResponse(res, { monitor: data }, "WebSocket monitor stats fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function closeConnections(req, res) {
  try {
    const sessionCode = req.body?.session_code;
    const role = req.body?.role;
    const connectionId = req.body?.connection_id;
    const closed = closeMonitorConnections({ sessionCode, role, connectionId });
    return successResponse(
      res,
      {
        closed_count: closed.length,
        closed
      },
      closed.length ? "Connections closed" : "No matching connections",
      200
    );
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function blockIpAddress(req, res) {
  try {
    const ipAddress = req.body?.ip_address;
    const reason = req.body?.reason;
    const result = await blockMonitorIp({
      ipAddress,
      reason,
      blockedBy: req.user?.user_id || null,
      closeExisting: req.body?.close_existing !== false
    });
    return successResponse(
      res,
      result,
      result.created ? "IP address blocked" : "IP address already blocked",
      result.created ? 201 : 200
    );
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function unblockIpAddress(req, res) {
  try {
    const ipAddress = req.body?.ip_address || req.params?.ip;
    const reason = req.body?.reason;
    const result = await unblockMonitorIp(ipAddress, {
      reason,
      unblockedBy: req.user?.user_id || null
    });
    return successResponse(res, result, "IP address unblocked", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  getMonitorStats,
  closeConnections,
  blockIpAddress,
  unblockIpAddress
};
