const MAX_CUSTOM_INSTRUCTIONS = 20;
const MAX_CUSTOM_INSTRUCTION_LENGTH = 300;

const BOOLEAN_KEYS = [
  "show_graphs",
  "show_responses",
  "show_session_info",
  "show_participant_stats",
  "show_custom_instructions"
];

const DEFAULT_PRESENT_MODE_SETTINGS = Object.freeze({
  show_graphs: true,
  show_responses: true,
  show_session_info: true,
  show_participant_stats: true,
  show_custom_instructions: false,
  custom_instructions: Object.freeze([])
});

const PRESENT_MODE_SETTING_KEYS = Object.keys(DEFAULT_PRESENT_MODE_SETTINGS);

function normalizeCustomInstructions(input) {
  if (!Array.isArray(input)) return [];
  const next = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    next.push(trimmed.slice(0, MAX_CUSTOM_INSTRUCTION_LENGTH));
    if (next.length >= MAX_CUSTOM_INSTRUCTIONS) break;
  }
  return next;
}

/**
 * Merge stored/partial settings with defaults. Unknown keys ignored.
 * Missing or null → defaults (booleans mostly on; custom instructions off/empty).
 */
function normalizePresentModeSettings(input) {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return {
      ...DEFAULT_PRESENT_MODE_SETTINGS,
      custom_instructions: []
    };
  }
  const next = {
    ...DEFAULT_PRESENT_MODE_SETTINGS,
    custom_instructions: []
  };
  for (const key of BOOLEAN_KEYS) {
    if (input[key] !== undefined) {
      next[key] = Boolean(input[key]);
    }
  }
  if (input.custom_instructions !== undefined) {
    next.custom_instructions = normalizeCustomInstructions(input.custom_instructions);
  }
  return next;
}

function validatePresentModeSettings(input) {
  if (input === undefined) return null;
  if (input === null) return null;
  if (typeof input !== "object" || Array.isArray(input)) {
    return "present_mode_settings must be an object or null";
  }
  const allowed = new Set(PRESENT_MODE_SETTING_KEYS);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      return `present_mode_settings has invalid field: ${key}`;
    }
    if (key === "custom_instructions") {
      if (!Array.isArray(input[key])) {
        return "present_mode_settings.custom_instructions must be an array";
      }
      if (input[key].length > MAX_CUSTOM_INSTRUCTIONS) {
        return `present_mode_settings.custom_instructions may have at most ${MAX_CUSTOM_INSTRUCTIONS} items`;
      }
      for (let i = 0; i < input[key].length; i += 1) {
        const item = input[key][i];
        if (typeof item !== "string") {
          return `present_mode_settings.custom_instructions[${i}] must be a string`;
        }
        const trimmed = item.trim();
        if (!trimmed) {
          return `present_mode_settings.custom_instructions[${i}] must not be empty`;
        }
        if (trimmed.length > MAX_CUSTOM_INSTRUCTION_LENGTH) {
          return `present_mode_settings.custom_instructions[${i}] must be at most ${MAX_CUSTOM_INSTRUCTION_LENGTH} characters`;
        }
      }
      continue;
    }
    if (typeof input[key] !== "boolean") {
      return `present_mode_settings.${key} must be a boolean`;
    }
  }
  return null;
}

module.exports = {
  DEFAULT_PRESENT_MODE_SETTINGS,
  PRESENT_MODE_SETTING_KEYS,
  MAX_CUSTOM_INSTRUCTIONS,
  MAX_CUSTOM_INSTRUCTION_LENGTH,
  normalizePresentModeSettings,
  validatePresentModeSettings
};
