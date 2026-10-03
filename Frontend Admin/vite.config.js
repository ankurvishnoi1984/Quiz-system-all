import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Origins allowed to load this app inside an <iframe>. Only applied when
 * integrations are enabled (VITE_INTEGRATIONS_ENABLED not false).
 * Production hosts must send the same header — see docs/INTEGRATIONS.md.
 *
 * Env:
 *   VITE_EMBED_FRAME_ANCESTORS       — replaces the default allowlist
 *   VITE_EMBED_FRAME_ANCESTORS_EXTRA — appended to defaults (ignored if replace is set)
 */
const DEFAULT_FRAME_ANCESTORS = [
  "'self'",
  'https://*.officeapps.live.com',
  'https://*.office.com',
  'https://*.office365.com',
  'https://*.microsoft.com',
  'https://*.microsoftonline.com',
  'https://*.sharepoint.com',
  'https://teams.microsoft.com',
  'https://*.teams.microsoft.com',
  'https://*.skype.com',
  'https://docs.google.com',
  'https://*.google.com',
  'https://*.googleusercontent.com',
  'https://*.zoom.us',
]

function isIntegrationsEnabled(env) {
  const raw = env.VITE_INTEGRATIONS_ENABLED
  if (raw == null || raw === '') return true
  const normalized = String(raw).trim().toLowerCase()
  if (['0', 'false', 'off', 'no', 'disabled'].includes(normalized)) return false
  return true
}

function splitOrigins(raw) {
  return String(raw || '')
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function frameAncestorsHeader(env) {
  const configured = splitOrigins(env.VITE_EMBED_FRAME_ANCESTORS)
  if (configured.length) {
    return `frame-ancestors ${configured.join(' ')}`
  }
  const extra = splitOrigins(env.VITE_EMBED_FRAME_ANCESTORS_EXTRA)
  const ancestors = [...DEFAULT_FRAME_ANCESTORS, ...extra]
  return `frame-ancestors ${ancestors.join(' ')}`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const headers = isIntegrationsEnabled(env)
    ? { 'Content-Security-Policy': frameAncestorsHeader(env) }
    : {}

  return {
    plugins: [react(), tailwindcss()],
    server: { headers },
    preview: { headers },
  }
})
