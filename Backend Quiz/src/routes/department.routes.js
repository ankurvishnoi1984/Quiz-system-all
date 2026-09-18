const express = require("express");
const departmentController = require("../controllers/department.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();
const platformManagers = authorizeRoles("super_admin", "sub_admin");

router.use(authMiddleware);

router.post("/", authorizeStaff, requireAdminActionOtp, departmentController.create);
router.get("/", authorizeStaff, departmentController.list);
router.get(
  "/:departmentId/report",
  platformManagers,
  authorizeRights("manage_departments"),
  departmentController.report
);
router.get("/:departmentId", authorizeStaff, departmentController.detail);

module.exports = router;
