const { successResponse, errorResponse } = require("../utils/response");
const {
  validateBankQuestionPayload,
  validateReviewPayload,
  validateTopicPayload
} = require("../validators/question-bank.validator");
const questionBankService = require("../services/question-bank.service");

function sendError(res, err) {
  return errorResponse(res, err.message, err.statusCode || 500, err.details || null);
}

async function listOwners(req, res) {
  try {
    const owners = await questionBankService.listOwners({ user: req.user });
    return successResponse(res, { owners }, "Question bank owners fetched");
  } catch (err) {
    return sendError(res, err);
  }
}

async function listTopics(req, res) {
  try {
    const topics = await questionBankService.listTopics({
      user: req.user,
      includeInactive: req.query.include_inactive === "true"
    });
    return successResponse(res, { topics }, "Question bank topics fetched");
  } catch (err) {
    return sendError(res, err);
  }
}

async function createTopic(req, res) {
  try {
    const errors = validateTopicPayload(req.body);
    if (errors.length) return errorResponse(res, "Validation failed", 400, errors);
    const topic = await questionBankService.createTopic({ input: req.body, user: req.user });
    return successResponse(res, { topic }, "Topic created", 201);
  } catch (err) {
    return sendError(res, err);
  }
}

async function updateTopic(req, res) {
  try {
    const errors = validateTopicPayload(req.body, { partial: true });
    if (errors.length) return errorResponse(res, "Validation failed", 400, errors);
    const topic = await questionBankService.updateTopic({
      topicId: req.params.topicId,
      input: req.body,
      user: req.user
    });
    return successResponse(res, { topic }, "Topic updated");
  } catch (err) {
    return sendError(res, err);
  }
}

async function listQuestions(req, res) {
  try {
    const result = await questionBankService.listQuestions({
      user: req.user,
      query: req.query
    });
    return successResponse(res, result, "Question bank fetched");
  } catch (err) {
    return sendError(res, err);
  }
}

async function createQuestion(req, res) {
  try {
    const errors = validateBankQuestionPayload(req.body);
    if (errors.length) return errorResponse(res, "Validation failed", 400, errors);
    const question = await questionBankService.createQuestion({
      input: req.body,
      user: req.user
    });
    return successResponse(res, { question }, "Question draft created", 201);
  } catch (err) {
    return sendError(res, err);
  }
}

async function updateQuestion(req, res) {
  try {
    const question = await questionBankService.updateQuestion({
      questionId: req.params.questionId,
      input: req.body,
      user: req.user
    });
    return successResponse(res, { question }, "Question updated");
  } catch (err) {
    return sendError(res, err);
  }
}

async function submitQuestion(req, res) {
  try {
    const question = await questionBankService.submitQuestion({
      questionId: req.params.questionId,
      user: req.user
    });
    return successResponse(res, { question }, "Question submitted for review");
  } catch (err) {
    return sendError(res, err);
  }
}

async function reviewQuestion(req, res) {
  try {
    const errors = validateReviewPayload(req.body);
    if (errors.length) return errorResponse(res, "Validation failed", 400, errors);
    const question = await questionBankService.reviewQuestion({
      questionId: req.params.questionId,
      decision: String(req.body.decision).toLowerCase(),
      comments: req.body.comments,
      user: req.user
    });
    return successResponse(res, { question }, "Review decision saved");
  } catch (err) {
    return sendError(res, err);
  }
}

async function archiveQuestion(req, res) {
  try {
    const question = await questionBankService.archiveQuestion({
      questionId: req.params.questionId,
      reason: req.body?.reason || req.body?.comments,
      user: req.user
    });
    return successResponse(res, { question }, "Question archived");
  } catch (err) {
    return sendError(res, err);
  }
}

async function createRevision(req, res) {
  try {
    const question = await questionBankService.createRevision({
      questionId: req.params.questionId,
      user: req.user
    });
    return successResponse(res, { question }, "Revision draft created", 201);
  } catch (err) {
    return sendError(res, err);
  }
}

async function addToSession(req, res) {
  try {
    const result = await questionBankService.copyBankQuestionsToSession({
      sessionId: req.params.sessionId,
      bankQuestionIds: req.body?.bank_question_ids,
      setId: req.body?.set_id,
      user: req.user
    });
    return successResponse(res, result, "Questions added from bank", 201);
  } catch (err) {
    return sendError(res, err);
  }
}

async function addRandomToSession(req, res) {
  try {
    const result = await questionBankService.addRandomQuestionsToSession({
      sessionId: req.params.sessionId,
      topicId: req.body?.topic_id,
      difficulty: req.body?.difficulty,
      difficultyCounts: req.body?.difficulty_counts,
      questionType: req.body?.question_type,
      count: req.body?.count,
      setId: req.body?.set_id,
      user: req.user
    });
    return successResponse(res, result, "Random questions added from bank", 201);
  } catch (err) {
    return sendError(res, err);
  }
}

async function listPacks(req, res) {
  try {
    const packs = await questionBankService.listPacks({
      user: req.user,
      query: req.query
    });
    return successResponse(res, { packs }, "Question packs fetched");
  } catch (err) {
    return sendError(res, err);
  }
}

async function getPack(req, res) {
  try {
    const pack = await questionBankService.getPack({
      packId: req.params.packId,
      user: req.user
    });
    return successResponse(res, { pack }, "Question pack fetched");
  } catch (err) {
    return sendError(res, err);
  }
}

async function createPack(req, res) {
  try {
    const pack = await questionBankService.createPack({
      input: req.body,
      user: req.user
    });
    return successResponse(res, { pack }, "Question pack created", 201);
  } catch (err) {
    return sendError(res, err);
  }
}

async function updatePack(req, res) {
  try {
    const pack = await questionBankService.updatePack({
      packId: req.params.packId,
      input: req.body,
      user: req.user
    });
    return successResponse(res, { pack }, "Question pack updated");
  } catch (err) {
    return sendError(res, err);
  }
}

async function deletePack(req, res) {
  try {
    const result = await questionBankService.deletePack({
      packId: req.params.packId,
      user: req.user
    });
    return successResponse(res, result, "Question pack deleted");
  } catch (err) {
    return sendError(res, err);
  }
}

async function addPackToSession(req, res) {
  try {
    const result = await questionBankService.addPackToSession({
      sessionId: req.params.sessionId,
      packId: req.params.packId,
      setId: req.body?.set_id,
      user: req.user
    });
    return successResponse(res, result, "Pack questions added to session", 201);
  } catch (err) {
    return sendError(res, err);
  }
}

async function previewImport(req, res) {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const result = await questionBankService.previewBankImport({
      rows,
      owner_id: req.body?.owner_id,
      user: req.user
    });
    return successResponse(
      res,
      {
        filename: req.body?.filename || null,
        ...result
      },
      "Question bank import preview generated"
    );
  } catch (err) {
    return sendError(res, err);
  }
}

async function confirmImport(req, res) {
  try {
    const questions = Array.isArray(req.body?.questions)
      ? req.body.questions
      : Array.isArray(req.body?.rows)
        ? req.body.rows
        : [];
    const result = await questionBankService.importBankQuestions({
      questions,
      owner_id: req.body?.owner_id,
      user: req.user
    });
    return successResponse(
      res,
      result,
      `${result.created_count} draft question${result.created_count === 1 ? "" : "s"} imported`,
      201
    );
  } catch (err) {
    return sendError(res, err);
  }
}

module.exports = {
  listOwners,
  listTopics,
  createTopic,
  updateTopic,
  listQuestions,
  createQuestion,
  updateQuestion,
  submitQuestion,
  reviewQuestion,
  archiveQuestion,
  createRevision,
  addToSession,
  addRandomToSession,
  listPacks,
  getPack,
  createPack,
  updatePack,
  deletePack,
  addPackToSession,
  previewImport,
  confirmImport
};
