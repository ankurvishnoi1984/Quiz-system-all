const { successResponse, errorResponse } = require("../utils/response");
const {
  listUsers,
  createUserByAdmin,
  assignUserPlan,
  listUserParticipantAddons,
  listUserQuestionAddons,
  listUserTeamAddons,
  adjustUserExtraParticipants,
  adjustUserExtraQuestions,
  adjustUserExtraTeamMembers,
  saveExtraParticipantAttachment,
  saveExtraQuestionAttachment,
  setUserActiveStatus
} = require("../services/user.service");
const {
  validateCreateUserPayload,
  validateExtraParticipantsPayload,
  validateUserStatusPayload
} = require("../validators/user.validator");
const { validateAssignPlanPayload } = require("../validators/plan.validator");
const { assertAdminActionOtpToken } = require("../services/otp.service");

// Extra questions uses the same add/set/note/attachment payload shape as seats.
const validateExtraQuestionsPayload = validateExtraParticipantsPayload;

function requireAdminActionOtp(req) {
  assertAdminActionOtpToken(req.body?.otp_token);
}

async function list(req, res) {
  try {
    const users = await listUsers(req.user);
    return successResponse(res, { users }, "Users fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function create(req, res) {
  try {
    const errors = validateCreateUserPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const result = await createUserByAdmin(req.body, req.user);
    const message = result.email_sent
      ? "User created and welcome email sent"
      : "User created, but welcome email could not be sent";

    return successResponse(res, result, message, 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function assignPlan(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }

    const errors = validateAssignPlanPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    requireAdminActionOtp(req);

    const user = await assignUserPlan({
      userId,
      planId: req.body.plan_id,
      planExpiresAt: req.body.plan_expires_at
    });
    return successResponse(res, { user }, "User plan updated", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function listAddons(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }

    const addons = await listUserParticipantAddons(userId);
    return successResponse(res, { addons }, "Extra seats history fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function adjustExtraParticipants(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }

    const errors = validateExtraParticipantsPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    requireAdminActionOtp(req);

    const user = await adjustUserExtraParticipants({
      userId,
      add: req.body.add,
      set: req.body.set,
      note: req.body.note,
      attachmentUrl: req.body.attachment_url,
      attachmentFilename: req.body.attachment_filename,
      adminUser: req.user
    });
    return successResponse(res, { user }, "Extra participants updated", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function setStatus(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }

    const errors = validateUserStatusPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    const user = await setUserActiveStatus({
      userId,
      isActive: req.body.is_active,
      adminUser: req.user
    });
    return successResponse(
      res,
      { user },
      user.is_active ? "User activated" : "User deactivated",
      200
    );
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function uploadExtraAttachment(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }
    if (!req.file) {
      return errorResponse(res, "file is required", 400);
    }

    const attachment = await saveExtraParticipantAttachment({
      userId,
      file: req.file
    });
    return successResponse(res, attachment, "Attachment uploaded", 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function listQuestionAddons(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }

    const addons = await listUserQuestionAddons(userId);
    return successResponse(res, { addons }, "Extra questions history fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function adjustExtraQuestions(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }

    const errors = validateExtraQuestionsPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }

    requireAdminActionOtp(req);

    const user = await adjustUserExtraQuestions({
      userId,
      add: req.body.add,
      set: req.body.set,
      note: req.body.note,
      attachmentUrl: req.body.attachment_url,
      attachmentFilename: req.body.attachment_filename,
      adminUser: req.user
    });
    return successResponse(res, { user }, "Extra questions updated", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function uploadExtraQuestionAttachment(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }
    if (!req.file) {
      return errorResponse(res, "file is required", 400);
    }

    const attachment = await saveExtraQuestionAttachment({
      userId,
      file: req.file
    });
    return successResponse(res, attachment, "Attachment uploaded", 201);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function listTeamAddons(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }
    const addons = await listUserTeamAddons(userId);
    return successResponse(res, { addons }, "Team seat history fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function adjustExtraTeamMembers(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return errorResponse(res, "userId must be a number", 400);
    }
    const errors = validateExtraParticipantsPayload(req.body);
    if (
      req.body?.price_at_purchase != null &&
      req.body.price_at_purchase !== "" &&
      (!Number.isFinite(Number(req.body.price_at_purchase)) ||
        Number(req.body.price_at_purchase) < 0)
    ) {
      errors.push("price_at_purchase must be a non-negative number or null");
    }
    if (errors.length > 0) {
      return errorResponse(res, "Validation failed", 400, errors);
    }
    requireAdminActionOtp(req);
    const user = await adjustUserExtraTeamMembers({
      userId,
      add: req.body.add,
      set: req.body.set,
      priceAtPurchase: req.body.price_at_purchase,
      adminUser: req.user
    });
    return successResponse(res, { user }, "Extra team seats updated", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  list,
  create,
  assignPlan,
  listAddons,
  listQuestionAddons,
  adjustExtraParticipants,
  adjustExtraQuestions,
  uploadExtraAttachment,
  uploadExtraQuestionAttachment,
  listTeamAddons,
  adjustExtraTeamMembers,
  setStatus
};
