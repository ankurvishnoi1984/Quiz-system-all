const {
  Question,
  ParticipantQuestionAssignment
} = require("../models");
const {
  isAdvancedBuilderSession,
  resolveQuestionsPerParticipant,
  shuffleArray
} = require("../utils/advancedBuilder");

async function loadEligiblePoolQuestionIds(session) {
  const where = { session_id: session.session_id };
  const mode = String(session.advanced_selection_mode || "random_all");
  if (mode === "random_from_selected") {
    where.pool_eligible = true;
  }

  const rows = await Question.findAll({
    where,
    attributes: ["question_id"],
    order: [
      ["display_order", "ASC"],
      ["question_id", "ASC"]
    ]
  });
  return rows.map((row) => Number(row.question_id));
}

async function getAssignedQuestionIds(participantId) {
  const rows = await ParticipantQuestionAssignment.findAll({
    where: { participant_id: Number(participantId) },
    attributes: ["question_id", "display_order"],
    order: [
      ["display_order", "ASC"],
      ["assignment_id", "ASC"]
    ]
  });
  return rows.map((row) => Number(row.question_id));
}

/** Question id for this participant at host slot display_order (1..K), or null. */
async function getAssignedQuestionIdForSlot(participantId, slot) {
  const slotNum = Number(slot);
  if (!Number.isInteger(slotNum) || slotNum < 1) return null;
  const row = await ParticipantQuestionAssignment.findOne({
    where: {
      participant_id: Number(participantId),
      display_order: slotNum
    },
    attributes: ["question_id"]
  });
  return row ? Number(row.question_id) : null;
}

/**
 * Persist a random K-question assignment for Advanced sessions (once per participant).
 */
async function assignAdvancedQuestionsToParticipant(session, participant) {
  if (!isAdvancedBuilderSession(session) || !participant?.participant_id) {
    return [];
  }

  const existing = await getAssignedQuestionIds(participant.participant_id);
  if (existing.length) return existing;

  const poolIds = await loadEligiblePoolQuestionIds(session);
  const k = resolveQuestionsPerParticipant(session, poolIds.length);
  if (!k) {
    const error = new Error(
      "Advanced session requires questions_per_participant (K) before participants can join"
    );
    error.statusCode = 400;
    throw error;
  }
  if (poolIds.length < k) {
    const error = new Error(
      `Not enough eligible questions for this Advanced session (need ${k}, have ${poolIds.length})`
    );
    error.statusCode = 400;
    throw error;
  }

  const picked = shuffleArray(poolIds).slice(0, k);
  const rows = picked.map((questionId, idx) => ({
    session_id: session.session_id,
    participant_id: participant.participant_id,
    question_id: questionId,
    display_order: idx + 1
  }));

  try {
    await ParticipantQuestionAssignment.bulkCreate(rows);
  } catch (err) {
    // Concurrent join race — return whatever was persisted.
    const raced = await getAssignedQuestionIds(participant.participant_id);
    if (raced.length) return raced;
    throw err;
  }

  return picked;
}

async function participantCanAccessAssignedQuestion(participant, question, { activeSlot } = {}) {
  if (!participant?.participant_id || !question?.question_id) return false;
  const where = {
    participant_id: Number(participant.participant_id),
    question_id: Number(question.question_id)
  };
  if (activeSlot != null) {
    const slotNum = Number(activeSlot);
    if (!Number.isInteger(slotNum) || slotNum < 1) return false;
    where.display_order = slotNum;
  }
  const row = await ParticipantQuestionAssignment.findOne({
    where,
    attributes: ["assignment_id"]
  });
  return Boolean(row);
}

async function assertAdvancedSessionReadyToStart(session) {
  if (!isAdvancedBuilderSession(session)) return;

  const mode = String(session.advanced_selection_mode || "random_all");
  const where = { session_id: session.session_id };
  if (mode === "random_from_selected") {
    where.pool_eligible = true;
  }
  const poolCount = await Question.count({ where });
  const k = Number(session.questions_per_participant);
  if (!Number.isFinite(k) || k < 1) {
    const error = new Error("Set questions per participant (K) before going live");
    error.statusCode = 400;
    throw error;
  }
  if (poolCount < k) {
    const error = new Error(
      mode === "random_from_selected"
        ? `Mark at least ${k} eligible questions in the pool (currently ${poolCount})`
        : `Add at least ${k} questions to the pool (currently ${poolCount})`
    );
    error.statusCode = 400;
    throw error;
  }
}

/**
 * Host Present / Live: which questions each participant was assigned (Advanced).
 */
async function listSessionQuestionAssignments(sessionId) {
  const { Participant, Question: QuestionModel } = require("../models");
  const rows = await ParticipantQuestionAssignment.findAll({
    where: { session_id: Number(sessionId) },
    include: [
      {
        model: Participant,
        attributes: ["participant_id", "nickname", "email", "is_anonymous", "score"],
        required: true
      },
      {
        model: QuestionModel,
        attributes: ["question_id", "question_text", "display_order"],
        required: true
      }
    ],
    order: [
      ["participant_id", "ASC"],
      ["display_order", "ASC"],
      ["assignment_id", "ASC"]
    ]
  });

  const byParticipant = new Map();
  for (const row of rows) {
    const participant = row.Participant || row.participant;
    const question = row.Question || row.question;
    const pid = Number(row.participant_id);
    if (!byParticipant.has(pid)) {
      const nickname = String(participant?.nickname || "").trim();
      const email = String(participant?.email || "").trim();
      byParticipant.set(pid, {
        participant_id: pid,
        nickname: nickname || null,
        display_name:
          nickname || email || (participant?.is_anonymous ? "Anonymous" : `Participant ${pid}`),
        score: Number(participant?.score || 0),
        questions_assigned: 0,
        questions: []
      });
    }
    const entry = byParticipant.get(pid);
    entry.questions_assigned += 1;
    entry.questions.push({
      question_id: Number(row.question_id),
      question_text: question?.question_text || "Untitled question",
      display_order: Number(row.display_order) || entry.questions.length + 1
    });
  }

  return Array.from(byParticipant.values()).sort((a, b) =>
    String(a.display_name).localeCompare(String(b.display_name), undefined, {
      sensitivity: "base"
    })
  );
}

module.exports = {
  loadEligiblePoolQuestionIds,
  getAssignedQuestionIds,
  getAssignedQuestionIdForSlot,
  assignAdvancedQuestionsToParticipant,
  participantCanAccessAssignedQuestion,
  assertAdvancedSessionReadyToStart,
  listSessionQuestionAssignments
};
