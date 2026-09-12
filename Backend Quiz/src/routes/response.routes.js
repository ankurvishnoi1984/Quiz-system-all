const express = require("express");
const responseController = require("../controllers/response.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const participantAuthMiddleware = require("../middlewares/participant-auth.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const qaAccessMiddleware = require("../middlewares/qa-access.middleware");
const { authorizeAnyRight, authorizeRights } = require("../middlewares/rights.middleware");

const router = express.Router();

router.get("/sessions/:sessionId/participantQuestions",participantAuthMiddleware, responseController.listParticipantQuestions);
router.get("/sessions/:sessionId/leaderboard", participantAuthMiddleware, responseController.participantSessionLeaderboard);
router.get(
  "/sessions/:sessionId/survey-summary",
  participantAuthMiddleware,
  responseController.participantSessionSurveySummary
);
router.get(
  "/questions/:questionId/survey-results",
  participantAuthMiddleware,
  responseController.participantSurveyQuestionResults
);
router.post("/responses/submit", participantAuthMiddleware, responseController.submit);

// Restrict staff auth to response reporting endpoints only.
router.use("/responses", authMiddleware);

router.get(
  "/responses/question/:questionId",
  authorizeStaff,
  authorizeAnyRight("present", "reports"),
  responseController.questionResults
);
router.get(
  "/responses/session/:sessionId",
  authorizeStaff,
  authorizeAnyRight("present", "reports"),
  responseController.sessionResponses
);
router.get(
  "/responses/session/:sessionId/leaderboard",
  authorizeStaff,
  authorizeAnyRight("present", "reports"),
  responseController.sessionLeaderboard
);
router.get(
  "/responses/session/:sessionId/survey-summary",
  authorizeStaff,
  authorizeAnyRight("present", "reports"),
  responseController.sessionSurveySummary
);
router.get(
  "/responses/session/:sessionId/summary",
  authorizeStaff,
  authorizeRights("reports"),
  responseController.sessionSummary
);
router.get(
  "/responses/session/:sessionId/export",
  authorizeStaff,
  authorizeRights("reports"),
  responseController.sessionExport
);

module.exports = router;
