const { Participant, Session } = require("../models");
const { notifyParticipantAnticheat } = require("./websocket.service");

const MAX_STORED_EVENTS = 50;

function getAnticheatState(participant) {
  const state =
    participant?.session_state && typeof participant.session_state === "object"
      ? participant.session_state
      : {};
  const anticheat =
    state.anticheat && typeof state.anticheat === "object" ? state.anticheat : {};
  return {
    tab_switch_count: Number(anticheat.tab_switch_count) || 0,
    last_tab_switch_at: anticheat.last_tab_switch_at || null,
    events: Array.isArray(anticheat.events) ? anticheat.events : []
  };
}

async function recordTabSwitchViolation({ participant, sessionId = null, questionId = null }) {
  if (
    sessionId != null &&
    Number(sessionId) !== Number(participant.session_id)
  ) {
    const error = new Error("Participant does not belong to this session");
    error.statusCode = 403;
    throw error;
  }

  const session = await Session.findByPk(participant.session_id, {
    attributes: ["session_id", "session_code", "tab_switch_detection_enabled", "status"]
  });
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }
  if (!session.tab_switch_detection_enabled) {
    return { recorded: false, reason: "disabled", tab_switch_count: 0, last_tab_switch_at: null, events: [] };
  }
  if (!["live", "paused"].includes(session.status)) {
    return {
      recorded: false,
      reason: "session_not_live",
      tab_switch_count: 0,
      last_tab_switch_at: null,
      events: []
    };
  }

  const row = await Participant.findByPk(participant.participant_id);
  if (!row) {
    const error = new Error("Participant not found");
    error.statusCode = 404;
    throw error;
  }

  const prev = getAnticheatState(row);
  const nowIso = new Date().toISOString();
  const event = {
    type: "tab_switch",
    at: nowIso,
    question_id: questionId != null ? Number(questionId) : null
  };
  const events = [...prev.events, event].slice(-MAX_STORED_EVENTS);
  const next = {
    tab_switch_count: prev.tab_switch_count + 1,
    last_tab_switch_at: nowIso,
    events
  };

  const baseState =
    row.session_state && typeof row.session_state === "object" ? { ...row.session_state } : {};
  baseState.anticheat = next;
  await row.update({ session_state: baseState });

  if (session.session_code) {
    notifyParticipantAnticheat(session.session_code, {
      participant_id: row.participant_id,
      nickname: row.nickname || null,
      tab_switch_count: next.tab_switch_count,
      last_tab_switch_at: next.last_tab_switch_at
    });
  }

  return { recorded: true, ...next };
}

async function listSessionAnticheatSummary({ sessionId, user }) {
  const { getSessionOrThrow, assertSessionWriteAccess } = require("./session.service");
  const session = await getSessionOrThrow(sessionId);
  assertSessionWriteAccess(user, session);

  const rows = await Participant.findAll({
    where: { session_id: session.session_id },
    attributes: ["participant_id", "nickname", "session_state"],
    order: [["participant_id", "ASC"]]
  });

  const participants = rows
    .map((row) => {
      const anticheat = getAnticheatState(row);
      if (!anticheat.tab_switch_count) return null;
      return {
        participant_id: row.participant_id,
        nickname: row.nickname || `Participant ${row.participant_id}`,
        tab_switch_count: anticheat.tab_switch_count,
        last_tab_switch_at: anticheat.last_tab_switch_at
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.tab_switch_count - a.tab_switch_count);

  return { participants };
}

module.exports = {
  recordTabSwitchViolation,
  listSessionAnticheatSummary,
  getAnticheatState
};
