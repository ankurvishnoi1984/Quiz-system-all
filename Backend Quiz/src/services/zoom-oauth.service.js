const crypto = require("crypto");
const { getZoomConfig } = require("../config/zoom");
const { ZoomConnection } = require("../models");

function buildAuthorizeUrl({ state } = {}) {
  const config = getZoomConfig();
  if (!config.configured) {
    const error = new Error("Zoom OAuth is not configured. Set ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and ZOOM_REDIRECT_URI.");
    error.statusCode = 503;
    error.code = "ZOOM_NOT_CONFIGURED";
    throw error;
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri
  });
  if (state) params.set("state", state);

  return `${config.oauthAuthorizeUrl}?${params.toString()}`;
}

function basicAuthHeader() {
  const config = getZoomConfig();
  const raw = `${config.clientId}:${config.clientSecret}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

async function exchangeCodeForTokens(code) {
  const config = getZoomConfig();
  if (!config.configured) {
    const error = new Error("Zoom OAuth is not configured");
    error.statusCode = 503;
    error.code = "ZOOM_NOT_CONFIGURED";
    throw error;
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: String(code),
    redirect_uri: config.redirectUri
  });

  const response = await fetch(config.oauthTokenUrl, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.reason || payload?.error || "Zoom token exchange failed");
    error.statusCode = 502;
    throw error;
  }

  return payload;
}

async function refreshAccessToken(refreshToken) {
  const config = getZoomConfig();
  if (!config.configured) {
    const error = new Error("Zoom OAuth is not configured");
    error.statusCode = 503;
    error.code = "ZOOM_NOT_CONFIGURED";
    throw error;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: String(refreshToken)
  });

  const response = await fetch(config.oauthTokenUrl, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.reason || payload?.error || "Zoom token refresh failed");
    error.statusCode = 502;
    throw error;
  }

  return payload;
}

async function fetchZoomUser(accessToken) {
  const config = getZoomConfig();
  const response = await fetch(`${config.apiBaseUrl}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || "Failed to fetch Zoom user");
    error.statusCode = 502;
    throw error;
  }
  return payload;
}

function tokenExpiryDate(expiresInSeconds) {
  const seconds = Number(expiresInSeconds) || 3600;
  return new Date(Date.now() + seconds * 1000);
}

async function upsertConnectionForUser({ userId, tokenPayload, zoomUser }) {
  const now = new Date();
  const values = {
    user_id: userId,
    zoom_user_id: String(zoomUser.id || zoomUser.user_id || ""),
    zoom_account_id: zoomUser.account_id ? String(zoomUser.account_id) : null,
    zoom_email: zoomUser.email || null,
    access_token: tokenPayload.access_token || null,
    refresh_token: tokenPayload.refresh_token || null,
    token_expires_at: tokenExpiryDate(tokenPayload.expires_in),
    scopes: tokenPayload.scope || null,
    connected_at: now,
    revoked_at: null
  };

  if (!values.zoom_user_id) {
    const error = new Error("Zoom user id missing from profile response");
    error.statusCode = 502;
    throw error;
  }

  const existing = await ZoomConnection.findOne({ where: { user_id: userId } });
  if (existing) {
    await existing.update(values);
    return existing;
  }
  return ZoomConnection.create(values);
}

async function getConnectionForUser(userId) {
  return ZoomConnection.findOne({
    where: { user_id: userId, revoked_at: null }
  });
}

async function revokeConnectionForUser(userId) {
  const row = await ZoomConnection.findOne({ where: { user_id: userId } });
  if (!row) return null;
  await row.update({
    access_token: null,
    refresh_token: null,
    revoked_at: new Date()
  });
  return row;
}

function createOAuthState(userId) {
  const nonce = crypto.randomBytes(16).toString("hex");
  return `${userId}.${nonce}`;
}

function parseOAuthState(state) {
  const raw = String(state || "");
  const userId = Number(raw.split(".")[0]);
  if (!Number.isFinite(userId) || userId <= 0) {
    const error = new Error("Invalid OAuth state");
    error.statusCode = 400;
    throw error;
  }
  return { userId };
}

module.exports = {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchZoomUser,
  upsertConnectionForUser,
  getConnectionForUser,
  revokeConnectionForUser,
  createOAuthState,
  parseOAuthState
};
