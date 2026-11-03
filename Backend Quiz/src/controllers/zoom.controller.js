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

function requestOrigin(req) {
  if (!req) return "";
  const host = req.get("host") || "";
  if (!host) return "";
  const proto = (req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0].trim();
  return `${proto}://${host}`.replace(/\/+$/, "");
}

/**
 * True when FRONTEND_PUBLIC_URL is missing or equals the API host.
 * OAuth would then redirect to /zoom/app on the API → JSON "Route not found".
 */
function isFrontendPublicUrlMisconfigured(frontendBase, req) {
  const base = String(frontendBase || "").replace(/\/+$/, "");
  if (!base) return true;
  const apiOrigin = requestOrigin(req);
  if (apiOrigin && base.toLowerCase() === apiOrigin.toLowerCase()) return true;
  // Common mistake: SPA URL set to the API hostname
  try {
    const host = new URL(base).hostname.toLowerCase();
    if (host.includes("demoquizapi.") || /(^|\.)api\./i.test(host) || host.endsWith("quizapi.netcastservice.online")) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
}

function oauthMisconfigHtml({ success, reason }) {
  const title = success
    ? "Zoom connected — but redirect host is wrong"
    : "Zoom OAuth could not finish cleanly";
  const detail = reason
    ? `<p><strong>Detail:</strong> ${String(reason).replace(/</g, "&lt;")}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.5;color:#0f172a}
  code{background:#f1f5f9;padding:2px 6px;border-radius:4px}
  .box{border:1px solid #fecaca;background:#fef2f2;border-radius:12px;padding:1rem 1.25rem}
</style></head><body>
  <div class="box">
    <h1 style="font-size:1.25rem;margin:0 0 .5rem">${title}</h1>
    <p>The quiz API finished Zoom OAuth, but <code>FRONTEND_PUBLIC_URL</code> is missing or points at the <strong>API</strong> host.
    The browser then opens <code>/zoom/app</code> on the API and shows JSON <code>Route not found</code>.</p>
    ${detail}
    <p>On the API server <code>.env</code> set:</p>
    <p><code>FRONTEND_PUBLIC_URL=https://highq.netcastservice.online</code></p>
    <p>Restart the API. Marketplace <strong>Home URL</strong> must also be
    <code>https://highq.netcastservice.online/zoom/app</code> (not the API host).</p>
    <p>Then open <a href="https://highq.netcastservice.online/zoom/app?oauth=${success ? "connected" : "error"}">highq /zoom/app</a>
    or use Share → Zoom again.</p>
  </div>
</body></html>`;
}

/**
 * Cross-host handoff without HTTP Location.
 * IIS ARR often rewrites absolute Location hosts back to the API site, which turns
 * highq /zoom/app into demoquizapi /zoom/app → JSON "Route not found".
 */
function oauthHandoffHtml(targetUrl) {
  const safe = String(targetUrl || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "");
  const jsSafe = JSON.stringify(String(targetUrl || ""));
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<meta http-equiv="refresh" content="0;url=${safe}"/>
<title>Returning to quiz…</title>
<style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;line-height:1.5}</style>
</head><body>
  <p>Zoom sign-in finished. Opening the quiz app…</p>
  <p><a id="go" href="${safe}">Continue</a></p>
  <script>location.replace(${jsSafe});</script>
</body></html>`;
}

function statusPayload(req) {
  const config = getZoomConfig();
  const frontendPublicUrl = getFrontendPublicUrl(req).replace(/\/+$/, "") || null;
  return {
    enabled: isZoomAppEnabled(),
    configured: config.configured,
    oauth_ready: config.configured,
    has_webhook_secret: Boolean(config.webhookSecret),
    // Non-secret: helps operators match Marketplace scopes / redirect target
    oauth_scopes: config.oauthScopes || null,
    redirect_uri: config.redirectUri || null,
    frontend_public_url: frontendPublicUrl,
    frontend_public_url_ok: !isFrontendPublicUrlMisconfigured(frontendPublicUrl, req)
  };
}

async function getStatus(req, res) {
  try {
    const base = statusPayload(req);
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
  const misconfigured = isFrontendPublicUrlMisconfigured(frontendBase, req);

  const finishRedirect = (success, reason) => {
    if (misconfigured) {
      console.error(
        "[zoom-oauth] FRONTEND_PUBLIC_URL is missing or points at the API host (%s). Set it to the SPA origin (e.g. https://highq.netcastservice.online).",
        frontendBase || "(empty)"
      );
      return res
        .status(200)
        .type("html")
        .send(oauthMisconfigHtml({ success, reason: reason || null }));
    }
    const target = success
      ? `${frontendBase}/zoom/app?oauth=connected`
      : `${frontendBase}/zoom/app?oauth=error&reason=${encodeURIComponent(reason || "oauth_failed")}`;
    // Do not use res.redirect() here — ARR rewrites Location to the API host.
    return res.status(200).type("html").send(oauthHandoffHtml(target));
  };

  try {
    if (!isZoomAppEnabled()) {
      return finishRedirect(false, "disabled");
    }

    const code = req.query.code;
    const state = req.query.state;
    if (!code) {
      return finishRedirect(false, "missing_code");
    }

    const { userId } = parseOAuthState(state);
    const tokenPayload = await exchangeCodeForTokens(code);
    const zoomUser = await fetchZoomUser(tokenPayload.access_token);
    await upsertConnectionForUser({
      userId,
      tokenPayload,
      zoomUser
    });

    return finishRedirect(true);
  } catch (err) {
    return finishRedirect(false, err.code || err.message || "oauth_failed");
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
