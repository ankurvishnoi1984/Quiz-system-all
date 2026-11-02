/**
 * Zoom Apps / Marketplace integration settings.
 * Credentials are optional until a Zoom Developer app is registered.
 * When missing, status endpoints report configured=false and OAuth routes return 503.
 */

function parseFlag(value, defaultValue = false) {
  if (value == null || value === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (["0", "false", "off", "no", "disabled"].includes(normalized)) return false;
  if (["1", "true", "on", "yes", "enabled"].includes(normalized)) return true;
  return defaultValue;
}

/** Granular scopes for GET /users/me after Connect Zoom. Override with ZOOM_OAUTH_SCOPES. */
const DEFAULT_OAUTH_SCOPES = "user:read:user";

function getOAuthScopes() {
  const raw = (process.env.ZOOM_OAUTH_SCOPES || DEFAULT_OAUTH_SCOPES).trim();
  // Normalize commas to spaces; collapse whitespace for Zoom authorize URL.
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

function getZoomConfig() {
  const clientId = (process.env.ZOOM_CLIENT_ID || "").trim();
  const clientSecret = (process.env.ZOOM_CLIENT_SECRET || "").trim();
  const redirectUri = (process.env.ZOOM_REDIRECT_URI || "").trim();
  const webhookSecret = (process.env.ZOOM_WEBHOOK_SECRET || "").trim();
  const enabled = parseFlag(process.env.ZOOM_APP_ENABLED, true);
  const oauthScopes = getOAuthScopes();

  return {
    enabled,
    clientId,
    clientSecret,
    redirectUri,
    webhookSecret,
    oauthScopes,
    oauthAuthorizeUrl: "https://zoom.us/oauth/authorize",
    oauthTokenUrl: "https://zoom.us/oauth/token",
    apiBaseUrl: "https://api.zoom.us/v2",
    configured: Boolean(clientId && clientSecret && redirectUri)
  };
}

function isZoomAppEnabled() {
  const { enabled } = getZoomConfig();
  return enabled;
}

module.exports = {
  getZoomConfig,
  isZoomAppEnabled,
  parseFlag
};
