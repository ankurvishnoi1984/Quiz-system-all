/**
 * Quick unit checks for Advanced builder scoring helpers (no DB).
 */
const {
  scoreFromResponseTimeBands,
  normalizeScoreBands,
  isAdvancedBuilderSession,
  buildScoreBandsForTimer,
  DEFAULT_RESPONSE_TIME_SCORE_BANDS
} = require("../src/utils/advancedBuilder");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isAdvancedBuilderSession({ builder_mode: "advanced" }), "advanced detect");
assert(!isAdvancedBuilderSession({ builder_mode: "normal" }), "normal detect");
assert(!isAdvancedBuilderSession({}), "default normal");

const bands = normalizeScoreBands(null);
assert(bands.length === DEFAULT_RESPONSE_TIME_SCORE_BANDS.length, "default bands");

assert(scoreFromResponseTimeBands(3000, null, { isCorrect: true }) === 500, "0-5s → 500");
assert(scoreFromResponseTimeBands(5000, null, { isCorrect: true }) === 500, "5s → 500");
assert(scoreFromResponseTimeBands(6000, null, { isCorrect: true }) === 400, "6s → 400");
assert(scoreFromResponseTimeBands(25000, null, { isCorrect: true }) === 100, "25s → 100");
assert(scoreFromResponseTimeBands(30000, null, { isCorrect: true }) === 50, "30s → 50");
assert(scoreFromResponseTimeBands(31000, null, { isCorrect: true }) === 0, "over → 0");
assert(scoreFromResponseTimeBands(1000, null, { isCorrect: false }) === 0, "wrong → 0");

const bands60 = buildScoreBandsForTimer(60, 6);
assert(bands60.length === 6, "60s → 6 bands");
assert(bands60[0].max_seconds === 10, "60s first band ≤10");
assert(bands60[5].max_seconds === 60, "60s last band ≤60");
assert(scoreFromResponseTimeBands(9000, bands60, { isCorrect: true }) === 500, "9s on 60s timer → top band");
assert(scoreFromResponseTimeBands(55000, bands60, { isCorrect: true }) === 50, "55s on 60s timer → last band");
assert(scoreFromResponseTimeBands(61000, bands60, { isCorrect: true }) === 0, "over 60s → 0");

const fromTimerDefault = normalizeScoreBands(null, 60);
assert(fromTimerDefault[fromTimerDefault.length - 1].max_seconds === 60, "null bands + 60s timer");

console.log("advancedBuilder scoring checks passed");
