const { successResponse, errorResponse } = require("../utils/response");
const {
  getSessionAdminDashboard,
  getAssignedSessionForAdmin,
  changeSessionAdminPassword
} = require("../services/session-admin.service");
const { activateAllQuestionsForSession } = require("../services/question.service");
const {
  notifyQuestionChange,
  notifySessionUpdate
} = require("../services/websocket.service");
const { Session } = require("../models");

function buildActivatedQuestionChangePayload(question) {
  return {
    question_id: question.question_id,
    is_live: true,
    live_activated_at: question.live_activated_at ?? null,
    time_limit_seconds: question.time_limit_seconds ?? null,
    submissions_closed: false,
    open_for_reattempt: false
  };
}

async function dashboard(req, res) {
  try {
    const data = await getSessionAdminDashboard({ user: req.user });
    return successResponse(res, data, "Session Admin dashboard fetched", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function changePassword(req, res) {
  try {
    const sessionId = Number(req.params.sessionId);
    if (Number.isNaN(sessionId)) {
      return errorResponse(res, "sessionId must be a number", 400);
    }
    const newPassword = req.body?.new_password ?? req.body?.newPassword;
    const result = await changeSessionAdminPassword({
      sessionId,
      actor: req.user,
      newPassword
    });
    return successResponse(res, result, "Session Admin password updated", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function activateAllQuestions(req, res) {
  try {
    const assigned = await getAssignedSessionForAdmin(req.user);
    const sessionId = Number(assigned.session_id);
    const result = await activateAllQuestionsForSession({
      sessionId,
      user: req.user
    });
    const questions = result?.questions || result || [];
    const startedAt = result?.started_at ?? null;
    const session = await Session.findByPk(sessionId, {
      attributes: ["session_code", "status", "started_at"]
    });
    if (session?.session_code) {
      for (const question of questions) {
        notifyQuestionChange(
          session.session_code,
          buildActivatedQuestionChangePayload(question)
        );
      }
      if (startedAt) {
        notifySessionUpdate(session.session_code, session.status, {
          started_at: startedAt
        });
      }
    }
    return successResponse(
      res,
      {
        questions,
        activated_count: questions.length,
        started_at: startedAt || session?.started_at || null
      },
      "All questions activated",
      200
    );
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  dashboard,
  changePassword,
  activateAllQuestions
};
