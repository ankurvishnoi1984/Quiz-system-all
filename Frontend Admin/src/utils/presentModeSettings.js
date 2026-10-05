export const DEFAULT_PRESENT_MODE_SETTINGS = Object.freeze({
  showGraphs: true,
  showResponses: true,
  showSessionInfo: true,
  showParticipantStats: true,
})

const API_TO_UI = {
  show_graphs: 'showGraphs',
  show_responses: 'showResponses',
  show_session_info: 'showSessionInfo',
  show_participant_stats: 'showParticipantStats',
}

const UI_TO_API = {
  showGraphs: 'show_graphs',
  showResponses: 'show_responses',
  showSessionInfo: 'show_session_info',
  showParticipantStats: 'show_participant_stats',
}

/** Form / UI shape with defaults (missing keys = on). */
export function normalizePresentModeSettings(input) {
  const base = { ...DEFAULT_PRESENT_MODE_SETTINGS }
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return base
  }
  // Accept either API snake_case or UI camelCase.
  for (const [apiKey, uiKey] of Object.entries(API_TO_UI)) {
    if (input[apiKey] !== undefined) base[uiKey] = Boolean(input[apiKey])
    else if (input[uiKey] !== undefined) base[uiKey] = Boolean(input[uiKey])
  }
  return base
}

/** Payload for create/update session API. */
export function toPresentModeSettingsApi(input) {
  const normalized = normalizePresentModeSettings(input)
  return {
    show_graphs: normalized.showGraphs,
    show_responses: normalized.showResponses,
    show_session_info: normalized.showSessionInfo,
    show_participant_stats: normalized.showParticipantStats,
  }
}

/** Read settings from a session record. */
export function getPresentModeSettings(session) {
  return normalizePresentModeSettings(session?.present_mode_settings)
}

export { UI_TO_API }
