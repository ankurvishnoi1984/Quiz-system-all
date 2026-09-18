const express = require("express");
const teamController = require("../controllers/team.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  authorizeRoles("super_admin", "sub_admin"),
  authorizeRights("manage_teams"),
  teamController.listAdminTeams
);

module.exports = router;
