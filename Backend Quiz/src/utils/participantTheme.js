const PARTICIPANT_THEME_IDS = Object.freeze([
  "default",
  "ocean",
  "meadow",
  "ember",
  "graphite",
  "custom"
]);

const DEFAULT_PARTICIPANT_THEME = "default";
const CUSTOM_PARTICIPANT_THEME = "custom";

const DEFAULT_CUSTOM_THEME_COLORS = Object.freeze({
  background: "#d7e4ee",
  topbar: "#ffffff",
  card: "#ffffff",
  accent: "#1b4b6b",
  accent_strong: "#12354a",
  topbar_text: "#0a1f2e",
  card_text: "#0a1f2e",
  background_image: null,
  topbar_image: null,
  card_image: null
});

const COLOR_KEYS = [
  "background",
  "topbar",
  "card",
  "accent",
  "accent_strong",
  "topbar_text",
  "card_text"
];

const IMAGE_KEYS = ["background_image", "topbar_image", "card_image"];

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX3 = /^#[0-9a-fA-F]{3}$/;

function normalizeHexColor(value, fallback) {
  const raw = String(value || "").trim();
  if (HEX6.test(raw)) return raw.toLowerCase();
  if (HEX3.test(raw)) {
    const a = raw[1];
    const b = raw[2];
    const c = raw[3];
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return String(fallback || "#000000").toLowerCase();
}

function normalizeImageUrl(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.length > 2048) return null;
  return raw;
}

function normalizeParticipantTheme(value) {
  const id = String(value || "")
    .trim()
    .toLowerCase();
  if (PARTICIPANT_THEME_IDS.includes(id)) return id;
  return DEFAULT_PARTICIPANT_THEME;
}

function normalizeCustomThemeColors(input) {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return { ...DEFAULT_CUSTOM_THEME_COLORS };
  }

  const legacySurface = input.surface ?? input.topbar;
  const legacyHeading = input.heading;
  return {
    background: normalizeHexColor(
      input.background ?? input.page_background,
      DEFAULT_CUSTOM_THEME_COLORS.background
    ),
    topbar: normalizeHexColor(
      input.topbar ?? legacySurface,
      DEFAULT_CUSTOM_THEME_COLORS.topbar
    ),
    card: normalizeHexColor(
      input.card ?? input.surface ?? legacySurface,
      DEFAULT_CUSTOM_THEME_COLORS.card
    ),
    accent: normalizeHexColor(input.accent, DEFAULT_CUSTOM_THEME_COLORS.accent),
    accent_strong: normalizeHexColor(
      input.accent_strong ?? input.accentStrong,
      DEFAULT_CUSTOM_THEME_COLORS.accent_strong
    ),
    topbar_text: normalizeHexColor(
      input.topbar_text ?? input.topbarText ?? legacyHeading,
      DEFAULT_CUSTOM_THEME_COLORS.topbar_text
    ),
    card_text: normalizeHexColor(
      input.card_text ?? input.cardText ?? legacyHeading,
      DEFAULT_CUSTOM_THEME_COLORS.card_text
    ),
    background_image: normalizeImageUrl(
      input.background_image ?? input.backgroundImage
    ),
    topbar_image: normalizeImageUrl(input.topbar_image ?? input.topbarImage),
    card_image: normalizeImageUrl(input.card_image ?? input.cardImage)
  };
}

function validateCustomThemeColors(input) {
  if (input === undefined) return null;
  if (input === null) return null;
  if (typeof input !== "object" || Array.isArray(input)) {
    return "participant_theme_custom must be an object or null";
  }

  const allowed = new Set([
    ...COLOR_KEYS,
    ...IMAGE_KEYS,
    "surface",
    "heading",
    "accentStrong",
    "page_background",
    "backgroundImage",
    "topbarImage",
    "cardImage",
    "topbarText",
    "cardText"
  ]);

  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      return `participant_theme_custom has invalid field: ${key}`;
    }
  }

  const colorProbe = {
    background: input.background ?? input.page_background,
    topbar: input.topbar ?? input.surface,
    card: input.card ?? input.surface,
    accent: input.accent,
    accent_strong: input.accent_strong ?? input.accentStrong,
    topbar_text: input.topbar_text ?? input.topbarText ?? input.heading,
    card_text: input.card_text ?? input.cardText ?? input.heading
  };

  for (const key of COLOR_KEYS) {
    if (colorProbe[key] === undefined || colorProbe[key] === null || colorProbe[key] === "") {
      continue;
    }
    const raw = String(colorProbe[key]).trim();
    if (!HEX6.test(raw) && !HEX3.test(raw)) {
      return `participant_theme_custom.${key} must be a hex color (#RGB or #RRGGBB)`;
    }
  }

  const imageProbe = {
    background_image: input.background_image ?? input.backgroundImage,
    topbar_image: input.topbar_image ?? input.topbarImage,
    card_image: input.card_image ?? input.cardImage
  };

  for (const key of IMAGE_KEYS) {
    if (imageProbe[key] === undefined || imageProbe[key] === null || imageProbe[key] === "") {
      continue;
    }
    if (typeof imageProbe[key] !== "string" || !String(imageProbe[key]).trim()) {
      return `participant_theme_custom.${key} must be a string URL or null`;
    }
    if (String(imageProbe[key]).trim().length > 2048) {
      return `participant_theme_custom.${key} is too long`;
    }
  }

  return null;
}

module.exports = {
  PARTICIPANT_THEME_IDS,
  DEFAULT_PARTICIPANT_THEME,
  CUSTOM_PARTICIPANT_THEME,
  DEFAULT_CUSTOM_THEME_COLORS,
  normalizeParticipantTheme,
  normalizeCustomThemeColors,
  validateCustomThemeColors
};
