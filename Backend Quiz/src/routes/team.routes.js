const express = require("express");
const teamController = require("../controllers/team.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");

const router = express.Router();

router.use(authMiddleware, authorizeStaff);
router.get("/", teamController.getTeam);
router.post("/members", teamController.addMember);
router.post("/members/:memberId/resend-verification", teamController.resendVerification);
router.delete("/members/:memberId", teamController.removeMember);

module.exports = router;
