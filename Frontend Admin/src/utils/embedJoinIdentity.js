/**
 * Parse participant identity from a join/embed URL query string.
 * Supports: name (or nickname), email, mobile, signed join_token.
 * (Legacy wc_code / zone in URL are ignored for customer match; host configures those on the session.)
 */
export function parseJoinIdentityFromSearch(search) {
  const params = new URLSearchParams(
    typeof search === 'string'
      ? search.startsWith('?')
        ? search
        : search
          ? `?${search}`
          : ''
      : '',
  )
  const name = String(params.get('name') || params.get('nickname') || '').trim()
  const email = String(params.get('email') || '').trim()
  const mobile = String(params.get('mobile') || '').trim()
  const joinToken = String(
    params.get('join_token') || params.get('join_identity_token') || '',
  ).trim()
  return {
    name,
    email,
    mobile,
    joinToken,
    hasAny: Boolean(name || email || mobile || joinToken),
  }
}

/**
 * Whether join must run customer-match verification for this session.
 * Returns { required, ready } — ready when participant email is available.
 */
export function getCustomerMatchGate(session, identity) {
  const required = Boolean(session?.customer_match_enabled)
  if (!required) return { required: false, ready: true }
  const email = String(identity?.email || '').trim()
  return { required: true, ready: Boolean(email) }
}

/**
 * Whether query identity is enough to satisfy session.join_type (ignoring OTP).
 */
export function isJoinIdentityComplete(joinType, identity) {
  const name = String(identity?.name || '').trim()
  const email = String(identity?.email || '').trim()
  const mobile = String(identity?.mobile || '').trim()

  switch (joinType) {
    case 'anonymous':
      return true
    case 'name':
      return Boolean(name)
    case 'name_email':
      return Boolean(name && email)
    case 'name_mobile':
      return Boolean(name && mobile)
    case 'name_email_mobile':
      return Boolean(name && email && mobile)
    default:
      return false
  }
}

/** Auto-join only when identity is complete and session does not require OTP. */
export function canAutoJoinWithIdentity(session, identity) {
  if (!session) return false
  const joinType = session.join_type || 'name'
  if (!isJoinIdentityComplete(joinType, identity)) return false
  const contactTypes = new Set(['name_email', 'name_mobile', 'name_email_mobile'])
  if (contactTypes.has(joinType) && Boolean(session.join_otp_required)) {
    return false
  }
  if (session.customer_match_enabled) {
    const email = String(identity?.email || '').trim()
    if (!email) return false
  }
  return true
}

/** Merge token-resolved fields over plain query params (token wins). */
export function mergeJoinIdentity(queryIdentity, tokenIdentity) {
  const base = queryIdentity || {
    name: '',
    email: '',
    mobile: '',
    joinToken: '',
  }
  if (!tokenIdentity) {
    return {
      ...base,
      hasAny: Boolean(base.name || base.email || base.mobile || base.joinToken),
    }
  }
  const name = String(tokenIdentity.name || tokenIdentity.nickname || base.name || '').trim()
  const email = String(tokenIdentity.email || base.email || '').trim()
  const mobile = String(tokenIdentity.mobile || base.mobile || '').trim()
  return {
    name,
    email,
    mobile,
    joinToken: base.joinToken || '',
    hasAny: Boolean(name || email || mobile || base.joinToken),
    fromToken: true,
  }
}
