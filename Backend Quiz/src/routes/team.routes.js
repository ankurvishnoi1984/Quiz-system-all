const express = require("express");
const teamController = require("../controllers/team.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = express.Router();

router.use(authMiddleware, authorizeStaff, authorizeRoles("host"));
router.get("/", teamController.getTeam);
router.post("/members", teamController.addMember);
router.patch("/members/:memberId", teamController.updateMember);
router.post("/members/:memberId/resend-verification", teamController.resendVerification);
router.delete("/members/:memberId", teamController.removeMember);

module.exports = router;
