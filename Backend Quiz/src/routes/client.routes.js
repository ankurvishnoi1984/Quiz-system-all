const express = require("express");
const clientController = require("../controllers/client.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();
const platformManagers = authorizeRoles("super_admin", "sub_admin");

router.use(authMiddleware);

router.post(
  "/",
  platformManagers,
  authorizeRights("manage_clients"),
  requireAdminActionOtp,
  clientController.create
);
router.get("/", platformManagers, authorizeRights("manage_clients"), clientController.list);
router.get(
  "/:clientId/report",
  platformManagers,
  authorizeRights("manage_clients"),
  clientController.report
);
router.get(
  "/:clientId",
  platformManagers,
  authorizeRights("manage_clients"),
  clientController.detail
);

module.exports = router;
