export function getWebsiteUrl(path = '/') {
  const base = import.meta.env.VITE_WEBSITE_URL || 'http://localhost:5174'
  return `${base.replace(/\/$/, '')}${path}`
}

/** Public website plan renew checkout. */
export function getPlanRenewUrl({ email, planId, mode } = {}) {
  const url = new URL(getWebsiteUrl('/renew'))
  if (email) url.searchParams.set('email', email)
  if (planId != null && planId !== '') url.searchParams.set('plan', String(planId))
  if (mode) url.searchParams.set('mode', mode)
  return url.toString()
}
