const express = require("express");
const zoomController = require("../controllers/zoom.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeAnyRight } = require("../middlewares/rights.middleware");
const { isZoomAppEnabled } = require("../config/zoom");
const { errorResponse } = require("../utils/response");

const router = express.Router();

function requireZoomEnabled(req, res, next) {
  if (!isZoomAppEnabled()) {
    return errorResponse(res, "Zoom app integration is disabled", 503, null, "ZOOM_DISABLED");
  }
  return next();
}

router.use(requireZoomEnabled);

// Public: meeting lookup + participant join + OAuth callback + webhooks
router.get("/integrations/zoom/status", zoomController.getStatus);
router.get("/integrations/zoom/oauth/callback", zoomController.oauthCallback);
router.get("/integrations/zoom/meeting-session", zoomController.getMeetingSession);
router.post("/integrations/zoom/meeting-session/join", zoomController.joinMeetingSession);
router.post("/integrations/zoom/webhooks", zoomController.handleWebhook);

// Authenticated host actions
router.get(
  "/integrations/zoom/status/me",
  authMiddleware,
  authorizeStaff,
  zoomController.getStatus
);
router.post(
  "/integrations/zoom/oauth/start",
  authMiddleware,
  authorizeStaff,
  zoomController.startOAuth
);
router.post(
  "/integrations/zoom/oauth/disconnect",
  authMiddleware,
  authorizeStaff,
  zoomController.disconnect
);
router.put(
  "/integrations/zoom/meeting-session",
  authMiddleware,
  authorizeStaff,
  authorizeAnyRight("sessions", "present"),
  zoomController.putMeetingSession
);
router.delete(
  "/integrations/zoom/meeting-session",
  authMiddleware,
  authorizeStaff,
  authorizeAnyRight("sessions", "present"),
  zoomController.deleteMeetingSession
);

module.exports = router;
