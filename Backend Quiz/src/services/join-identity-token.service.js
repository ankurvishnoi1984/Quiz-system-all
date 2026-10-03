const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { isIntegrationsEnabled } = require("../config/integrations");
const {
  normalizeEmail,
  assertSessionJoinIdentityFields,
  isContactJoinType
} = require("./otp.service");

function normalizeJoinNickname(nickname) {
  const value = String(nickname || "").trim();
  return value || null;
}
const { assertSessionWriteAccess } = require("../config/data-scope");
const {
  buildParticipantEmbedUrl,
  buildSessionJoinPath,
  appendJoinIdentityQuery
} = require("../config/publicAppUrl");

const TOKEN_TYP = "join_identity";
const DEFAULT_TTL_SECONDS = Number(process.env.JOIN_IDENTITY_TOKEN_TTL_SECONDS || 300);
const MAX_TTL_SECONDS = Number(process.env.JOIN_IDENTITY_TOKEN_MAX_TTL_SECONDS || 900);

function joinIdentitySecret() {
  return (
    process.env.JOIN_IDENTITY_TOKEN_SECRET ||
    env.jwt.accessSecret ||
    env.jwtSecret
  );
}

function clampTtlSeconds(raw) {
  const n = Number(raw);
  const fallback =
    Number.isFinite(DEFAULT_TTL_SECONDS) && DEFAULT_TTL_SECONDS > 0
      ? DEFAULT_TTL_SECONDS
      : 300;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  const max =
    Number.isFinite(MAX_TTL_SECONDS) && MAX_TTL_SECONDS > 0 ? MAX_TTL_SECONDS : 900;
  return Math.min(Math.floor(n), max);
}

function normalizeMobileOptional(mobile) {
  const value = String(mobile || "").trim();
  return value || null;
}

function trimOrigin(url) {
  return String(url || "").replace(/\/+$/, "");
}

/**
 * Mint a short-lived signed identity token for participant auto-join embeds.
 * Host-authenticated only — never mint in the browser with a secret.
 */
function signJoinIdentityToken({
  sessionCode,
  sessionId = null,
  nickname,
  email = null,
  mobile = null,
  ttlSeconds = DEFAULT_TTL_SECONDS
} = {}) {
  const code = String(sessionCode || "")
    .trim()
    .toUpperCase();
  const name = normalizeJoinNickname(nickname);
  if (!code) {
    const error = new Error("Session code is required");
    error.statusCode = 400;
    throw error;
  }
  if (!name) {
    const error = new Error("Name is required");
    error.statusCode = 400;
    throw error;
  }

  const expiresIn = clampTtlSeconds(ttlSeconds);
  const payload = {
    typ: TOKEN_TYP,
    purpose: TOKEN_TYP,
    session_code: code,
    nickname: name,
    jti: crypto.randomUUID()
  };
  if (sessionId != null && Number.isFinite(Number(sessionId))) {
    payload.session_id = Number(sessionId);
  }
  const normalizedEmail = email ? normalizeEmail(email) : null;
  if (normalizedEmail) payload.email = normalizedEmail;
  const normalizedMobile = normalizeMobileOptional(mobile);
  if (normalizedMobile) payload.mobile = normalizedMobile;

  const token = jwt.sign(payload, joinIdentitySecret(), {
    algorithm: "HS256",
    expiresIn
  });

  return { token, expiresIn, claims: payload };
}

/**
 * Verify a join-identity token for a session code.
 * Returns normalized identity fields suitable for join / prefill.
 */
function assertJoinIdentityToken(token, { sessionCode } = {}) {
  if (!token || typeof token !== "string") {
    const error = new Error("A signed join token is required");
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, joinIdentitySecret(), {
      algorithms: ["HS256"]
    });
  } catch {
    const error = new Error("Join token is invalid or expired");
    error.statusCode = 401;
    throw error;
  }

  if (decoded?.typ !== TOKEN_TYP || decoded?.purpose !== TOKEN_TYP) {
    const error = new Error("Join token is invalid or expired");
    error.statusCode = 401;
    throw error;
  }

  const expectedCode = String(sessionCode || "")
    .trim()
    .toUpperCase();
  const tokenCode = String(decoded.session_code || "")
    .trim()
    .toUpperCase();
  if (!expectedCode || !tokenCode || tokenCode !== expectedCode) {
    const error = new Error("Join token does not match this session");
    error.statusCode = 401;
    throw error;
  }

  const nickname = normalizeJoinNickname(decoded.nickname);
  if (!nickname) {
    const error = new Error("Join token is missing a name");
    error.statusCode = 401;
    throw error;
  }

  return {
    nickname,
    name: nickname,
    email: decoded.email ? normalizeEmail(decoded.email) : null,
    mobile: normalizeMobileOptional(decoded.mobile),
    session_code: tokenCode,
    session_id: decoded.session_id != null ? Number(decoded.session_id) : null,
    jti: decoded.jti || null,
    exp: decoded.exp || null
  };
}

/**
 * Host mints a participant embed URL carrying a signed join token.
 * `getSession` must be injected to avoid a circular require with session.service.
 */
async function mintJoinIdentityTokenForSession({
  sessionId,
  user,
  baseUrl,
  nickname,
  email = null,
  mobile = null,
  ttlSeconds,
  getSession
} = {}) {
  if (!isIntegrationsEnabled()) {
    const error = new Error("Platform integrations are disabled");
    error.statusCode = 404;
    throw error;
  }

  const loadSession =
    typeof getSession === "function"
      ? getSession
      : async (id) => {
          const { getSessionOrThrow } = require("./session.service");
          return getSessionOrThrow(id);
        };

  const session = await loadSession(sessionId);
  assertSessionWriteAccess(user, session);

  if (session.status === "archived") {
    const error = new Error("Join tokens are not available for archived sessions");
    error.statusCode = 400;
    throw error;
  }

  const name = nickname || null;
  let identity = {
    nickname: normalizeJoinNickname(name),
    email: email || null,
    mobile: mobile || null
  };

  if (isContactJoinType(session.join_type)) {
    identity = assertSessionJoinIdentityFields(session.join_type, {
      nickname: name,
      email,
      mobile
    });
  } else if (session.join_type === "name") {
    if (!identity.nickname) {
      const error = new Error("Name is required for this session");
      error.statusCode = 400;
      throw error;
    }
  } else if (session.join_type !== "anonymous" && !identity.nickname) {
    const error = new Error("Name is required");
    error.statusCode = 400;
    throw error;
  }

  const mintName = identity.nickname || name || "Participant";
  const { token, expiresIn } = signJoinIdentityToken({
    sessionCode: session.session_code,
    sessionId: session.session_id,
    nickname: mintName,
    email: identity.email,
    mobile: identity.mobile,
    ttlSeconds
  });

  const origin = trimOrigin(baseUrl);
  const embedUrl = buildParticipantEmbedUrl(
    session.session_code,
    { joinToken: token },
    origin
  );
  const joinPath = appendJoinIdentityQuery(buildSessionJoinPath(session.session_code), {
    joinToken: token
  });
  const joinUrl = origin ? `${origin}${joinPath}` : joinPath;

  return {
    session_id: session.session_id,
    session_code: session.session_code,
    join_identity_token: token,
    expires_in: expiresIn,
    embed_url: embedUrl,
    join_url: joinUrl,
    identity: {
      name: mintName,
      email: identity.email || null,
      mobile: identity.mobile || null
    }
  };
}

function resolveJoinIdentityTokenForCode({ code, token }) {
  return assertJoinIdentityToken(token, { sessionCode: code });
}

module.exports = {
  TOKEN_TYP,
  DEFAULT_TTL_SECONDS,
  MAX_TTL_SECONDS,
  signJoinIdentityToken,
  assertJoinIdentityToken,
  mintJoinIdentityTokenForSession,
  resolveJoinIdentityTokenForCode,
  clampTtlSeconds,
  joinIdentitySecret
};
