/**
 * Frontend gate for platform integrations.
 * Must stay in sync with backend INTEGRATIONS_ENABLED (see docs/INTEGRATIONS.md).
 *
 * Default: enabled. Set VITE_INTEGRATIONS_ENABLED=false to hide embed routes and
 * the Share panel Embed tab without deleting code.
 */
export function isIntegrationsEnabled() {
  const raw = import.meta.env.VITE_INTEGRATIONS_ENABLED
  if (raw == null || raw === '') return true
  const normalized = String(raw).trim().toLowerCase()
  if (['0', 'false', 'off', 'no', 'disabled'].includes(normalized)) return false
  if (['1', 'true', 'on', 'yes', 'enabled'].includes(normalized)) return true
  return true
}
