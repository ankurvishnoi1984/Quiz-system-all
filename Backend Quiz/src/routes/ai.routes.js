const express = require("express");
const aiController = require("../controllers/ai.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");

const router = express.Router();

router.use("/ai", authMiddleware);

router.get(
  "/ai/question-types",
  authorizeStaff,
  authorizeRights("builder"),
  aiController.listSupportedTypes
);

router.post(
  "/ai/generate-questions",
  authorizeStaff,
  authorizeRights("builder"),
  aiController.generateQuestions
);

module.exports = router;
