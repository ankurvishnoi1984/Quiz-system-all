const express = require("express");
const clientController = require("../controllers/client.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  clientController.create
);
router.get("/", authorizeRoles("super_admin"), clientController.list);
router.get(
  "/:clientId/report",
  authorizeRoles("super_admin"),
  clientController.report
);
router.get("/:clientId", authorizeRoles("super_admin"), clientController.detail);

module.exports = router;
