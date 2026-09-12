const express = require("express");
const mediaController = require("../controllers/media.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeStaff = require("../middlewares/staff.middleware");
const { authorizeRights } = require("../middlewares/rights.middleware");
const { uploadMedia } = require("../config/multer");
const multer = require("multer");
const { errorResponse } = require("../utils/response");

const router = express.Router();
const uploadSingleFile = uploadMedia.single("file");

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

router.post(
  "/media/upload",
  authorizeStaff,
  authorizeRights("builder"),
  handleMediaUpload,
  mediaController.upload
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
