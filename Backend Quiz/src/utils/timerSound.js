const DEFAULT_TIMER_SOUND_KEY = "classic";
const DEFAULT_TIMER_SOUND_START_SECONDS = 10;

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
 * Seconds remaining when ending-window audio should start.
 * Untimed → null. Timed → clamp to [1, timeLimit]; default min(10, timeLimit).
 */
function normalizeTimerSoundStartSeconds(rawStart, timeLimitSeconds) {
  const limit = Number(timeLimitSeconds);
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const maxStart = Math.floor(limit);
  const fallback = Math.min(DEFAULT_TIMER_SOUND_START_SECONDS, maxStart);

  if (rawStart === undefined || rawStart === null || rawStart === "") {
    return fallback;
  }

  const n = Number(rawStart);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(maxStart, Math.max(1, Math.round(n)));
}

/**
 * Resolve stored timer sound fields for times-up + ending clock.
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

  const timeLimit =
    input.time_limit_seconds ?? input.timeLimitSeconds ?? input.timeLimit ?? null;
  const startRaw =
    input.timer_sound_start_seconds ?? input.timerSoundStartSeconds;

  return {
    timer_sound_key: timesUp.key,
    timer_sound_url: timesUp.url,
    timer_ending_sound_key: ending.key,
    timer_ending_sound_url: ending.url,
    timer_sound_start_seconds: normalizeTimerSoundStartSeconds(startRaw, timeLimit)
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

  if (
    payload?.timer_sound_start_seconds !== undefined &&
    payload?.timer_sound_start_seconds !== null &&
    payload?.timer_sound_start_seconds !== ""
  ) {
    const n = Number(payload.timer_sound_start_seconds);
    if (!Number.isFinite(n) || n < 1) {
      errors.push("timer_sound_start_seconds must be a positive integer when provided");
    }
    const limit = Number(payload.time_limit_seconds);
    if (Number.isFinite(limit) && limit > 0 && Math.round(n) > Math.floor(limit)) {
      errors.push("timer_sound_start_seconds cannot exceed time_limit_seconds");
    }
  }

  return errors;
}

/** Effective window for playback when DB value is null/missing. */
function resolveTimerSoundStartSeconds(storedStart, timeLimitSeconds) {
  if (storedStart != null && Number.isFinite(Number(storedStart))) {
    return normalizeTimerSoundStartSeconds(storedStart, timeLimitSeconds);
  }
  return normalizeTimerSoundStartSeconds(undefined, timeLimitSeconds);
}

module.exports = {
  DEFAULT_TIMER_SOUND_KEY,
  DEFAULT_TIMER_SOUND_START_SECONDS,
  TIMER_SOUND_KEYS,
  normalizeTimerSoundKey,
  normalizeTimerSoundUrl,
  normalizeTimerSoundFields,
  normalizeTimerSoundStartSeconds,
  resolveTimerSoundStartSeconds,
  validateTimerSoundFields
};
