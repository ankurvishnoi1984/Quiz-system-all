/** Advanced host Quick View Mode — screen-share control surface (not Preview Mode). */

export function buildQuickViewModeUrl(sessionId) {
  const params = new URLSearchParams()
  params.set('session', String(sessionId || ''))
  // Mirror Present/Preview handoff so authStore can hydrate from the localStorage mirror.
  params.set('quickview', '1')
  return `${window.location.origin}/quick-view?${params.toString()}`
}
