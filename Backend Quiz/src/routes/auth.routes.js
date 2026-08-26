const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = express.Router();

router.get("/features", authController.features);
router.post("/signup", authController.signup);
router.post("/register", authMiddleware, authorizeRoles("super_admin"), authController.register);
router.post("/login", authController.login);
router.post("/login/verify-otp", authController.verifyLoginOtp);
router.post("/otp/send", authController.sendOtp);
router.post("/otp/verify", authController.verifyOtp);
router.post("/refresh", authController.refresh);
router.post("/forgot-password", authController.forgotPassword);
router.get("/me", authMiddleware, authController.me);
router.post("/change-password", authMiddleware, authController.changePassword);
router.patch("/hints-completed", authMiddleware, authController.hintsCompleted);

module.exports = router;
