const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");
const controller = require("../controllers/question-bank.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/topics", controller.listTopics);
router.post("/topics", authorizeRoles("super_admin"), controller.createTopic);
router.put("/topics/:topicId", authorizeRoles("super_admin"), controller.updateTopic);

router.get("/questions", controller.listQuestions);
router.post(
  "/questions",
  authorizeRoles("author"),
  controller.createQuestion
);
router.put(
  "/questions/:questionId",
  authorizeRoles("author"),
  controller.updateQuestion
);
router.post(
  "/questions/:questionId/submit",
  authorizeRoles("author"),
  controller.submitQuestion
);
router.post(
  "/questions/:questionId/revise",
  authorizeRoles("author"),
  controller.createRevision
);
router.post(
  "/questions/:questionId/review",
  authorizeRoles("auditor"),
  controller.reviewQuestion
);
router.post(
  "/questions/:questionId/archive",
  authorizeRoles("auditor"),
  controller.archiveQuestion
);

router.post(
  "/sessions/:sessionId/add",
  authorizeRights("builder"),
  controller.addToSession
);
router.post(
  "/sessions/:sessionId/random",
  authorizeRights("builder"),
  controller.addRandomToSession
);

module.exports = router;
