const express = require("express");
const subAdminController = require("../controllers/sub-admin.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles("super_admin"));

router.get("/", subAdminController.list);
router.post("/", requireAdminActionOtp, subAdminController.create);
router.patch("/:userId", requireAdminActionOtp, subAdminController.update);
router.get("/:userId/actions", subAdminController.actions);

module.exports = router;
