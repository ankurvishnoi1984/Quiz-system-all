const DEFAULT_TIMER_SOUND_KEY = "classic";

const TIMER_SOUND_KEYS = Object.freeze([
  "classic",
  "soft",
  "sharp",
  "digital",
  "pulse",
  "custom"
]);

function normalizeTimerSoundKey(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  return TIMER_SOUND_KEYS.includes(key) ? key : DEFAULT_TIMER_SOUND_KEY;
}

function normalizeTimerSoundUrl(value) {
  if (value == null || value === "") return null;
  const url = String(value).trim();
  return url || null;
}

function normalizeOneSound(keyInput, urlInput) {
  const key = normalizeTimerSoundKey(keyInput);
  const url = normalizeTimerSoundUrl(urlInput);
  if (key === "custom" && !url) {
    return { key: DEFAULT_TIMER_SOUND_KEY, url: null };
  }
  return {
    key,
    url: key === "custom" ? url : null
  };
}

/**
 * Resolve stored timer sound fields for times-up + last-10s ending clock.
 */
function normalizeTimerSoundFields(input = {}) {
  const timesUp = normalizeOneSound(
    input.timer_sound_key ?? input.timerSoundKey,
    input.timer_sound_url ?? input.timerSoundUrl
  );
  const ending = normalizeOneSound(
    input.timer_ending_sound_key ?? input.timerEndingSoundKey ?? timesUp.key,
    input.timer_ending_sound_url ?? input.timerEndingSoundUrl
  );

  return {
    timer_sound_key: timesUp.key,
    timer_sound_url: timesUp.url,
    timer_ending_sound_key: ending.key,
    timer_ending_sound_url: ending.url
  };
}

function validateOneSound(keyField, urlField, payload, errors) {
  if (payload?.[keyField] !== undefined && payload[keyField] !== null) {
    const key = String(payload[keyField]).trim().toLowerCase();
    if (!TIMER_SOUND_KEYS.includes(key)) {
      errors.push(`${keyField} must be one of: ${TIMER_SOUND_KEYS.join(", ")}`);
    }
  }
  if (payload?.[urlField] !== undefined && payload[urlField] !== null) {
    if (typeof payload[urlField] !== "string" || !payload[urlField].trim()) {
      errors.push(`${urlField} must be a non-empty string or null`);
    }
  }
}

function validateTimerSoundFields(payload) {
  const errors = [];
  validateOneSound("timer_sound_key", "timer_sound_url", payload, errors);
  validateOneSound(
    "timer_ending_sound_key",
    "timer_ending_sound_url",
    payload,
    errors
  );
  return errors;
}

module.exports = {
  DEFAULT_TIMER_SOUND_KEY,
  TIMER_SOUND_KEYS,
  normalizeTimerSoundKey,
  normalizeTimerSoundUrl,
  normalizeTimerSoundFields,
  validateTimerSoundFields
};
