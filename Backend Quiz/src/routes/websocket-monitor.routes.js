const express = require("express");
const websocketMonitorController = require("../controllers/websocket-monitor.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/monitor/websockets",
  authorizeRoles("super_admin"),
  websocketMonitorController.getMonitorStats
);

router.post(
  "/monitor/websockets/close",
  authorizeRoles("super_admin"),
  websocketMonitorController.closeConnections
);

router.post(
  "/monitor/websockets/block-ip",
  authorizeRoles("super_admin"),
  websocketMonitorController.blockIpAddress
);

router.post(
  "/monitor/websockets/unblock-ip",
  authorizeRoles("super_admin"),
  websocketMonitorController.unblockIpAddress
);

module.exports = router;
