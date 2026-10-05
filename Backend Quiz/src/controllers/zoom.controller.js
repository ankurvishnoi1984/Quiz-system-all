const crypto = require("crypto");
const { getZoomConfig, isZoomAppEnabled } = require("../config/zoom");
const { successResponse, errorResponse } = require("../utils/response");
const {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  fetchZoomUser,
  upsertConnectionForUser,
  getConnectionForUser,
  revokeConnectionForUser,
  createOAuthState,
  parseOAuthState
} = require("../services/zoom-oauth.service");
const {
  getMeetingSessionBinding,
  bindMeetingToSession,
  unbindMeeting,
  pauseSessionForMeetingEnded,
  joinViaZoomMeeting
} = require("../services/zoom-meeting.service");
const { getFrontendPublicUrl } = require("../config/publicAppUrl");

function statusPayload() {
  const config = getZoomConfig();
  return {
    enabled: isZoomAppEnabled(),
    configured: config.configured,
    oauth_ready: config.configured,
    has_webhook_secret: Boolean(config.webhookSecret)
  };
}

async function getStatus(req, res) {
  try {
    const base = statusPayload();
    let connection = null;
    if (req.user?.user_id) {
      const row = await getConnectionForUser(req.user.user_id);
      if (row) {
        connection = {
          zoom_user_id: row.zoom_user_id,
          zoom_email: row.zoom_email,
          connected_at: row.connected_at,
          token_expires_at: row.token_expires_at
        };
      }
    }
    return successResponse(res, { ...base, connection }, "Zoom status", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500, null, err.code || null);
  }
}

async function startOAuth(req, res) {
  try {
    if (!isZoomAppEnabled()) {
      return errorResponse(res, "Zoom app integration is disabled", 503, null, "ZOOM_DISABLED");
    }
    const state = createOAuthState(req.user.user_id);
    const authorize_url = buildAuthorizeUrl({ state });
    return successResponse(res, { authorize_url, state }, "Zoom OAuth URL created", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500, null, err.code || null);
  }
}

async function oauthCallback(req, res) {
  const frontendBase = getFrontendPublicUrl(req).replace(/\/+$/, "");
  const redirectSuccess = `${frontendBase}/zoom/app?oauth=connected`;
  const redirectError = `${frontendBase}/zoom/app?oauth=error`;

  try {
    if (!isZoomAppEnabled()) {
      return res.redirect(`${redirectError}&reason=disabled`);
    }

    const code = req.query.code;
    const state = req.query.state;
    if (!code) {
      return res.redirect(`${redirectError}&reason=missing_code`);
    }

    const { userId } = parseOAuthState(state);
    const tokenPayload = await exchangeCodeForTokens(code);
    const zoomUser = await fetchZoomUser(tokenPayload.access_token);
    await upsertConnectionForUser({
      userId,
      tokenPayload,
      zoomUser
    });

    return res.redirect(redirectSuccess);
  } catch (err) {
    const reason = encodeURIComponent(err.code || err.message || "oauth_failed");
    return res.redirect(`${redirectError}&reason=${reason}`);
  }
}

async function disconnect(req, res) {
  try {
    await revokeConnectionForUser(req.user.user_id);
    return successResponse(res, { disconnected: true }, "Zoom disconnected", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500, null, err.code || null);
  }
}

async function getMeetingSession(req, res) {
  try {
    const meetingUuid = req.query.meeting_uuid || req.params.meetingUuid;
    const binding = await getMeetingSessionBinding(meetingUuid);
    return successResponse(
      res,
      { binding, bound: Boolean(binding) },
      binding ? "Meeting session found" : "No session bound to this meeting",
      200
    );
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500, null, err.code || null);
  }
}

async function putMeetingSession(req, res) {
  try {
    const meetingUuid = req.body?.meeting_uuid || req.query.meeting_uuid;
    const binding = await bindMeetingToSession({
      meetingUuid,
      meetingId: req.body?.meeting_id || null,
      sessionId: req.body?.session_id,
      user: req.user
    });
    return successResponse(res, { binding }, "Zoom meeting bound to session", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500, null, err.code || null);
  }
}

async function deleteMeetingSession(req, res) {
  try {
    const meetingUuid = req.body?.meeting_uuid || req.query.meeting_uuid;
    const binding = await unbindMeeting({
      meetingUuid,
      user: req.user
    });
    return successResponse(res, { binding }, "Zoom meeting unbound", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500, null, err.code || null);
  }
}

async function joinMeetingSession(req, res) {
  try {
    const data = await joinViaZoomMeeting({
      meetingUuid: req.body?.meeting_uuid,
      zoomUserId: req.body?.zoom_user_id || null,
      displayName: req.body?.display_name || null,
      deviceFingerprint: req.body?.device_fingerprint || null,
      joinPayload: {
        nickname: req.body?.nickname,
        email: req.body?.email,
        mobile: req.body?.mobile,
        otp_token: req.body?.otp_token,
        avatar_url: req.body?.avatar_url,
        is_anonymous: req.body?.is_anonymous
      }
    });
    return successResponse(res, data, "Joined Zoom-linked session", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500, null, err.code || null);
  }
}

function verifyZoomWebhook(req) {
  const config = getZoomConfig();
  if (!config.webhookSecret) return true;

  const signature = req.headers["x-zm-signature"] || req.headers["x-zoom-signature"];
  const timestamp = req.headers["x-zm-request-timestamp"] || "";
  if (!signature || !timestamp) return false;

  const message = `v0:${timestamp}:${typeof req.body === "string" ? req.body : JSON.stringify(req.body)}`;
  const hash = crypto.createHmac("sha256", config.webhookSecret).update(message).digest("hex");
  const expected = `v0=${hash}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(String(signature)), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function handleWebhook(req, res) {
  try {
    const body = req.body || {};

    // Zoom URL validation challenge
    if (body.event === "endpoint.url_validation" && body.payload?.plainToken) {
      const config = getZoomConfig();
      const hashForValidate = crypto
        .createHmac("sha256", config.webhookSecret || "")
        .update(body.payload.plainToken)
        .digest("hex");
      return res.status(200).json({
        plainToken: body.payload.plainToken,
        encryptedToken: hashForValidate
      });
    }

    if (getZoomConfig().webhookSecret && !verifyZoomWebhook(req)) {
      return errorResponse(res, "Invalid Zoom webhook signature", 401);
    }

    const event = body.event;
    const obj = body.payload?.object || {};
    const meetingUuid = obj.uuid || obj.meeting_uuid || null;

    if ((event === "meeting.ended" || event === "meeting.ended_event") && meetingUuid) {
      await pauseSessionForMeetingEnded(meetingUuid);
    }

    return successResponse(res, { received: true, event: event || null }, "Webhook processed", 200);
  } catch (err) {
    return errorResponse(res, err.message, err.statusCode || 500, null, err.code || null);
  }
}

module.exports = {
  getStatus,
  startOAuth,
  oauthCallback,
  disconnect,
  getMeetingSession,
  putMeetingSession,
  deleteMeetingSession,
  joinMeetingSession,
  handleWebhook
};
