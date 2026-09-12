const express = require("express");
const sessionController = require("../controllers/session.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeRights, authorizeAnyRight } = require("../middlewares/rights.middleware");

const router = express.Router();

// Public join endpoints (no auth token required)
router.get("/sessions/join/:code", sessionController.lookupByCode);
router.post("/sessions/join/:code/otp/send", sessionController.sendJoinOtp);
router.post("/sessions/join/:code/otp/verify", sessionController.verifyJoinOtp);
router.post("/sessions/join/:code", sessionController.joinByCode);

// Only protect session/department management routes in this router.
router.use(["/departments", "/sessions"], authMiddleware);

router.get(
  "/departments/:deptId/sessions",
  authorizeStaff,
  sessionController.listByDepartment
);
router.post(
  "/departments/:deptId/sessions",
  authorizeStaff,
  authorizeRights("sessions"),
  sessionController.createForDepartment
);

router.get(
  "/sessions/:sessionId/report/qa",
  authorizeStaff,
  authorizeRights("reports"),
  sessionController.sessionQaReport
);
router.get(
  "/sessions/:sessionId/report/participants",
  authorizeStaff,
  authorizeRights("reports"),
  sessionController.sessionParticipantsReport
);
router.get(
  "/sessions/:sessionId/report/questions",
  authorizeStaff,
  authorizeRights("reports"),
  sessionController.sessionQuestionsReport
);
router.get(
  "/sessions/:sessionId/report/summary",
  authorizeStaff,
  authorizeRights("reports"),
  sessionController.sessionSummaryReport
);
router.get(
  "/sessions/:sessionId",
  authorizeStaff,
  sessionController.detail
);
router.get(
  "/sessions/:sessionId/participants",
  authorizeStaff,
  authorizeAnyRight("sessions", "present"),
  sessionController.listParticipants
);
router.put(
  "/sessions/:sessionId",
  authorizeStaff,
  authorizeRights("sessions"),
  sessionController.update
);
router.post(
  "/sessions/:sessionId/duplicate",
  authorizeStaff,
  authorizeRights("sessions"),
  sessionController.duplicate
);
router.delete(
  "/sessions/:sessionId",
  authorizeStaff,
  authorizeRights("sessions"),
  sessionController.remove
);
router.post(
  "/sessions/:sessionId/reset-responses",
  authorizeStaff,
  authorizeRights("sessions"),
  sessionController.resetResponses
);
router.post(
  "/sessions/:sessionId/start",
  authorizeStaff,
  authorizeRights("sessions"),
  sessionController.start
);
router.post(
  "/sessions/:sessionId/pause",
  authorizeStaff,
  authorizeAnyRight("sessions", "present"),
  sessionController.pause
);
router.post(
  "/sessions/:sessionId/resume",
  authorizeStaff,
  authorizeAnyRight("sessions", "present"),
  sessionController.resume
);
router.post(
  "/sessions/:sessionId/end",
  authorizeStaff,
  authorizeAnyRight("sessions", "present"),
  sessionController.end
);
router.post(
  "/sessions/:sessionId/activity",
  authorizeStaff,
  authorizeAnyRight("sessions", "present"),
  sessionController.pingActivity
);
router.post(
  "/sessions/:sessionId/close-all-questions",
  authorizeStaff,
  authorizeRights("present"),
  sessionController.closeAllQuestions
);
router.post(
  "/sessions/:sessionId/activate-all-questions",
  authorizeStaff,
  authorizeRights("present"),
  sessionController.activateAllQuestions
);
router.get(
  "/sessions/:sessionId/qr",
  authorizeStaff,
  authorizeAnyRight("sessions", "present"),
  sessionController.qr
);
router.post(
  "/sessions/:sessionId/present-view-link",
  authorizeStaff,
  authorizeRights("present"),
  sessionController.presentViewLink
);
if (require("../config/integrations").isIntegrationsEnabled()) {
  router.post(
    "/sessions/:sessionId/embed-link",
    authorizeStaff,
    authorizeRights("present"),
    sessionController.embedLink
  );
}
router.get(
  "/sessions/:sessionId/present-slide",
  authorizeStaff,
  authorizeRights("present"),
  sessionController.getPresentSlide
);
router.put(
  "/sessions/:sessionId/present-slide",
  authorizeStaff,
  authorizeRights("present"),
  sessionController.presentSlide
);

module.exports = router;
