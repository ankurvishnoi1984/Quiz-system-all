const express = require("express");
const mediaController = require("../controllers/media.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");
const { userHasRight } = require("../config/user-rights");
const { uploadMedia, uploadFont } = require("../config/multer");
const multer = require("multer");
const { errorResponse } = require("../utils/response");
const certificateController = require("../controllers/certificate.controller");

const router = express.Router();
const uploadSingleFile = uploadMedia.single("file");
const uploadSingleFont = uploadFont.single("file");
const QUESTION_MEDIA_ROLES = [
  "author",
  "super_admin",
  "client_admin",
  "dept_admin"
];

router.use("/media", authMiddleware);

function handleMediaUpload(req, res, next) {
  uploadSingleFile(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return errorResponse(res, "File size exceeds 10MB limit", 400);
    }
    return errorResponse(res, error.message || "Upload failed", 400);
  });
}

function authorizeQuestionMediaUpload(req, res, next) {
  if (
    QUESTION_MEDIA_ROLES.includes(req.user?.role) ||
    userHasRight(req.user, "builder")
  ) {
    return next();
  }
  return errorResponse(res, "Question media upload access denied", 403);
}

router.post(
  "/media/upload",
  authorizeStaff,
  authorizeQuestionMediaUpload,
  handleMediaUpload,
  mediaController.upload
);

function handleFontUpload(req, res, next) {
  uploadSingleFont(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return errorResponse(res, "Font file size exceeds 5MB limit", 400);
    }
    return errorResponse(res, error.message || "Font upload failed", 400);
  });
}

router.post(
  "/media/upload-font",
  authorizeStaff,
  authorizeQuestionMediaUpload,
  handleFontUpload,
  certificateController.uploadFontFile
);
router.get(
  "/media/:deptId",
  authorizeStaff,
  authorizeRights("builder"),
  mediaController.listByDepartment
);
router.delete(
  "/media/:assetId",
  authorizeStaff,
  authorizeRights("builder"),
  mediaController.remove
);

module.exports = router;
