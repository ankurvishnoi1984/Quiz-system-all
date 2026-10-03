/**
 * Whether this document is running inside a cross-page iframe.
 * Useful for compact participant/join layout when embedded by a portal.
 */
export function isRunningInIframe() {
  if (typeof window === 'undefined') return false
  try {
    return window.self !== window.top
  } catch {
    // Cross-origin parent access can throw; that still means we are framed.
    return true
  }
}
