export const SESSION_LOGO_PLACEMENT_BOTH = 'both'
export const SESSION_LOGO_PLACEMENT_PARTICIPANT = 'participant_only'
export const SESSION_LOGO_PLACEMENT_PRESENT = 'present_only'

export const SESSION_LOGO_PLACEMENTS = [
  SESSION_LOGO_PLACEMENT_BOTH,
  SESSION_LOGO_PLACEMENT_PARTICIPANT,
  SESSION_LOGO_PLACEMENT_PRESENT,
]

export const DEFAULT_SESSION_LOGO_PLACEMENT = SESSION_LOGO_PLACEMENT_BOTH

export function normalizeSessionLogoPlacement(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (SESSION_LOGO_PLACEMENTS.includes(raw)) return raw
  return DEFAULT_SESSION_LOGO_PLACEMENT
}

/**
 * @param {{ logo_url?: string | null, session_logo_placement?: string | null } | null | undefined} session
 * @param {'participant' | 'present'} surface
 */
export function resolveSessionLogoUrl(session, surface) {
  const url =
    session?.logo_url != null && String(session.logo_url).trim()
      ? String(session.logo_url).trim()
      : null
  if (!url) return null
  const placement = normalizeSessionLogoPlacement(session?.session_logo_placement)
  if (placement === SESSION_LOGO_PLACEMENT_BOTH) return url
  if (placement === SESSION_LOGO_PLACEMENT_PARTICIPANT && surface === 'participant') return url
  if (placement === SESSION_LOGO_PLACEMENT_PRESENT && surface === 'present') return url
  return null
}
