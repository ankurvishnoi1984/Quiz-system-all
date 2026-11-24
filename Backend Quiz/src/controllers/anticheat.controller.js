const { successResponse, errorResponse } = require("../utils/response");
const {
  recordTabSwitchViolation,
  listSessionAnticheatSummary
} = require("../services/anticheat.service");

async function reportTabSwitch(req, res) {
  try {
    const questionId =
      req.body?.question_id != null && req.body.question_id !== ""
        ? Number(req.body.question_id)
        : null;
    const result = await recordTabSwitchViolation({
      participant: req.participant,
      sessionId: Number(req.params.sessionId),
      questionId: Number.isFinite(questionId) ? questionId : null
    });
    return successResponse(res, result, "Anticheat event recorded", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function listAnticheat(req, res) {
  try {
    const result = await listSessionAnticheatSummary({
      sessionId: Number(req.params.sessionId),
      user: req.user
    });
    return successResponse(res, result, "Anticheat summary fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  reportTabSwitch,
  listAnticheat
};
