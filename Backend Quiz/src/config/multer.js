const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { getMediaTypeFromMime, getStorageFolderFromMime } = require("../utils/media");

const uploadsRoot = path.resolve(process.cwd(), "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderName = getStorageFolderFromMime(file.mimetype);
    const destinationPath = path.join(uploadsRoot, folderName);
    fs.mkdirSync(destinationPath, { recursive: true });
    cb(null, destinationPath);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const mediaType = getMediaTypeFromMime(file.mimetype);
  if (!mediaType) {
    return cb(new Error("Only image, video, and audio files are allowed"));
  }
  return cb(null, true);
};

const uploadMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const extraSeatAllowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf"
]);

const extraSeatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const destinationPath = path.join(uploadsRoot, "extra-seats");
    fs.mkdirSync(destinationPath, { recursive: true });
    cb(null, destinationPath);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

const extraSeatFileFilter = (_req, file, cb) => {
  if (!extraSeatAllowedTypes.has(file.mimetype)) {
    return cb(new Error("Only images (JPEG, PNG, WebP, GIF) and PDF files are allowed"));
  }
  return cb(null, true);
};

const uploadExtraSeatAttachment = multer({
  storage: extraSeatStorage,
  fileFilter: extraSeatFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const extraQuestionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const destinationPath = path.join(uploadsRoot, "extra-questions");
    fs.mkdirSync(destinationPath, { recursive: true });
    cb(null, destinationPath);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

const uploadExtraQuestionAttachment = multer({
  storage: extraQuestionStorage,
  fileFilter: extraSeatFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

module.exports = {
  uploadMedia,
  uploadExtraSeatAttachment,
  uploadExtraQuestionAttachment
};
