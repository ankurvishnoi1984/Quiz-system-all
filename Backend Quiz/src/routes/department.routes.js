const express = require("express");
const departmentController = require("../controllers/department.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", authorizeStaff, requireAdminActionOtp, departmentController.create);
router.get("/", authorizeStaff, departmentController.list);
router.get(
  "/:departmentId/report",
  authorizeRoles("super_admin"),
  departmentController.report
);
router.get("/:departmentId", authorizeStaff, departmentController.detail);

module.exports = router;
