const express = require("express");
const planController = require("../controllers/plan.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();

router.get("/public", planController.publicList);
router.use(authMiddleware);

router.get("/usage", planController.usage);
router.get("/account", planController.account);
router.get("/", authorizeRoles("super_admin"), planController.list);
router.post(
  "/",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  planController.create
);
router.put(
  "/:planId",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  planController.update
);

module.exports = router;
