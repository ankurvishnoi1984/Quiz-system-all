const express = require("express");
const questionController = require("../controllers/question.controller");
const questionSetController = require("../controllers/question-set.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeRights, authorizeAnyRight } = require("../middlewares/rights.middleware");

const router = express.Router();

// Scope auth to question-related paths only.
router.use(["/sessions", "/questions"], authMiddleware);

router.get(
  "/sessions/:sessionId/question-sets",
  authorizeStaff,
  authorizeAnyRight("builder", "present"),
  questionSetController.list
);
router.post(
  "/sessions/:sessionId/question-sets",
  authorizeStaff,
  authorizeRights("builder"),
  questionSetController.create
);
router.put(
  "/sessions/:sessionId/question-sets/:setId",
  authorizeStaff,
  authorizeRights("builder"),
  questionSetController.update
);
router.delete(
  "/sessions/:sessionId/question-sets/:setId",
  authorizeStaff,
  authorizeRights("builder"),
  questionSetController.remove
);
router.get(
  "/sessions/:sessionId/questions",
  authorizeStaff,
  authorizeAnyRight("builder", "present", "reports"),
  questionController.listBySession
);
router.post(
  "/sessions/:sessionId/questions/import/preview",
  authorizeStaff,
  authorizeRights("builder"),
  questionController.previewImport
);
router.post(
  "/sessions/:sessionId/questions/import",
  authorizeStaff,
  authorizeRights("builder"),
  questionController.confirmImport
);
router.post(
  "/sessions/:sessionId/questions",
  authorizeStaff,
  authorizeRights("builder"),
  questionController.createForSession
);
router.get(
  "/questions/:questionId",
  authorizeStaff,
  authorizeAnyRight("builder", "present", "reports"),
  questionController.detail
);
router.put(
  "/questions/:questionId",
  authorizeStaff,
  authorizeRights("builder"),
  questionController.update
);
router.delete(
  "/questions/:questionId",
  authorizeStaff,
  authorizeRights("builder"),
  questionController.remove
);
router.post(
  "/questions/reorder",
  authorizeStaff,
  authorizeRights("builder"),
  questionController.reorder
);
router.post(
  "/questions/:questionId/activate",
  authorizeStaff,
  authorizeRights("present"),
  questionController.activate
);
router.post(
  "/questions/:questionId/deactivate",
  authorizeStaff,
  authorizeRights("present"),
  questionController.deactivate
);
router.post(
  "/questions/:questionId/reveal-answer",
  authorizeStaff,
  authorizeRights("present"),
  questionController.revealAnswer
);
router.post(
  "/questions/:questionId/hide-answer",
  authorizeStaff,
  authorizeRights("present"),
  questionController.hideAnswer
);
router.post(
  "/questions/:questionId/show-leaderboard",
  authorizeStaff,
  authorizeRights("present"),
  questionController.showLeaderboard
);
router.post(
  "/questions/:questionId/hide-leaderboard",
  authorizeStaff,
  authorizeRights("present"),
  questionController.hideLeaderboard
);
router.post(
  "/questions/:questionId/open-reattempt",
  authorizeStaff,
  authorizeRights("present"),
  questionController.openForReattempt
);
router.post(
  "/questions/:questionId/close",
  authorizeStaff,
  authorizeRights("present"),
  questionController.closeQuestion
);

module.exports = router;
