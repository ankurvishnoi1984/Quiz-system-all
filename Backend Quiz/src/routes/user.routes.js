const express = require("express");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const { uploadExtraSeatAttachment, uploadExtraQuestionAttachment } = require("../config/multer");
const multer = require("multer");
const { errorResponse } = require("../utils/response");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();

function uploadExtraSeatFile(req, res, next) {
  uploadExtraSeatAttachment.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return errorResponse(res, "Attachment must be 10 MB or smaller", 400);
    }
    return errorResponse(res, error.message || "Invalid attachment", 400);
  });
}

function uploadExtraQuestionFile(req, res, next) {
  uploadExtraQuestionAttachment.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return errorResponse(res, "Attachment must be 10 MB or smaller", 400);
    }
    return errorResponse(res, error.message || "Invalid attachment", 400);
  });
}

router.use(authMiddleware);

router.get("/", authorizeRoles("super_admin"), userController.list);
router.post(
  "/",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  userController.create
);
router.patch(
  "/:userId/plan",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  userController.assignPlan
);
router.patch(
  "/:userId/status",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  userController.setStatus
);
router.get(
  "/:userId/extra-participants",
  authorizeRoles("super_admin"),
  userController.listAddons
);
router.post(
  "/:userId/extra-participants/attachment",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  uploadExtraSeatFile,
  userController.uploadExtraAttachment
);
router.patch(
  "/:userId/extra-participants",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  userController.adjustExtraParticipants
);
router.get(
  "/:userId/extra-questions",
  authorizeRoles("super_admin"),
  userController.listQuestionAddons
);
router.post(
  "/:userId/extra-questions/attachment",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  uploadExtraQuestionFile,
  userController.uploadExtraQuestionAttachment
);
router.patch(
  "/:userId/extra-questions",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  userController.adjustExtraQuestions
);
router.get(
  "/:userId/team-seats",
  authorizeRoles("super_admin"),
  userController.listTeamAddons
);
router.patch(
  "/:userId/team-seats",
  authorizeRoles("super_admin"),
  requireAdminActionOtp,
  userController.adjustExtraTeamMembers
);

module.exports = router;
