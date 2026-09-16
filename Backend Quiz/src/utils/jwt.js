const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signAccessToken(payload, options = {}) {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: options.expiresIn || env.jwt.accessExpiry
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

function signEmailVerificationToken(payload) {
  return jwt.sign(
    { ...payload, typ: "email_verify", purpose: "email_verify" },
    env.jwt.accessSecret,
    { expiresIn: "48h" }
  );
}

function verifyEmailVerificationToken(token) {
  const decoded = jwt.verify(token, env.jwt.accessSecret);
  if (decoded?.typ !== "email_verify" || decoded?.purpose !== "email_verify") {
    throw new Error("Invalid email verification token");
  }
  return decoded;
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  signEmailVerificationToken,
  verifyEmailVerificationToken
};
