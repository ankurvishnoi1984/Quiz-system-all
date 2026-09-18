const express = require("express");
const analyticsController = require("../controllers/analytics.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeRights, authorizeAnyRight } = require("../middlewares/rights.middleware");

const router = express.Router();
const platformManagers = authorizeRoles("super_admin", "sub_admin");

router.use("/analytics", authMiddleware);

router.get(
  "/analytics/dept/:deptId/overview",
  platformManagers,
  authorizeAnyRight("manage_departments", "manage_clients"),
  analyticsController.departmentOverview
);
router.get(
  "/analytics/dept/:deptId/sessions",
  platformManagers,
  authorizeAnyRight("manage_departments", "manage_clients"),
  analyticsController.departmentSessions
);
router.get(
  "/analytics/client/:clientId/overview",
  platformManagers,
  authorizeRights("manage_clients"),
  analyticsController.clientOverview
);
router.get(
  "/analytics/dept/:deptId/export",
  platformManagers,
  authorizeAnyRight("manage_departments", "manage_clients"),
  analyticsController.departmentExport
);
router.get(
  "/analytics/session/:sessionId/report",
  authorizeStaff,
  authorizeRights("reports"),
  analyticsController.sessionReport
);

module.exports = router;
