const express = require("express");
const websocketMonitorController = require("../controllers/websocket-monitor.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();
const platformManagers = authorizeRoles("super_admin", "sub_admin");

// Scope auth to /monitor only — this router is mounted at "/", so a bare
// router.use(authMiddleware) would 401 every unmatched API path (including Zoom).
router.use("/monitor", authMiddleware);

router.get(
  "/monitor/websockets",
  platformManagers,
  authorizeRights("connection_monitor"),
  websocketMonitorController.getMonitorStats
);

router.post(
  "/monitor/websockets/close",
  platformManagers,
  authorizeRights("connection_monitor"),
  requireAdminActionOtp,
  websocketMonitorController.closeConnections
);

router.post(
  "/monitor/websockets/block-ip",
  platformManagers,
  authorizeRights("connection_monitor"),
  requireAdminActionOtp,
  websocketMonitorController.blockIpAddress
);

router.post(
  "/monitor/websockets/unblock-ip",
  platformManagers,
  authorizeRights("connection_monitor"),
  requireAdminActionOtp,
  websocketMonitorController.unblockIpAddress
);

module.exports = router;
