const { Op } = require("sequelize");
const { Session } = require("../models");
const { buildAutoEndAt } = require("../utils/sessionDateTime");
const { endSessionBySystem } = require("./session.service");
const { isSessionRandomQuestionOrderEnabled } = require("../utils/sessionFlags");
const {
  notifySessionUpdate,
  notifySessionSettings,
  notifyQuestionLeaderboardVisibility
} = require("./websocket.service");

const AUTO_END_POLL_MS = Number(process.env.SESSION_AUTO_END_POLL_MS) || 30000;

let pollTimer = null;

async function processDueAutoEndSessions() {
  const sessions = await Session.findAll({
    where: {
      auto_end_enabled: true,
      status: { [Op.in]: ["live", "paused"] },
      auto_end_date: { [Op.ne]: null },
      auto_end_time: { [Op.ne]: null }
    }
  });

  const now = Date.now();
  let endedCount = 0;

  for (const session of sessions) {
    const endAt = buildAutoEndAt(session);
    if (!endAt || Number.isNaN(endAt.getTime()) || endAt.getTime() > now) {
      continue;
    }

    const ended = await endSessionBySystem(session, endAt);
    if (!ended?.session_code) continue;

    endedCount += 1;

    try {
      notifySessionUpdate(ended.session_code, ended.status);
      notifySessionSettings(ended.session_code, {
        leaderboard_enabled: ended.leaderboard_enabled,
        survey_results_enabled: ended.survey_results_enabled,
        show_participant_count: ended.show_participant_count,
        show_question_leaderboard: ended.show_question_leaderboard,
        participant_navigation_enabled: ended.participant_navigation_enabled !== false,
        quiz_total_time_minutes: ended.quiz_total_time_minutes ?? null,
        random_question_order_enabled: isSessionRandomQuestionOrderEnabled(ended),
        allow_late_join: Boolean(ended.allow_late_join)
      });
      for (const questionId of ended.hiddenQuestionResultIds || []) {
        notifyQuestionLeaderboardVisibility(ended.session_code, questionId, false);
      }
    } catch (error) {
      console.warn("[auto-end] Failed to notify session end:", error.message);
    }
  }

  return endedCount;
}

function startSessionAutoEndScheduler() {
  if (pollTimer) return;

  pollTimer = setInterval(() => {
    processDueAutoEndSessions().catch((error) => {
      console.warn("[auto-end] Scheduler tick failed:", error.message);
    });
  }, AUTO_END_POLL_MS);

  if (typeof pollTimer.unref === "function") {
    pollTimer.unref();
  }

  processDueAutoEndSessions().catch((error) => {
    console.warn("[auto-end] Initial scheduler run failed:", error.message);
  });

  console.log(`[auto-end] Scheduler started (every ${AUTO_END_POLL_MS}ms)`);
}

module.exports = {
  processDueAutoEndSessions,
  startSessionAutoEndScheduler
};
