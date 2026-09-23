const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const {
  otpSendIpRateLimit,
  otpVerifyIpRateLimit
} = require("../middlewares/otp-rate-limit.middleware");

const router = express.Router();

router.get("/features", authController.features);
router.post("/signup", authController.signup);
router.post("/register", authMiddleware, authorizeRoles("super_admin"), authController.register);
router.post("/login", authController.login);
router.post("/google", authController.googleLogin);
router.post("/login/verify-otp", otpVerifyIpRateLimit, authController.verifyLoginOtp);
router.post("/renew/start", otpSendIpRateLimit, authController.renewStart);
router.post("/renew/verify-otp", otpVerifyIpRateLimit, authController.renewVerifyOtp);
router.post("/renew/apply", authController.renewApply);
router.post(
  "/admin-action/otp/send",
  authMiddleware,
  authorizeRoles("super_admin"),
  authController.sendAdminActionOtp
);
router.post(
  "/admin-action/otp/verify",
  authMiddleware,
  authorizeRoles("super_admin"),
  authController.verifyAdminActionOtp
);
router.post("/otp/send", otpSendIpRateLimit, authController.sendOtp);
router.post("/otp/verify", otpVerifyIpRateLimit, authController.verifyOtp);
router.post("/refresh", authController.refresh);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-email", authController.verifyEmail);
router.get("/me", authMiddleware, authController.me);
router.post(
  "/resend-email-verification",
  authMiddleware,
  authController.resendEmailVerification
);
router.post("/change-password", authMiddleware, authController.changePassword);
router.patch("/hints-completed", authMiddleware, authController.hintsCompleted);

module.exports = router;
