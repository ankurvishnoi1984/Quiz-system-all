const express = require("express");
const analyticsController = require("../controllers/analytics.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");

const router = express.Router();

router.use("/analytics", authMiddleware);

router.get(
  "/analytics/dept/:deptId/overview",
  authorizeRoles("super_admin"),
  analyticsController.departmentOverview
);
router.get(
  "/analytics/dept/:deptId/sessions",
  authorizeRoles("super_admin"),
  analyticsController.departmentSessions
);
router.get(
  "/analytics/client/:clientId/overview",
  authorizeRoles("super_admin"),
  analyticsController.clientOverview
);
router.get(
  "/analytics/dept/:deptId/export",
  authorizeRoles("super_admin"),
  analyticsController.departmentExport
);
router.get(
  "/analytics/session/:sessionId/report",
  authorizeStaff,
  authorizeRights("reports"),
  analyticsController.sessionReport
);

module.exports = router;
