const { successResponse, errorResponse } = require("../utils/response");
const { Participant, Session } = require("../models");
const {
  assertNameEmailSessionStateAllowed,
  getParticipantSessionState,
  refreshParticipantAccessToken,
  saveParticipantSessionState
} = require("../services/participant.service");
const { touchSessionActivity } = require("../services/session.service");

async function getMySessionState(req, res) {
  try {
    await assertNameEmailSessionStateAllowed(req.participant.participant_id);
    const sessionState = await getParticipantSessionState(req.participant.participant_id);
    return successResponse(res, { session_state: sessionState }, "Participant session state loaded", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function saveMySessionState(req, res) {
  try {
    await assertNameEmailSessionStateAllowed(req.participant.participant_id);
    const sessionState = await saveParticipantSessionState(
      req.participant.participant_id,
      req.body?.session_state
    );
    return successResponse(res, { session_state: sessionState }, "Participant session state saved", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function pingActivity(req, res) {
  try {
    const session = await Session.findByPk(req.participant.session_id);
    if (!session || (session.status !== "live" && session.status !== "paused")) {
      return errorResponse(res, "Session is not active", 400);
    }

    const lastActivityAt = await touchSessionActivity(session.session_id);
    await Participant.update(
      { last_active_at: new Date() },
      { where: { participant_id: req.participant.participant_id } }
    );

    return successResponse(
      res,
      { last_activity_at: lastActivityAt },
      "Session activity recorded",
      200
    );
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function refresh(req, res) {
  try {
    const refreshToken = req.body?.refresh_token;

    if (!refreshToken) {
      return errorResponse(res, "refresh_token is required", 400);
    }

    const result = await refreshParticipantAccessToken(refreshToken);
    return successResponse(res, result, "Access token refreshed", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

async function customerMatch(req, res) {
  try {
    const { verifyCustomerMatch } = require("../services/customer-match.service");
    const { getSessionByCode } = require("../services/session.service");
    const { getSessionCustomerMatchConfig } = require("../utils/customerMatch");
    const email = String(req.query.email || "").trim();
    const sessionCode = String(
      req.query.session_code || req.query.code || ""
    ).trim();

    if (!email) {
      return errorResponse(res, "email is required", 400);
    }

    if (sessionCode) {
      const session = await getSessionByCode(sessionCode);
      if (!session?.customer_match_enabled) {
        return errorResponse(res, "Customer match is not enabled for this session", 400);
      }
      const config = getSessionCustomerMatchConfig(session);
      if (!config) {
        return errorResponse(
          res,
          "Customer match is enabled for this session but WC code and zones are not configured",
          503
        );
      }
      const result = await verifyCustomerMatch({
        email,
        wcCode: config.wcCode,
        zones: config.zones,
      });
      return successResponse(res, result, "Customer match checked", 200);
    }

    // Legacy/debug path: wc_code + zone (single, comma-separated, or repeated)
    const wcCode = String(req.query.wc_code || req.query.wcCode || "").trim();
    const zoneParam = req.query.zone;
    const zones =
      Array.isArray(zoneParam)
        ? zoneParam
        : zoneParam != null
          ? String(zoneParam)
          : "";
    const result = await verifyCustomerMatch({ email, wcCode, zones });
    return successResponse(res, result, "Customer match checked", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  getMySessionState,
  saveMySessionState,
  pingActivity,
  refresh,
  customerMatch
};
