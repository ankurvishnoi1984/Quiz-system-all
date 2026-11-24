const STORAGE_KEY = 'quiz_device_fp'

/**
 * Stable browser device fingerprint for single-device join enforcement.
 * Persists in localStorage when available.
 */
export function getOrCreateDeviceFingerprint() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing && existing.length > 0) {
      return existing.slice(0, 100)
    }
    const uuid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
    const created = `web:${uuid}`.slice(0, 100)
    localStorage.setItem(STORAGE_KEY, created)
    return created
  } catch {
    return `web:ephemeral:${Date.now().toString(36)}`.slice(0, 100)
  }
}
