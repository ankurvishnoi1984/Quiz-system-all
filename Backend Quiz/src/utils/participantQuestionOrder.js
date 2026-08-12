const { Op } = require("sequelize");
const { Question, Participant } = require("../models");
const { isSessionRandomQuestionOrderEnabled } = require("./sessionFlags");
const { normalizeParticipantSessionState } = require("./participantSessionState");

function shuffleIds(ids = []) {
  const arr = [...new Set(ids.map(Number).filter((id) => Number.isFinite(id) && id > 0))];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sortQuestionsByOrder(questions = [], orderIds = []) {
  if (!Array.isArray(questions) || !orderIds?.length) return questions;
  const rank = new Map(orderIds.map((id, idx) => [Number(id), idx]));
  return [...questions].sort((a, b) => {
    const idA = Number(a.question_id ?? a.id);
    const idB = Number(b.question_id ?? b.id);
    const ra = rank.has(idA) ? rank.get(idA) : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(idB) ? rank.get(idB) : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return Number(a.display_order ?? 0) - Number(b.display_order ?? 0);
  });
}

async function loadVisibleQuestionIds(session, participant) {
  const where = { session_id: session.session_id };
  if (participant?.assigned_set_id) {
    where[Op.and] = [
      {
        [Op.or]: [
          { set_id: { [Op.is]: null } },
          { set_id: Number(participant.assigned_set_id) }
        ]
      }
    ];
  } else {
    const setQuestionCount = await Question.count({
      where: { session_id: session.session_id, set_id: { [Op.ne]: null } }
    });
    if (setQuestionCount > 0) {
      where.set_id = { [Op.is]: null };
    }
  }

  const rows = await Question.findAll({
    where,
    attributes: ["question_id"],
    order: [
      ["display_order", "ASC"],
      ["question_id", "ASC"]
    ]
  });
  return rows.map((q) => Number(q.question_id));
}

/**
 * Persist a stable shuffled question sequence on the participant.
 * New questions are shuffled onto the end so in-progress attempts stay stable.
 */
async function assignRandomQuestionOrderToParticipant(session, participant) {
  if (!isSessionRandomQuestionOrderEnabled(session) || !participant?.participant_id) {
    return [];
  }

  const ids = await loadVisibleQuestionIds(session, participant);
  if (!ids.length) return [];

  const row = await Participant.findByPk(participant.participant_id);
  if (!row) return shuffleIds(ids);

  const state = normalizeParticipantSessionState(row.session_state);
  const idSet = new Set(ids);
  let order = (state.quizQuestionOrder || []).map(Number).filter((id) => idSet.has(id));
  const missing = ids.filter((id) => !order.includes(id));
  if (!order.length) {
    order = shuffleIds(ids);
  } else if (missing.length) {
    order = [...order, ...shuffleIds(missing)];
  }

  if ((state.quizQuestionOrder || []).join(",") !== order.join(",")) {
    const nextState = { ...state, quizQuestionOrder: order };
    await row.update({ session_state: nextState });
    participant.session_state = nextState;
  }

  return order;
}

module.exports = {
  shuffleIds,
  sortQuestionsByOrder,
  assignRandomQuestionOrderToParticipant
};
