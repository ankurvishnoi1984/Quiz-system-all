const express = require("express");
const roleController = require("../controllers/role.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/", authorizeRoles("super_admin"), roleController.list);
router.post("/", authorizeRoles("super_admin"), requireAdminActionOtp, roleController.create);
router.patch(
  "/:roleId",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  roleController.update
);
router.delete(
  "/:roleId",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  roleController.remove
);

module.exports = router;
