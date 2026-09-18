const express = require("express");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");
const { uploadExtraSeatAttachment, uploadExtraQuestionAttachment } = require("../config/multer");
const multer = require("multer");
const { errorResponse } = require("../utils/response");
const requireAdminActionOtp = require("../middlewares/admin-action-otp.middleware");

const router = express.Router();
const platformManagers = authorizeRoles("super_admin", "sub_admin");

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

router.get("/", platformManagers, authorizeRights("manage_users"), userController.list);
router.post(
  "/",
  platformManagers,
  authorizeRights("manage_users"),
  requireAdminActionOtp,
  userController.create
);
router.patch(
  "/:userId/plan",
  platformManagers,
  authorizeRights("manage_user_plan"),
  requireAdminActionOtp,
  userController.assignPlan
);
router.patch(
  "/:userId/status",
  platformManagers,
  authorizeRights("manage_users"),
  requireAdminActionOtp,
  userController.setStatus
);
router.get(
  "/:userId/extra-participants",
  platformManagers,
  authorizeRights("manage_user_extra_participants"),
  userController.listAddons
);
router.post(
  "/:userId/extra-participants/attachment",
  platformManagers,
  authorizeRights("manage_user_extra_participants"),
  requireAdminActionOtp,
  uploadExtraSeatFile,
  userController.uploadExtraAttachment
);
router.patch(
  "/:userId/extra-participants",
  platformManagers,
  authorizeRights("manage_user_extra_participants"),
  requireAdminActionOtp,
  userController.adjustExtraParticipants
);
router.get(
  "/:userId/extra-questions",
  platformManagers,
  authorizeRights("manage_user_extra_questions"),
  userController.listQuestionAddons
);
router.post(
  "/:userId/extra-questions/attachment",
  platformManagers,
  authorizeRights("manage_user_extra_questions"),
  requireAdminActionOtp,
  uploadExtraQuestionFile,
  userController.uploadExtraQuestionAttachment
);
router.patch(
  "/:userId/extra-questions",
  platformManagers,
  authorizeRights("manage_user_extra_questions"),
  requireAdminActionOtp,
  userController.adjustExtraQuestions
);
router.get(
  "/:userId/team-seats",
  platformManagers,
  authorizeRights("manage_user_team_seats"),
  userController.listTeamAddons
);
router.patch(
  "/:userId/team-seats",
  platformManagers,
  authorizeRights("manage_user_team_seats"),
  requireAdminActionOtp,
  userController.adjustExtraTeamMembers
);

module.exports = router;
