import {
  CUSTOM_PARTICIPANT_THEME,
  DEFAULT_CUSTOM_THEME_COLORS,
  DEFAULT_PARTICIPANT_THEME,
  normalizeCustomThemeColors,
  normalizeParticipantTheme,
  toCustomThemeColorsApi,
} from './participantTheme'

export const PRESENT_THEME_MODE_MIRROR = 'mirror_participant'
export const PRESENT_THEME_MODE_CUSTOM = 'custom_present'
export const DEFAULT_PRESENT_THEME_MODE = PRESENT_THEME_MODE_MIRROR

export function normalizePresentThemeMode(value) {
  const mode = String(value || '')
    .trim()
    .toLowerCase()
  if (mode === PRESENT_THEME_MODE_CUSTOM) return PRESENT_THEME_MODE_CUSTOM
  return PRESENT_THEME_MODE_MIRROR
}

/**
 * Resolve which theme Present Mode should render from a session record.
 * @returns {{ themeId: string, customColors: object|null, mode: string }}
 */
export function resolvePresentTheme(session) {
  const mode = normalizePresentThemeMode(session?.present_theme_mode)
  if (mode === PRESENT_THEME_MODE_MIRROR) {
    const themeId = normalizeParticipantTheme(session?.participant_theme)
    return {
      mode,
      themeId,
      customColors:
        themeId === CUSTOM_PARTICIPANT_THEME
          ? normalizeCustomThemeColors(session?.participant_theme_custom)
          : session?.participant_theme_custom
            ? normalizeCustomThemeColors(session.participant_theme_custom)
            : null,
    }
  }

  const themeId = normalizeParticipantTheme(session?.present_theme)
  return {
    mode,
    themeId,
    customColors:
      themeId === CUSTOM_PARTICIPANT_THEME
        ? normalizeCustomThemeColors(session?.present_theme_custom)
        : session?.present_theme_custom
          ? normalizeCustomThemeColors(session.present_theme_custom)
          : null,
  }
}

export function defaultPresentThemeCustom() {
  return { ...DEFAULT_CUSTOM_THEME_COLORS }
}

export function toPresentThemeApi({
  presentThemeMode,
  presentTheme,
  presentThemeCustom,
} = {}) {
  const mode = normalizePresentThemeMode(presentThemeMode)
  const theme = normalizeParticipantTheme(presentTheme || DEFAULT_PARTICIPANT_THEME)
  return {
    present_theme_mode: mode,
    present_theme: theme,
    present_theme_custom:
      mode === PRESENT_THEME_MODE_CUSTOM && theme === CUSTOM_PARTICIPANT_THEME
        ? toCustomThemeColorsApi(presentThemeCustom || DEFAULT_CUSTOM_THEME_COLORS)
        : mode === PRESENT_THEME_MODE_CUSTOM && presentThemeCustom
          ? toCustomThemeColorsApi(presentThemeCustom)
          : null,
  }
}
