export function getWebsiteUrl(path = '/') {
  const base = import.meta.env.VITE_WEBSITE_URL || 'http://localhost:5174'
  return `${base.replace(/\/$/, '')}${path}`
}
