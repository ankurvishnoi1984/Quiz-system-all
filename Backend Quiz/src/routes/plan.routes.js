const express = require("express");
const planController = require("../controllers/plan.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();
const platformManagers = authorizeRoles("super_admin", "sub_admin");

router.get("/public", planController.publicList);
router.use(authMiddleware);

router.get("/usage", planController.usage);
router.get("/account", planController.account);
router.get("/", platformManagers, authorizeRights("manage_plans"), planController.list);
router.post(
  "/",
  platformManagers,
  authorizeRights("manage_plans"),
  requireAdminActionOtp,
  planController.create
);
router.put(
  "/:planId",
  platformManagers,
  authorizeRights("manage_plans"),
  requireAdminActionOtp,
  planController.update
);

module.exports = router;
