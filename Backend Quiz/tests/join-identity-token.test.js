"use strict";

/**
 * Unit tests for signed participant join-identity tokens (Phase 3).
 * Run: npm run test:join-identity-token
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JOIN_IDENTITY_TOKEN_SECRET =
  process.env.JOIN_IDENTITY_TOKEN_SECRET || "test-join-identity-secret";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "test-access-secret";

const {
  signJoinIdentityToken,
  assertJoinIdentityToken,
  clampTtlSeconds,
  TOKEN_TYP,
  DEFAULT_TTL_SECONDS
} = require("../src/services/join-identity-token.service");
const { appendJoinIdentityQuery } = require("../src/config/publicAppUrl");

test("sign + assert round-trip for name_email identity", () => {
  const { token, expiresIn } = signJoinIdentityToken({
    sessionCode: "abc123",
    sessionId: 42,
    nickname: " Suraj ",
    email: "Suraj@Example.com",
    ttlSeconds: 120
  });

  assert.equal(expiresIn, 120);
  assert.ok(token && token.split(".").length === 3);

  const identity = assertJoinIdentityToken(token, { sessionCode: "ABC123" });
  assert.equal(identity.nickname, "Suraj");
  assert.equal(identity.name, "Suraj");
  assert.equal(identity.email, "suraj@example.com");
  assert.equal(identity.session_code, "ABC123");
  assert.equal(identity.session_id, 42);
  assert.ok(identity.jti);
});

test("rejects wrong session code", () => {
  const { token } = signJoinIdentityToken({
    sessionCode: "AAAA11",
    nickname: "Ada"
  });
  assert.throws(
    () => assertJoinIdentityToken(token, { sessionCode: "BBBB22" }),
    (err) => err.statusCode === 401
  );
});

test("rejects expired token", () => {
  const secret = process.env.JOIN_IDENTITY_TOKEN_SECRET;
  const token = jwt.sign(
    {
      typ: TOKEN_TYP,
      purpose: TOKEN_TYP,
      session_code: "EXP001",
      nickname: "Old",
      jti: "jti-expired",
      exp: Math.floor(Date.now() / 1000) - 30
    },
    secret,
    { algorithm: "HS256" }
  );
  assert.throws(
    () => assertJoinIdentityToken(token, { sessionCode: "EXP001" }),
    (err) => err.statusCode === 401
  );
});

test("rejects forged unsigned alias typ", () => {
  const secret = process.env.JOIN_IDENTITY_TOKEN_SECRET;
  const token = jwt.sign(
    {
      typ: "access",
      purpose: TOKEN_TYP,
      session_code: "FORGE1",
      nickname: "Hacker"
    },
    secret,
    { algorithm: "HS256", expiresIn: 60 }
  );
  assert.throws(
    () => assertJoinIdentityToken(token, { sessionCode: "FORGE1" }),
    (err) => err.statusCode === 401
  );
});

test("rejects token signed with wrong secret", () => {
  const token = jwt.sign(
    {
      typ: TOKEN_TYP,
      purpose: TOKEN_TYP,
      session_code: "SEC001",
      nickname: "Eve"
    },
    "not-the-join-secret",
    { algorithm: "HS256", expiresIn: 60 }
  );
  assert.throws(
    () => assertJoinIdentityToken(token, { sessionCode: "SEC001" }),
    (err) => err.statusCode === 401
  );
});

test("clampTtlSeconds respects max", () => {
  assert.equal(clampTtlSeconds(60), 60);
  assert.ok(clampTtlSeconds(999999) <= 900);
  assert.equal(clampTtlSeconds(0), DEFAULT_TTL_SECONDS);
  assert.equal(clampTtlSeconds(-5), DEFAULT_TTL_SECONDS);
});

test("appendJoinIdentityQuery adds join_token", () => {
  const url = appendJoinIdentityQuery("/embed/participant/ABC", {
    joinToken: "tok.en.value"
  });
  assert.equal(url, "/embed/participant/ABC?join_token=tok.en.value");
});

test("requires nickname when minting", () => {
  assert.throws(
    () =>
      signJoinIdentityToken({
        sessionCode: "NEEDNM",
        nickname: "   "
      }),
    (err) => err.statusCode === 400
  );
});
