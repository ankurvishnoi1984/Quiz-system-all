const express = require("express");
const teamController = require("../controllers/team.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  authorizeRoles("super_admin"),
  teamController.listAdminTeams
);

module.exports = router;
