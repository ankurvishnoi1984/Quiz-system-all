const { Op } = require("sequelize");
const { ZoomMeetingSession, ZoomParticipantMap, Session, Participant } = require("../models");
const { assertSessionWriteAccess, getSessionOrThrow, joinSession } = require("./session.service");

function normalizeMeetingUuid(value) {
  const uuid = String(value || "").trim();
  if (!uuid) {
    const error = new Error("meeting_uuid is required");
    error.statusCode = 400;
    throw error;
  }
  return uuid.slice(0, 128);
}

function publicSessionSummary(session) {
  if (!session) return null;
  const plain = typeof session.toJSON === "function" ? session.toJSON() : { ...session };
  return {
    session_id: plain.session_id,
    session_code: plain.session_code,
    title: plain.title,
    status: plain.status,
    join_type: plain.join_type,
    dept_id: plain.dept_id
  };
}

function publicBinding(row, session) {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    meeting_uuid: plain.meeting_uuid,
    meeting_id: plain.meeting_id,
    session_id: plain.session_id,
    status: plain.status,
    bound_by_user_id: plain.bound_by_user_id,
    bound_at: plain.bound_at,
    ended_at: plain.ended_at,
    session: publicSessionSummary(session)
  };
}

async function getMeetingSessionBinding(meetingUuid) {
  const uuid = normalizeMeetingUuid(meetingUuid);
  const row = await ZoomMeetingSession.findOne({
    where: {
      meeting_uuid: uuid,
      status: { [Op.ne]: "ended" }
    }
  });
  if (!row) return null;

  const session = await Session.findByPk(row.session_id);
  return publicBinding(row, session);
}

async function bindMeetingToSession({
  meetingUuid,
  meetingId = null,
  sessionId,
  user
}) {
  const uuid = normalizeMeetingUuid(meetingUuid);
  const sid = Number(sessionId);
  if (!Number.isFinite(sid) || sid <= 0) {
    const error = new Error("session_id is required");
    error.statusCode = 400;
    throw error;
  }

  const session = await getSessionOrThrow(sid);
  assertSessionWriteAccess(user, session);

  const existing = await ZoomMeetingSession.findOne({ where: { meeting_uuid: uuid } });
  if (existing && existing.status !== "ended" && Number(existing.session_id) !== sid) {
    const error = new Error("This Zoom meeting is already bound to another quiz session");
    error.statusCode = 409;
    throw error;
  }

  const now = new Date();
  if (existing) {
    await existing.update({
      meeting_id: meetingId ? String(meetingId).slice(0, 64) : existing.meeting_id,
      session_id: sid,
      bound_by_user_id: user.user_id,
      status: "active",
      bound_at: now,
      ended_at: null
    });
    return publicBinding(existing, session);
  }

  const row = await ZoomMeetingSession.create({
    meeting_uuid: uuid,
    meeting_id: meetingId ? String(meetingId).slice(0, 64) : null,
    session_id: sid,
    bound_by_user_id: user.user_id,
    status: "active",
    bound_at: now
  });

  return publicBinding(row, session);
}

async function unbindMeeting({ meetingUuid, user }) {
  const uuid = normalizeMeetingUuid(meetingUuid);
  const row = await ZoomMeetingSession.findOne({ where: { meeting_uuid: uuid } });
  if (!row) {
    const error = new Error("No Zoom meeting binding found");
    error.statusCode = 404;
    throw error;
  }

  const session = await getSessionOrThrow(row.session_id);
  assertSessionWriteAccess(user, session);

  await row.update({ status: "ended", ended_at: new Date() });
  return publicBinding(row, session);
}

async function pauseSessionForMeetingEnded(meetingUuid) {
  const uuid = normalizeMeetingUuid(meetingUuid);
  const row = await ZoomMeetingSession.findOne({
    where: {
      meeting_uuid: uuid,
      status: { [Op.in]: ["active", "paused"] }
    }
  });
  if (!row) return null;

  const session = await Session.findByPk(row.session_id);
  if (session && session.status === "live") {
    session.status = "paused";
    session.last_activity_at = new Date();
    await session.save();
    try {
      const { notifySessionUpdate } = require("./websocket.service");
      notifySessionUpdate(session.session_code, session);
    } catch {
      // Realtime notify is best-effort for webhook-driven pauses.
    }
  }

  await row.update({ status: "paused", ended_at: new Date() });
  return row;
}

async function joinViaZoomMeeting({
  meetingUuid,
  zoomUserId = null,
  displayName = null,
  deviceFingerprint = null,
  joinPayload = {}
}) {
  const binding = await getMeetingSessionBinding(meetingUuid);
  if (!binding?.session?.session_code) {
    const error = new Error("No quiz session is linked to this Zoom meeting yet. Ask the host to open the Quiz app and pick a session.");
    error.statusCode = 404;
    error.code = "ZOOM_MEETING_UNBOUND";
    throw error;
  }

  const session = binding.session;
  const nickname =
    String(joinPayload.nickname || displayName || "").trim().slice(0, 80) || null;

  let mappedParticipant = null;
  if (zoomUserId) {
    const mapRow = await ZoomParticipantMap.findOne({
      where: {
        meeting_uuid: binding.meeting_uuid,
        zoom_user_id: String(zoomUserId)
      }
    });
    if (mapRow) {
      mappedParticipant = await Participant.findByPk(mapRow.participant_id);
    }
  }

  if (mappedParticipant && !mappedParticipant.deleted_at) {
    const result = await joinSession({
      code: session.session_code,
      payload: {
        ...joinPayload,
        nickname: nickname || mappedParticipant.nickname,
        device_fingerprint: deviceFingerprint || joinPayload.device_fingerprint,
        email: joinPayload.email || mappedParticipant.email,
        mobile: joinPayload.mobile || mappedParticipant.mobile
      }
    });
    return {
      ...result,
      zoom_binding: binding,
      reused_zoom_identity: true
    };
  }

  const payload = {
    ...joinPayload,
    nickname: nickname || joinPayload.nickname,
    device_fingerprint:
      deviceFingerprint ||
      joinPayload.device_fingerprint ||
      (zoomUserId ? `zoom:${zoomUserId}` : undefined)
  };

  // Anonymous sessions: invent a stable-ish nickname from Zoom display name when missing.
  if (!payload.nickname && session.join_type === "anonymous") {
    payload.nickname = displayName ? String(displayName).slice(0, 80) : `Guest-${String(Date.now()).slice(-4)}`;
  }

  const result = await joinSession({
    code: session.session_code,
    payload
  });

  if (zoomUserId && result?.participant?.participant_id) {
    await ZoomParticipantMap.upsert({
      meeting_uuid: binding.meeting_uuid,
      zoom_user_id: String(zoomUserId),
      participant_id: result.participant.participant_id,
      session_id: session.session_id,
      display_name: displayName ? String(displayName).slice(0, 120) : null
    });
  }

  return {
    ...result,
    zoom_binding: binding,
    reused_zoom_identity: false
  };
}

module.exports = {
  getMeetingSessionBinding,
  bindMeetingToSession,
  unbindMeeting,
  pauseSessionForMeetingEnded,
  joinViaZoomMeeting,
  publicBinding,
  normalizeMeetingUuid
};
