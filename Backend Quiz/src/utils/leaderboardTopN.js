/** Allowed Top-N sizes for current / overall rankings. */
const LEADERBOARD_TOP_N_OPTIONS = [5, 10, 20, 30, 40, 50];
const DEFAULT_LEADERBOARD_TOP_N = 10;

/**
 * @param {unknown} value
 * @returns {number}
 */
function normalizeLeaderboardTopN(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_LEADERBOARD_TOP_N;
  const rounded = Math.floor(n);
  if (LEADERBOARD_TOP_N_OPTIONS.includes(rounded)) return rounded;
  return DEFAULT_LEADERBOARD_TOP_N;
}

/**
 * @param {{ leaderboard_top_n?: unknown } | null | undefined} session
 * @returns {number}
 */
function resolveLeaderboardTopN(session) {
  return normalizeLeaderboardTopN(session?.leaderboard_top_n);
}

module.exports = {
  LEADERBOARD_TOP_N_OPTIONS,
  DEFAULT_LEADERBOARD_TOP_N,
  normalizeLeaderboardTopN,
  resolveLeaderboardTopN
};
