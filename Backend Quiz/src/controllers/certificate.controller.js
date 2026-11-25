const { successResponse, errorResponse } = require("../utils/response");
const { generateParticipantCertificate } = require("../services/certificate.service");
const { buildFileUrl } = require("../utils/media");
const path = require("path");
const { normalizeFilePath } = require("../utils/media");
const { canAccessDepartment } = require("../config/data-scope");
const { Department, Client } = require("../models");

async function downloadParticipantCertificate(req, res) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return errorResponse(res, "Invalid session id", 400);
    }
    const result = await generateParticipantCertificate({
      sessionId,
      participant: req.participant
    });
    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename.replace(/"/g, "")}"`
    );
    return res.status(200).send(result.buffer);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function uploadFontFile(req, res) {
  try {
    if (!req.file) {
      return errorResponse(res, "file is required", 400);
    }
    const deptId = Number(req.body.dept_id);
    if (!Number.isFinite(deptId) || deptId <= 0) {
      return errorResponse(res, "dept_id is required", 400);
    }
    const department = await Department.findByPk(deptId, {
      include: [{ model: Client, attributes: ["client_id"] }]
    });
    if (!department) {
      return errorResponse(res, "Department not found", 404);
    }
    if (!canAccessDepartment(req.user, department)) {
      return errorResponse(res, "Forbidden: media access denied", 403);
    }

    const absoluteUploadRoot = path.resolve(process.cwd(), "uploads");
    const normalizedAbsolutePath = normalizeFilePath(req.file.path);
    const filePath = `/${path
      .relative(process.cwd(), normalizedAbsolutePath)
      .replaceAll(path.sep, "/")}`;
    if (!normalizedAbsolutePath.startsWith(normalizeFilePath(absoluteUploadRoot))) {
      return errorResponse(res, "Invalid upload path generated", 500);
    }

    return successResponse(
      res,
      {
        file_url: buildFileUrl(req, filePath),
        file_path: filePath
      },
      "Font uploaded successfully",
      201
    );
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  downloadParticipantCertificate,
  uploadFontFile
};
