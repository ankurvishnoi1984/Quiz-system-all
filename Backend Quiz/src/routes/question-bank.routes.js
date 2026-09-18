const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");
const controller = require("../controllers/question-bank.controller");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/owners",
  authorizeRoles("super_admin", "client_admin", "dept_admin"),
  controller.listOwners
);
router.get("/topics", controller.listTopics);

router.get("/questions", controller.listQuestions);
router.post(
  "/questions",
  authorizeRoles("author", "super_admin", "client_admin", "dept_admin"),
  controller.createQuestion
);
router.post(
  "/questions/import/preview",
  authorizeRoles("author", "super_admin", "client_admin", "dept_admin"),
  controller.previewImport
);
router.post(
  "/questions/import",
  authorizeRoles("author", "super_admin", "client_admin", "dept_admin"),
  controller.confirmImport
);
router.put(
  "/questions/:questionId",
  authorizeRoles("author", "super_admin", "client_admin", "dept_admin"),
  controller.updateQuestion
);
router.post(
  "/questions/:questionId/submit",
  authorizeRoles("author", "super_admin", "client_admin", "dept_admin"),
  controller.submitQuestion
);
router.post(
  "/questions/:questionId/revise",
  authorizeRoles("author", "super_admin", "client_admin", "dept_admin"),
  controller.createRevision
);
router.post(
  "/questions/:questionId/review",
  authorizeRoles("auditor", "super_admin", "client_admin", "dept_admin"),
  controller.reviewQuestion
);
router.post(
  "/questions/:questionId/archive",
  authorizeRoles("auditor", "super_admin", "client_admin", "dept_admin"),
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
