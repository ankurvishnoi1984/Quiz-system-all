export function getAdminPortalUrl(path = '/') {
  const base = import.meta.env.VITE_ADMIN_PORTAL_URL || 'http://localhost:5173'
  return `${base.replace(/\/$/, '')}${path}`
}

export function redirectToAdminLoginAfterSignup(email) {
  const url = new URL(getAdminPortalUrl('/login'))
  url.searchParams.set('signup', 'success')
  if (email) {
    url.searchParams.set('email', email)
  }
  window.location.href = url.toString()
}

export function redirectToAdminPortal(path = '/login') {
  window.location.href = getAdminPortalUrl(path)
}
