import { Clock3, Crown } from 'lucide-react'
import { normalizeLeaderboardEntries } from '../../../utils/leaderboard'
import { paletteForRank } from '../../../utils/rankingPalettes'
import { formatQuizSubmitTimeParticipant } from '../../../utils/quizResponseTime'

const TIME_HINTS = {
  question: 'Time taken on this question · e.g. 7.123 s/ms',
  session: 'Average time across answered questions · e.g. 7.123 s/ms',
}

function RankingTimeBadge({ responseTimeMs, timeMode, ringClass = 'ring-amber-200/70' }) {
  if (responseTimeMs == null) {
    return <span className="text-[11px] font-medium text-slate-400">—</span>
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-slate-600 ring-1 ${ringClass}`}
      title={
        timeMode === 'session'
          ? 'Average response time across all answered questions'
          : 'Time taken to answer this question'
      }
    >
      <Clock3 className="size-3 shrink-0 text-slate-400" aria-hidden />
      {timeMode === 'session' ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">avg</span>
      ) : null}
      {formatQuizSubmitTimeParticipant(responseTimeMs)}
    </span>
  )
}

function RankingRow({
  row,
  displayRank,
  highlighted = false,
  compact = false,
  timeMode = 'question',
  animationIndex = 0,
  youLabel = false,
}) {
  const rowPadding = compact ? 'px-3 py-2' : 'px-4 py-3'
  const isFirst = Number(displayRank) === 1
  const palette = paletteForRank(displayRank)

  return (
    <div
      className={`quiz-row-in flex items-center justify-between gap-3 rounded-2xl border ${rowPadding} ${
        palette.row
      } ${highlighted ? 'ring-2 ring-navy-700/35 shadow-md' : ''}`}
      style={{ animationDelay: `${animationIndex * 55}ms` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold text-white ${palette.badge}`}
        >
          {isFirst ? <Crown className="size-3.5" aria-hidden /> : displayRank}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">
            {row.name}
            {youLabel || highlighted ? (
              <span className="ml-2 rounded-md bg-navy-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                You
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className={`text-sm font-bold tabular-nums ${palette.score}`}>
          {row.score}
          <span className={`ml-1 text-xs font-semibold ${palette.scoreMuted}`}>pts</span>
        </p>
        <RankingTimeBadge
          responseTimeMs={row.responseTimeMs}
          timeMode={timeMode}
          ringClass={palette.timeRing}
        />
      </div>
    </div>
  )
}

export function ParticipantRankingList({
  entries,
  emptyMessage = 'No rankings yet.',
  timeMode = 'question',
  limit = null,
  compact = false,
  highlightParticipantId = null,
  viewerEntry = null,
}) {
  const rows = normalizeLeaderboardEntries(entries)
  const topLimit = limit != null ? limit : rows.length
  const topRows = rows.slice(0, topLimit)

  const highlightId =
    highlightParticipantId != null && Number.isFinite(Number(highlightParticipantId))
      ? Number(highlightParticipantId)
      : viewerEntry?.participant_id != null
        ? Number(viewerEntry.participant_id)
        : null

  const viewerInTop =
    highlightId != null && topRows.some((row) => Number(row.participant_id) === highlightId)

  const pinnedViewer =
    !viewerInTop && viewerEntry != null
      ? {
          participant_id: viewerEntry.participant_id,
          name: viewerEntry.name || viewerEntry.nickname || 'You',
          score: Number(viewerEntry.score ?? 0),
          responseTimeMs:
            viewerEntry.responseTimeMs ??
            viewerEntry.response_time_ms ??
            viewerEntry.avg_response_time_ms ??
            null,
          rank: Number(viewerEntry.rank) || null,
        }
      : null

  if (!topRows.length && !pinnedViewer) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>
  }

  const hasAnyTime =
    topRows.some((row) => row.responseTimeMs != null) ||
    pinnedViewer?.responseTimeMs != null

  return (
    <div className="space-y-2">
      {pinnedViewer ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-700">Your rank</p>
          <RankingRow
            row={pinnedViewer}
            displayRank={pinnedViewer.rank || '—'}
            highlighted
            compact={compact}
            timeMode={timeMode}
            animationIndex={0}
            youLabel
          />
          {topRows.length ? (
            <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Top {topLimit}
            </p>
          ) : null}
        </div>
      ) : null}

      {topRows.map((row, idx) => {
        const isYou = highlightId != null && Number(row.participant_id) === highlightId
        return (
          <RankingRow
            key={row.participant_id}
            row={row}
            displayRank={idx + 1}
            highlighted={isYou}
            compact={compact}
            timeMode={timeMode}
            animationIndex={idx + (pinnedViewer ? 1 : 0)}
            youLabel={isYou}
          />
        )
      })}

      {hasAnyTime ? (
        <p className="pt-1 text-center text-xs text-slate-500">{TIME_HINTS[timeMode]}</p>
      ) : null}
    </div>
  )
}
