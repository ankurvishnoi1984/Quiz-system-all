/**
 * Build response-time score bands that divide a question timer into equal ranges.
 * Example: 60s + 6 bands → ≤10, ≤20, ≤30, ≤40, ≤50, ≤60 with descending points.
 */
export const DEFAULT_BAND_POINTS = [500, 400, 300, 200, 100, 50]

export function buildScoreBandsForTimer(timeLimitSeconds, bandCount = 6, pointsScale = DEFAULT_BAND_POINTS) {
  const limit = Math.max(1, Math.floor(Number(timeLimitSeconds) || 30))
  const count = Math.min(8, Math.max(2, Math.floor(Number(bandCount) || 6)))
  const step = limit / count
  const points =
    Array.isArray(pointsScale) && pointsScale.length ? pointsScale : DEFAULT_BAND_POINTS

  const bands = []
  for (let i = 0; i < count; i += 1) {
    const maxSeconds = i === count - 1 ? limit : Math.max(1, Math.round(step * (i + 1)))
    let pts
    if (points.length === count) {
      pts = Math.round(Number(points[i]) || 0)
    } else {
      const top = Number(points[0]) || 500
      const bottom = Number(points[points.length - 1]) || 50
      const t = i / Math.max(1, count - 1)
      pts = Math.round(top * (1 - t) + bottom * t)
    }
    bands.push({ max_seconds: maxSeconds, points: pts })
  }

  for (let i = 1; i < bands.length; i += 1) {
    if (bands[i].max_seconds <= bands[i - 1].max_seconds) {
      bands[i].max_seconds = bands[i - 1].max_seconds + 1
    }
  }
  bands[bands.length - 1].max_seconds = Math.max(bands[bands.length - 1].max_seconds, limit)
  return bands
}

/** Human-readable inclusive range label for a band. */
export function formatScoreBandRange(bands, index) {
  const band = bands?.[index]
  if (!band) return ''
  const end = Number(band.max_seconds)
  if (index === 0) return `0–${end}s`
  const prevMax = Number(bands[index - 1].max_seconds)
  return `${prevMax}–${end}s`
}

export function resolveUniformPoolTimeLimit(questions = []) {
  const timed = (questions || []).filter((q) => q.type !== 'Survey')
  if (!timed.length) return 0
  const limits = timed.map((q) => Number(q.timeLimitSeconds) || 0)
  const first = limits[0]
  if (limits.every((v) => v === first)) return first
  return 0
}
