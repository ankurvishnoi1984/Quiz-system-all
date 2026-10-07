export const DEFAULT_PARTICIPANT_THEME = 'default'

/** Five participant screen themes — `default` matches the current live look. */
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

const THEME_IDS = new Set(PARTICIPANT_THEMES.map((t) => t.id))

export function normalizeParticipantTheme(value) {
  const id = String(value || '')
    .trim()
    .toLowerCase()
  return THEME_IDS.has(id) ? id : DEFAULT_PARTICIPANT_THEME
}

export function getParticipantThemeMeta(value) {
  const id = normalizeParticipantTheme(value)
  return PARTICIPANT_THEMES.find((t) => t.id === id) || PARTICIPANT_THEMES[0]
}
