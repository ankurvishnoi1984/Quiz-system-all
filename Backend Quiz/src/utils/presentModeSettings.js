const DEFAULT_PRESENT_MODE_SETTINGS = Object.freeze({
  show_graphs: true,
  show_responses: true,
  show_session_info: true,
  show_participant_stats: true
});

const PRESENT_MODE_SETTING_KEYS = Object.keys(DEFAULT_PRESENT_MODE_SETTINGS);

/**
 * Merge stored/partial settings with defaults. Unknown keys ignored.
 * Missing or null → all defaults on.
 */
function normalizePresentModeSettings(input) {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return { ...DEFAULT_PRESENT_MODE_SETTINGS };
  }
  const next = { ...DEFAULT_PRESENT_MODE_SETTINGS };
  for (const key of PRESENT_MODE_SETTING_KEYS) {
    if (input[key] !== undefined) {
      next[key] = Boolean(input[key]);
    }
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
    if (typeof input[key] !== "boolean") {
      return `present_mode_settings.${key} must be a boolean`;
    }
  }
  return null;
}

module.exports = {
  DEFAULT_PRESENT_MODE_SETTINGS,
  PRESENT_MODE_SETTING_KEYS,
  normalizePresentModeSettings,
  validatePresentModeSettings
};
