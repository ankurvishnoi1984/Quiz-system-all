import {
  normalizeQuestionMediaUrlForStorage,
  resolveQuestionMediaUrl,
} from './questionMedia'

export const DEFAULT_PARTICIPANT_THEME = 'default'
export const CUSTOM_PARTICIPANT_THEME = 'custom'

/** Five preset themes + Custom — `default` matches the current live look. */
export const PARTICIPANT_THEMES = [
  {
    id: 'default',
    label: 'Harbor',
    description: 'Soft navy lattice — current default',
    swatch: ['#cfdfe9', '#1b4b6b', '#3d7fa0'],
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep teal waves and cool depth',
    swatch: ['#b8d9e8', '#0e7490', '#155e75'],
  },
  {
    id: 'meadow',
    label: 'Meadow',
    description: 'Fresh green geometric wash',
    swatch: ['#d8efe3', '#047857', '#059669'],
  },
  {
    id: 'ember',
    label: 'Ember',
    description: 'Warm rose accents on soft mist',
    swatch: ['#f3e4e6', '#be123c', '#9f1239'],
  },
  {
    id: 'graphite',
    label: 'Graphite',
    description: 'Neutral slate professional look',
    swatch: ['#e2e8f0', '#334155', '#64748b'],
  },
]

export const CUSTOM_THEME_META = {
  id: CUSTOM_PARTICIPANT_THEME,
  label: 'Custom',
  description: 'Your own background, top bar, and accent colors',
}

/** Defaults seeded from Harbor when creating a custom theme. */
export const DEFAULT_CUSTOM_THEME_COLORS = Object.freeze({
  background: '#d7e4ee',
  topbar: '#ffffff',
  card: '#ffffff',
  accent: '#1b4b6b',
  accentStrong: '#12354a',
  topbarText: '#0a1f2e',
  cardText: '#0a1f2e',
  backgroundImage: null,
  topbarImage: null,
  cardImage: null,
})

/** Color-only fields (no image upload). */
export const CUSTOM_THEME_ACCENT_FIELDS = [
  {
    key: 'accent',
    label: 'Accent',
    description: 'Buttons, timer ring, selected options',
  },
  {
    key: 'accentStrong',
    label: 'Accent dark',
    description: 'Primary button gradient end',
  },
  {
    key: 'topbarText',
    label: 'Top bar text',
    description: 'Session header titles and labels',
  },
  {
    key: 'cardText',
    label: 'Card text',
    description: 'Question titles and card labels',
  },
]

/** Surfaces that support color + optional background image. */
export const CUSTOM_THEME_SURFACE_FIELDS = [
  {
    key: 'background',
    imageKey: 'backgroundImage',
    label: 'Page background',
    description: 'Main screen wash behind questions',
  },
  {
    key: 'topbar',
    imageKey: 'topbarImage',
    label: 'Top bar',
    description: 'Session header bar',
  },
  {
    key: 'card',
    imageKey: 'cardImage',
    label: 'Card',
    description: 'Question and content cards',
  },
]

/** @deprecated use CUSTOM_THEME_SURFACE_FIELDS + CUSTOM_THEME_ACCENT_FIELDS */
export const CUSTOM_THEME_COLOR_FIELDS = [
  ...CUSTOM_THEME_SURFACE_FIELDS.map(({ key, label, description }) => ({
    key,
    label,
    description,
  })),
  ...CUSTOM_THEME_ACCENT_FIELDS,
]

const PRESET_THEME_IDS = new Set(PARTICIPANT_THEMES.map((t) => t.id))
const ALL_THEME_IDS = new Set([...PRESET_THEME_IDS, CUSTOM_PARTICIPANT_THEME])

const HEX6 = /^#[0-9a-fA-F]{6}$/
const HEX3 = /^#[0-9a-fA-F]{3}$/

export function normalizeHexColor(value, fallback = '#000000') {
  const raw = String(value || '').trim()
  if (HEX6.test(raw)) return raw.toLowerCase()
  if (HEX3.test(raw)) {
    const a = raw[1]
    const b = raw[2]
    const c = raw[3]
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase()
  }
  return String(fallback).toLowerCase()
}

function parseRgb(hex) {
  const h = normalizeHexColor(hex).slice(1)
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export function hexToRgba(hex, alpha) {
  const { r, g, b } = parseRgb(hex)
  const a = Math.min(1, Math.max(0, Number(alpha) || 0))
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function mixWithWhite(hex, whiteAmount = 0.88) {
  const { r, g, b } = parseRgb(hex)
  const w = Math.min(1, Math.max(0, whiteAmount))
  const mix = (channel) => Math.round(channel * (1 - w) + 255 * w)
  const toHex = (n) => n.toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

function normalizeThemeImageUrl(value) {
  if (value == null || value === '') return null
  const stored = normalizeQuestionMediaUrlForStorage(String(value).trim())
  if (stored) return stored
  const raw = String(value).trim()
  return raw || null
}

function cssUrl(value) {
  const resolved = resolveQuestionMediaUrl(value)
  if (!resolved) return 'none'
  const escaped = resolved.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `url("${escaped}")`
}

export function normalizeParticipantTheme(value) {
  const id = String(value || '')
    .trim()
    .toLowerCase()
  return ALL_THEME_IDS.has(id) ? id : DEFAULT_PARTICIPANT_THEME
}

export function isCustomParticipantTheme(value) {
  return normalizeParticipantTheme(value) === CUSTOM_PARTICIPANT_THEME
}

/** UI/camelCase shape with defaults. */
export function normalizeCustomThemeColors(input) {
  const base = { ...DEFAULT_CUSTOM_THEME_COLORS }
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return base
  }

  const legacySurface = input.surface ?? input.topbar
  base.background = normalizeHexColor(
    input.background ?? input.page_background,
    base.background,
  )
  base.topbar = normalizeHexColor(
    input.topbar ?? legacySurface,
    base.topbar,
  )
  base.card = normalizeHexColor(
    input.card ?? input.surface ?? legacySurface,
    base.card,
  )
  base.accent = normalizeHexColor(input.accent, base.accent)
  base.accentStrong = normalizeHexColor(
    input.accentStrong ?? input.accent_strong,
    base.accentStrong,
  )
  const legacyHeading = input.heading
  base.topbarText = normalizeHexColor(
    input.topbarText ?? input.topbar_text ?? legacyHeading,
    base.topbarText,
  )
  base.cardText = normalizeHexColor(
    input.cardText ?? input.card_text ?? legacyHeading,
    base.cardText,
  )
  base.backgroundImage = normalizeThemeImageUrl(
    input.backgroundImage ?? input.background_image,
  )
  base.topbarImage = normalizeThemeImageUrl(
    input.topbarImage ?? input.topbar_image,
  )
  base.cardImage = normalizeThemeImageUrl(input.cardImage ?? input.card_image)
  return base
}

/** Payload for create/update session API. */
export function toCustomThemeColorsApi(input) {
  const c = normalizeCustomThemeColors(input)
  return {
    background: c.background,
    topbar: c.topbar,
    card: c.card,
    accent: c.accent,
    accent_strong: c.accentStrong,
    topbar_text: c.topbarText,
    card_text: c.cardText,
    background_image: c.backgroundImage,
    topbar_image: c.topbarImage,
    card_image: c.cardImage,
  }
}

export function getParticipantThemeMeta(value, customColors) {
  const id = normalizeParticipantTheme(value)
  if (id === CUSTOM_PARTICIPANT_THEME) {
    const colors = normalizeCustomThemeColors(customColors)
    return {
      ...CUSTOM_THEME_META,
      swatch: [colors.background, colors.accent, colors.accentStrong],
      colors,
    }
  }
  return PARTICIPANT_THEMES.find((t) => t.id === id) || PARTICIPANT_THEMES[0]
}

/**
 * Inline CSS variables + background for a custom theme root.
 * Presets rely on stylesheet rules — returns undefined for them.
 */
export function buildParticipantThemeStyle(themeId, customColors) {
  if (!isCustomParticipantTheme(themeId)) return undefined
  const c = normalizeCustomThemeColors(customColors)
  const accentSoft = mixWithWhite(c.accent, 0.9)
  const optionHover = mixWithWhite(c.accent, 0.93)
  const optionSelected = mixWithWhite(c.accent, 0.86)
  const badgeBg = mixWithWhite(c.accent, 0.82)
  const timerTrack = mixWithWhite(c.accent, 0.85)
  const secondaryHover = mixWithWhite(c.accent, 0.94)
  const bgMid = mixWithWhite(c.background, 0.35)
  const bgLight = mixWithWhite(c.background, 0.55)
  const pageImage = c.backgroundImage ? cssUrl(c.backgroundImage) : null
  const topbarImage = c.topbarImage ? cssUrl(c.topbarImage) : null
  const cardImage = c.cardImage ? cssUrl(c.cardImage) : null

  // Image is the top layer; color sits behind so transparent PNGs show the color through.
  const pageLayers = pageImage
    ? [pageImage]
    : [
        `radial-gradient(ellipse 100% 70% at 0% 0%, ${hexToRgba(c.accent, 0.22)}, transparent 55%)`,
        `radial-gradient(ellipse 80% 55% at 100% 0%, ${hexToRgba(c.accent, 0.18)}, transparent 50%)`,
        `radial-gradient(ellipse 70% 50% at 80% 100%, ${hexToRgba(c.accentStrong, 0.1)}, transparent 55%)`,
        `linear-gradient(160deg, ${c.background} 0%, ${bgMid} 38%, ${bgLight} 68%, ${c.background} 100%)`,
      ]

  return {
    '--participant-orb-a': pageImage ? 'transparent' : hexToRgba(c.accent, 0.28),
    '--participant-orb-b': pageImage ? 'transparent' : hexToRgba(c.accentStrong, 0.22),
    '--pt-accent': c.accent,
    '--pt-accent-strong': c.accentStrong,
    '--pt-accent-soft': accentSoft,
    '--pt-heading': c.cardText,
    '--pt-topbar-text': c.topbarText,
    '--pt-card-text': c.cardText,
    '--pt-topbar': c.topbar,
    '--pt-topbar-image': topbarImage || 'none',
    '--pt-surface': c.card,
    '--pt-surface-image': cardImage || 'none',
    '--pt-surface-border': hexToRgba(c.accent, 0.22),
    '--pt-surface-shadow': `0 1px 2px ${hexToRgba(c.cardText, 0.06)}`,
    '--pt-option-bg': hexToRgba(c.card, 0.96),
    '--pt-option-border': hexToRgba(c.accent, 0.2),
    '--pt-option-hover-bg': optionHover,
    '--pt-option-selected-bg': optionSelected,
    '--pt-option-selected-ring': hexToRgba(c.accent, 0.22),
    '--pt-badge-bg': badgeBg,
    '--pt-badge-fg': c.accent,
    '--pt-timer-track': timerTrack,
    '--pt-btn-secondary-bg': c.card,
    '--pt-btn-secondary-border': hexToRgba(c.accent, 0.2),
    '--pt-btn-secondary-hover': secondaryHover,
    backgroundColor: c.background,
    backgroundImage: pageLayers.join(', '),
    backgroundSize: pageImage ? 'cover' : undefined,
    backgroundPosition: pageImage ? 'center' : undefined,
    backgroundRepeat: pageImage ? 'no-repeat' : undefined,
  }
}
