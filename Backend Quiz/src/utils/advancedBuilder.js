const DEFAULT_RESPONSE_TIME_SCORE_BANDS = [
  { max_seconds: 5, points: 500 },
  { max_seconds: 10, points: 400 },
  { max_seconds: 15, points: 300 },
  { max_seconds: 20, points: 200 },
  { max_seconds: 25, points: 100 },
  { max_seconds: 30, points: 50 }
];

const DEFAULT_BAND_POINTS = [500, 400, 300, 200, 100, 50];

/**
 * Divide a question timer into equal score bands (last band ends at the timer).
 * @param {number} timeLimitSeconds
 * @param {number} [bandCount=6]
 * @param {number[]} [pointsScale]
 */
function buildScoreBandsForTimer(timeLimitSeconds, bandCount = 6, pointsScale = DEFAULT_BAND_POINTS) {
  const limit = Math.max(1, Math.floor(Number(timeLimitSeconds) || 30));
  const count = Math.min(8, Math.max(2, Math.floor(Number(bandCount) || 6)));
  const step = limit / count;
  const points =
    Array.isArray(pointsScale) && pointsScale.length ? pointsScale : DEFAULT_BAND_POINTS;

  const bands = [];
  for (let i = 0; i < count; i += 1) {
    const maxSeconds = i === count - 1 ? limit : Math.max(1, Math.round(step * (i + 1)));
    let pts;
    if (points.length === count) {
      pts = Math.round(Number(points[i]) || 0);
    } else {
      const top = Number(points[0]) || 500;
      const bottom = Number(points[points.length - 1]) || 50;
      const t = i / Math.max(1, count - 1);
      pts = Math.round(top * (1 - t) + bottom * t);
    }
    bands.push({ max_seconds: maxSeconds, points: pts });
  }

  for (let i = 1; i < bands.length; i += 1) {
    if (bands[i].max_seconds <= bands[i - 1].max_seconds) {
      bands[i].max_seconds = bands[i - 1].max_seconds + 1;
    }
  }
  bands[bands.length - 1].max_seconds = Math.max(bands[bands.length - 1].max_seconds, limit);
  return bands;
}

function isAdvancedBuilderSession(session) {
  return String(session?.builder_mode || "normal").toLowerCase() === "advanced";
}

function normalizeScoreBands(raw, timeLimitSeconds = null) {
  if (!Array.isArray(raw) || raw.length === 0) {
    if (Number.isFinite(Number(timeLimitSeconds)) && Number(timeLimitSeconds) > 0) {
      return buildScoreBandsForTimer(Number(timeLimitSeconds));
    }
    return DEFAULT_RESPONSE_TIME_SCORE_BANDS.map((b) => ({ ...b }));
  }

  const bands = raw
    .map((row) => ({
      max_seconds: Number(row?.max_seconds),
      points: Number(row?.points)
    }))
    .filter(
      (row) =>
        Number.isFinite(row.max_seconds) &&
        row.max_seconds > 0 &&
        Number.isFinite(row.points) &&
        row.points >= 0
    )
    .sort((a, b) => a.max_seconds - b.max_seconds);

  if (!bands.length) {
    if (Number.isFinite(Number(timeLimitSeconds)) && Number(timeLimitSeconds) > 0) {
      return buildScoreBandsForTimer(Number(timeLimitSeconds));
    }
    return DEFAULT_RESPONSE_TIME_SCORE_BANDS.map((b) => ({ ...b }));
  }
  return bands;
}

/**
 * Map response time to band points. Wrong / missing / past last band → 0.
 * Bands use inclusive max_seconds (e.g. 0–5s → 500).
 */
function scoreFromResponseTimeBands(responseTimeMs, bandsInput, { isCorrect = true } = {}) {
  if (!isCorrect) return 0;
  const ms = Number(responseTimeMs);
  if (!Number.isFinite(ms) || ms < 0) return 0;

  const bands = normalizeScoreBands(bandsInput);
  const seconds = ms / 1000;
  for (const band of bands) {
    if (seconds <= band.max_seconds) {
      return Math.round(band.points);
    }
  }
  return 0;
}

function resolveQuestionsPerParticipant(session, poolSize) {
  const k = Number(session?.questions_per_participant);
  if (!Number.isFinite(k) || k < 1) return null;
  if (Number.isFinite(poolSize) && poolSize > 0) {
    return Math.min(Math.floor(k), poolSize);
  }
  return Math.floor(k);
}

function shuffleArray(items = []) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  DEFAULT_RESPONSE_TIME_SCORE_BANDS,
  DEFAULT_BAND_POINTS,
  buildScoreBandsForTimer,
  isAdvancedBuilderSession,
  normalizeScoreBands,
  scoreFromResponseTimeBands,
  resolveQuestionsPerParticipant,
  shuffleArray
};
