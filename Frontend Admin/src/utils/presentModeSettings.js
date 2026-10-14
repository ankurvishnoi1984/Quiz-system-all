export const MAX_CUSTOM_INSTRUCTIONS = 20
export const MAX_CUSTOM_INSTRUCTION_LENGTH = 300

export const DEFAULT_PRESENT_MODE_SETTINGS = Object.freeze({
  showGraphs: true,
  showResponses: true,
  showSessionInfo: true,
  showParticipantStats: true,
  showCustomInstructions: false,
  customInstructions: Object.freeze([]),
})

const BOOLEAN_API_TO_UI = {
  show_graphs: 'showGraphs',
  show_responses: 'showResponses',
  show_session_info: 'showSessionInfo',
  show_participant_stats: 'showParticipantStats',
  show_custom_instructions: 'showCustomInstructions',
}

const UI_TO_API = {
  showGraphs: 'show_graphs',
  showResponses: 'show_responses',
  showSessionInfo: 'show_session_info',
  showParticipantStats: 'show_participant_stats',
  showCustomInstructions: 'show_custom_instructions',
}

export function normalizeCustomInstructions(input) {
  if (!Array.isArray(input)) return []
  const next = []
  for (const item of input) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed) continue
    next.push(trimmed.slice(0, MAX_CUSTOM_INSTRUCTION_LENGTH))
    if (next.length >= MAX_CUSTOM_INSTRUCTIONS) break
  }
  return next
}

/** Form / UI shape with defaults. */
export function normalizePresentModeSettings(input) {
  const base = {
    ...DEFAULT_PRESENT_MODE_SETTINGS,
    customInstructions: [],
  }
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return base
  }
  for (const [apiKey, uiKey] of Object.entries(BOOLEAN_API_TO_UI)) {
    if (input[apiKey] !== undefined) base[uiKey] = Boolean(input[apiKey])
    else if (input[uiKey] !== undefined) base[uiKey] = Boolean(input[uiKey])
  }
  if (input.custom_instructions !== undefined) {
    base.customInstructions = normalizeCustomInstructions(input.custom_instructions)
  } else if (input.customInstructions !== undefined) {
    base.customInstructions = normalizeCustomInstructions(input.customInstructions)
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
    show_custom_instructions: normalized.showCustomInstructions,
    custom_instructions: normalizeCustomInstructions(normalized.customInstructions),
  }
}

/** Read settings from a session record. */
export function getPresentModeSettings(session) {
  return normalizePresentModeSettings(session?.present_mode_settings)
}

export { UI_TO_API }
