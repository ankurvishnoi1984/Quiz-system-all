import { Crown, Clock3 } from 'lucide-react'
import { normalizeLeaderboardEntries } from '../../utils/leaderboard'
import { paletteForRank } from '../../utils/rankingPalettes'
import { formatQuizSubmitTimeParticipant } from '../../utils/quizResponseTime'

/**
 * @param {{
 *   entries: Array,
 *   emptyMessage?: string,
 *   compact?: boolean,
 *   timeMode?: 'question' | 'session',
 * }} props
 */
export function LeaderboardTable({
  entries,
  emptyMessage = 'No scores yet.',
  compact = false,
  timeMode = 'session',
}) {
  const rows = normalizeLeaderboardEntries(entries)
  const hasAnyTime = rows.some((row) => row.responseTimeMs != null)

  if (!rows.length) {
    return <p className="py-4 text-center text-sm text-slate-500">{emptyMessage}</p>
  }

  const rowPadding = compact ? 'px-3 py-2' : 'px-4 py-3'
  const rankSize = compact ? 'size-8 text-sm' : 'size-9'

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => {
        const displayRank = idx + 1
        const palette = paletteForRank(displayRank)
        return (
          <div
            key={row.participant_id}
            className={`flex items-center justify-between gap-3 rounded-2xl border ${palette.row} ${rowPadding}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`grid shrink-0 place-items-center rounded-2xl text-white ${palette.badge} ${rankSize}`}
              >
                {idx === 0 ? <Crown className={compact ? 'size-3.5' : 'size-4'} /> : displayRank}
              </div>
              <p className="truncate font-semibold text-navy-900">{row.name || 'Anonymous'}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <p className={`text-sm font-bold tabular-nums ${palette.score}`}>
                {row.score}
                <span className={`ml-1 text-xs font-semibold ${palette.scoreMuted}`}>pts</span>
              </p>
              {row.responseTimeMs != null ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-slate-600 ring-1 ${palette.timeRing}`}
                  title={
                    timeMode === 'session'
                      ? 'Average response time across answered questions'
                      : 'Time taken to answer this question'
                  }
                >
                  <Clock3 className="size-3 shrink-0 text-slate-400" aria-hidden />
                  {timeMode === 'session' ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      avg
                    </span>
                  ) : null}
                  {formatQuizSubmitTimeParticipant(row.responseTimeMs)}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-400">—</span>
              )}
            </div>
          </div>
        )
      })}
      {hasAnyTime ? (
        <p className="pt-1 text-center text-xs text-slate-500">
          {timeMode === 'session'
            ? 'Average time across answered questions · e.g. 7.123 s/ms'
            : 'Time taken on this question · e.g. 7.123 s/ms'}
        </p>
      ) : null}
    </div>
  )
}
