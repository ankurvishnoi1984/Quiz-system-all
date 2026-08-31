export function getWebsiteUrl(path = '/') {
  const base = import.meta.env.VITE_WEBSITE_URL || 'http://localhost:5174'
  return `${base.replace(/\/$/, '')}${path}`
}

/** Public website plan renew / change-plan checkout. */
export function getPlanRenewUrl({ email, planId } = {}) {
  const url = new URL(getWebsiteUrl('/renew'))
  if (email) url.searchParams.set('email', email)
  if (planId != null && planId !== '') url.searchParams.set('plan', String(planId))
  return url.toString()
}
