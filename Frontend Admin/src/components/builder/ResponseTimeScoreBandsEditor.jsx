import { formatScoreBandRange } from '../../utils/advancedScoreBands'

/**
 * Toggle + editor for session-level response-time score bands.
 * Enablement is persisted as non-null bands on the session.
 */
export function ResponseTimeScoreBandsEditor({
  enabled,
  onEnabledChange,
  scoreBands = [],
  scoreBandCount = 6,
  onScoreBandCountChange,
  poolTimeLimitSeconds = 0,
  isDraftSession = false,
  onPersistBands,
  onRebuildFromTimer,
  title = 'Response-time score bands',
  description,
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-700">{title}</p>
          {description ? <p className="mt-0.5 text-[11px] text-slate-500">{description}</p> : null}
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span>{enabled ? 'On' : 'Off'}</span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
            checked={Boolean(enabled)}
            disabled={!isDraftSession}
            onChange={(e) => onEnabledChange?.(e.target.checked)}
          />
        </label>
      </div>

      {!enabled ? (
        <p className="mt-2 text-[11px] text-slate-500">
          When off, each quiz question uses its fixed Points value. When on, faster correct answers
          earn more points from the ranges below.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              {poolTimeLimitSeconds > 0
                ? `Ranges divide the ${poolTimeLimitSeconds}s timer. Faster answers earn more points.`
                : 'Set a shared time limit first — ranges will divide that timer evenly (defaults to 30s).'}
            </p>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              Ranges
              <select
                disabled={!isDraftSession}
                value={scoreBandCount}
                onChange={(e) => {
                  const count = Number(e.target.value) || 6
                  onScoreBandCountChange?.(count)
                  onRebuildFromTimer?.(
                    poolTimeLimitSeconds > 0 ? poolTimeLimitSeconds : 30,
                    count,
                  )
                }}
                className="h-8 rounded-lg border border-emerald-200/70 bg-white px-2 text-xs disabled:bg-slate-50"
              >
                {[3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-2 space-y-2">
            {scoreBands.map((band, index) => (
              <div key={`band-${index}`} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="w-16 shrink-0 font-semibold text-slate-600">
                  {formatScoreBandRange(scoreBands, index)}
                </span>
                <span className="text-slate-400">→</span>
                <label className="flex items-center gap-1 text-slate-500">
                  ≤
                  <input
                    type="number"
                    min={index === 0 ? 1 : Number(scoreBands[index - 1]?.max_seconds || 0) + 1}
                    max={
                      index === scoreBands.length - 1
                        ? Math.max(poolTimeLimitSeconds || 30, band.max_seconds)
                        : undefined
                    }
                    disabled={!isDraftSession}
                    value={band.max_seconds}
                    onChange={(e) => {
                      const maxSeconds = Math.max(1, Number(e.target.value) || 1)
                      const next = scoreBands.map((row, i) =>
                        i === index ? { ...row, max_seconds: maxSeconds } : row,
                      )
                      for (let i = 1; i < next.length; i += 1) {
                        if (next[i].max_seconds <= next[i - 1].max_seconds) {
                          next[i] = {
                            ...next[i],
                            max_seconds: next[i - 1].max_seconds + 1,
                          }
                        }
                      }
                      if (poolTimeLimitSeconds > 0) {
                        next[next.length - 1] = {
                          ...next[next.length - 1],
                          max_seconds: Math.max(
                            next[next.length - 1].max_seconds,
                            poolTimeLimitSeconds,
                          ),
                        }
                      }
                      onPersistBands?.(next)
                    }}
                    className="h-8 w-14 rounded-lg border border-emerald-200/70 bg-white px-1.5 text-sm disabled:bg-slate-50"
                  />
                  s
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={!isDraftSession}
                  value={band.points}
                  onChange={(e) => {
                    const next = scoreBands.map((row, i) =>
                      i === index ? { ...row, points: Number(e.target.value) || 0 } : row,
                    )
                    onPersistBands?.(next)
                  }}
                  className="h-8 w-20 rounded-lg border border-emerald-200/70 bg-white px-2 text-sm disabled:bg-slate-50"
                />
                <span className="text-slate-500">pts</span>
              </div>
            ))}
          </div>

          {isDraftSession && poolTimeLimitSeconds > 0 ? (
            <button
              type="button"
              onClick={() => onRebuildFromTimer?.(poolTimeLimitSeconds, scoreBandCount, false)}
              className="mt-2 text-[11px] font-semibold text-emerald-800 underline-offset-2 hover:underline"
            >
              Reset ranges to even split of {poolTimeLimitSeconds}s
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}

export default ResponseTimeScoreBandsEditor
