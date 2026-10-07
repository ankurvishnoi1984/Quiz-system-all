const PARTICIPANT_THEME_IDS = Object.freeze([
  "default",
  "ocean",
  "meadow",
  "ember",
  "graphite"
]);

const DEFAULT_PARTICIPANT_THEME = "default";

function normalizeParticipantTheme(value) {
  const id = String(value || "")
    .trim()
    .toLowerCase();
  if (PARTICIPANT_THEME_IDS.includes(id)) return id;
  return DEFAULT_PARTICIPANT_THEME;
}

module.exports = {
  PARTICIPANT_THEME_IDS,
  DEFAULT_PARTICIPANT_THEME,
  normalizeParticipantTheme
};
