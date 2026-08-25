import { Users } from 'lucide-react'
import { BrandLogoPair } from '../../../components/branding/BrandLogoPair'

export function SessionHeader({
  session,
  joinedUser,
  step,
  onStepChange,
  rankingsOnlyMode = false,
}) {
  const showParticipantCount = Boolean(session?.show_participant_count)
  const participantCount = Number(session?.participants_count)
  const hasParticipantCount =
    showParticipantCount && Number.isFinite(participantCount) && participantCount >= 0

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <BrandLogoPair
          variant="header"
          sessionLogoUrl={session?.logo_url}
          sessionTitle={session?.title || 'Session'}
          className="mb-2"
        />
        <h1 className="text-xl font-bold text-navy-900">{session.title}</h1>
        <p className="text-sm text-slate-600">
          {joinedUser?.name
            ? `${joinedUser.name}${!joinedUser.anonymous && joinedUser.email ? ` • ${joinedUser.email}` : ''}`
            : joinedUser?.anonymous
              ? 'Anonymous participant'
              : ''}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasParticipantCount ? (
          <div
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/80 px-3 py-2 text-sm font-semibold text-indigo-950"
            title="Participants currently joined"
          >
            <Users className="size-4 shrink-0 text-indigo-700" aria-hidden />
            <span className="tabular-nums">{participantCount}</span>
            <span className="text-xs font-medium text-indigo-800/80">
              participant{participantCount === 1 ? '' : 's'}
            </span>
          </div>
        ) : null}

        {!rankingsOnlyMode ? (
          <>
            <button
              type="button"
              onClick={() => onStepChange('active')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${step === 'active' ? 'bg-blue-100 text-blue-900' : 'border border-blue-200/70 bg-white text-slate-700'}`}
            >
              Questions
            </button>
            {/* Q&A feature disabled — re-enable when bringing Q&A back
            <button
              type="button"
              onClick={() => onStepChange('qa')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${step === 'qa' ? 'bg-blue-100 text-blue-900' : 'border border-blue-200/70 bg-white text-slate-700'}`}
            >
              Q&amp;A
            </button>
            */}
          </>
        ) : null}
      </div>
    </div>
  )
}
