/** Five rotating rank palettes — rank 1→0, rank 6→0 again, etc. */
export const RANK_PALETTES = [
  {
    // Amber / gold
    row: 'border-amber-300/70 bg-amber-50/70',
    badge: 'bg-linear-to-br from-amber-400 to-amber-600',
    score: 'text-amber-900',
    scoreMuted: 'text-amber-700/80',
    timeRing: 'ring-amber-200/80',
  },
  {
    // Sky / blue
    row: 'border-sky-300/70 bg-sky-50/70',
    badge: 'bg-linear-to-br from-sky-400 to-sky-700',
    score: 'text-sky-900',
    scoreMuted: 'text-sky-700/80',
    timeRing: 'ring-sky-200/80',
  },
  {
    // Emerald / green
    row: 'border-emerald-300/70 bg-emerald-50/70',
    badge: 'bg-linear-to-br from-emerald-400 to-emerald-700',
    score: 'text-emerald-900',
    scoreMuted: 'text-emerald-700/80',
    timeRing: 'ring-emerald-200/80',
  },
  {
    // Violet / purple
    row: 'border-violet-300/70 bg-violet-50/70',
    badge: 'bg-linear-to-br from-violet-400 to-violet-700',
    score: 'text-violet-900',
    scoreMuted: 'text-violet-700/80',
    timeRing: 'ring-violet-200/80',
  },
  {
    // Rose / pink
    row: 'border-rose-300/70 bg-rose-50/70',
    badge: 'bg-linear-to-br from-rose-400 to-rose-700',
    score: 'text-rose-900',
    scoreMuted: 'text-rose-700/80',
    timeRing: 'ring-rose-200/80',
  },
]

export function paletteForRank(displayRank) {
  const n = Number(displayRank)
  if (!Number.isFinite(n) || n < 1) return RANK_PALETTES[0]
  return RANK_PALETTES[(n - 1) % RANK_PALETTES.length]
}
