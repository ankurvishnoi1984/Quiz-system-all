import { LeaderboardModalShell } from './LeaderboardModalShell'
import { LeaderboardTable } from './LeaderboardTable'

export function SessionLeaderboardModal({
  open,
  onClose,
  entries,
  limit,
  onLimitChange,
  fullscreen = false,
}) {
  return (
    <LeaderboardModalShell
      open={open}
      onClose={onClose}
      eyebrow="Rankings"
      title={`Top ${limit}`}
      limit={limit}
      onLimitChange={onLimitChange}
      limitSelectId="session-leaderboard-limit"
      fullscreen={fullscreen}
    >
      <LeaderboardTable
        entries={entries}
        emptyMessage="Rankings will appear once responses start coming in."
      />
    </LeaderboardModalShell>
  )
}
