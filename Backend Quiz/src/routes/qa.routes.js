const express = require("express");
const qaController = require("../controllers/qa.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const participantAuthMiddleware = require("../middlewares/participant-auth.middleware");
const qaAccessMiddleware = require("../middlewares/qa-access.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeAnyRight } = require("../middlewares/rights.middleware");

const router = express.Router();

router.get("/qa/:sessionId/questions", qaAccessMiddleware, qaController.listQuestions);
router.post("/qa/:sessionId/ask", participantAuthMiddleware, qaController.ask);
router.post("/qa/:qaId/upvote", participantAuthMiddleware, qaController.upvote);
router.delete("/qa/:qaId/upvote", participantAuthMiddleware, qaController.unvote);
router.put(
  "/qa/:qaId/approve",
  authMiddleware,
  authorizeStaff,
  authorizeAnyRight("present", "sessions"),
  qaController.approve
);
router.put(
  "/qa/:qaId/reject",
  authMiddleware,
  authorizeStaff,
  authorizeAnyRight("present", "sessions"),
  qaController.reject
);
router.put(
  "/qa/:qaId/answer",
  authMiddleware,
  authorizeStaff,
  authorizeAnyRight("present", "sessions"),
  qaController.answer
);
router.put(
  "/qa/:qaId/pin",
  authMiddleware,
  authorizeStaff,
  authorizeAnyRight("present", "sessions"),
  qaController.pin
);

module.exports = router;
