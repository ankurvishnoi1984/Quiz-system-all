/**
 * Frontend helper checks for embed join identity (Phase 2 + 3).
 * Run from Frontend Admin:
 *   node scripts/test-embed-join-identity.mjs
 */
import assert from 'node:assert/strict'
import {
  parseJoinIdentityFromSearch,
  isJoinIdentityComplete,
  canAutoJoinWithIdentity,
  mergeJoinIdentity,
} from '../src/utils/embedJoinIdentity.js'

const q = parseJoinIdentityFromSearch('?name=Suraj&email=suraj@example.com')
assert.equal(q.name, 'Suraj')
assert.equal(q.email, 'suraj@example.com')
assert.equal(q.joinToken, '')

const withToken = parseJoinIdentityFromSearch('?join_token=abc.def.ghi&name=Ignored')
assert.equal(withToken.joinToken, 'abc.def.ghi')
assert.equal(withToken.name, 'Ignored')

assert.equal(isJoinIdentityComplete('name_email', q), true)
assert.equal(isJoinIdentityComplete('name_email_mobile', q), false)

assert.equal(
  canAutoJoinWithIdentity({ join_type: 'name_email', join_otp_required: false }, q),
  true,
)
assert.equal(
  canAutoJoinWithIdentity({ join_type: 'name_email', join_otp_required: true }, q),
  false,
)

const merged = mergeJoinIdentity(withToken, {
  name: 'FromToken',
  email: 'token@example.com',
})
assert.equal(merged.name, 'FromToken')
assert.equal(merged.email, 'token@example.com')
assert.equal(merged.joinToken, 'abc.def.ghi')
assert.equal(merged.fromToken, true)

console.log('embedJoinIdentity helpers OK')
