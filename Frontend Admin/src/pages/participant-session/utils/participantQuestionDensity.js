/** Density steps so Submit stays in the viewport without scrolling (esp. mobile + media). */

import {
  PARTICIPANT_OPTION_MIN_PX,
  PARTICIPANT_TITLE_MIN_PX,
} from '../../../utils/questionTextLimits'

export const PARTICIPANT_DENSITY_LEVELS = [
  {
    id: 0,
    title: { minPx: PARTICIPANT_TITLE_MIN_PX, maxPx: 24, maxLines: 4 },
    option: { minPx: PARTICIPANT_OPTION_MIN_PX, maxPx: 14, maxLines: 4 },
    mediaMaxHeightClass: 'max-h-72',
    panelClass: 'space-y-4 p-5',
    optionPadClass: 'px-4 py-4',
  },
  {
    id: 1,
    title: { minPx: PARTICIPANT_TITLE_MIN_PX, maxPx: 20, maxLines: 3 },
    option: { minPx: PARTICIPANT_OPTION_MIN_PX, maxPx: 13, maxLines: 3 },
    mediaMaxHeightClass: 'max-h-40',
    panelClass: 'space-y-3 p-4',
    optionPadClass: 'px-3.5 py-3',
  },
  {
    id: 2,
    title: { minPx: PARTICIPANT_TITLE_MIN_PX, maxPx: 17, maxLines: 2 },
    option: { minPx: PARTICIPANT_OPTION_MIN_PX, maxPx: 13, maxLines: 2 },
    mediaMaxHeightClass: 'max-h-36',
    panelClass: 'space-y-2.5 p-3.5',
    optionPadClass: 'px-3 py-2.5',
  },
  {
    id: 3,
    title: { minPx: PARTICIPANT_TITLE_MIN_PX, maxPx: 15, maxLines: 2 },
    option: { minPx: PARTICIPANT_OPTION_MIN_PX, maxPx: 12, maxLines: 2 },
    mediaMaxHeightClass: 'max-h-28',
    panelClass: 'space-y-2 p-3',
    optionPadClass: 'px-3 py-2',
  },
]

export function getParticipantDensityLevel(id) {
  const idx = Math.max(0, Math.min(PARTICIPANT_DENSITY_LEVELS.length - 1, Number(id) || 0))
  return PARTICIPANT_DENSITY_LEVELS[idx]
}

/** Visible bottom edge of the browser viewport (mobile-friendly). */
export function getVisibleViewportBottom() {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (vv) return vv.offsetTop + vv.height
  return window.innerHeight
}
