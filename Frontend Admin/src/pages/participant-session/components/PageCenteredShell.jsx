import { isRunningInIframe } from '../../../utils/iframeEmbed'
import { isParticipantEmbedPath } from '../../../utils/joinUrl'
import { normalizeParticipantTheme } from '../../../utils/participantTheme'

export function PageCenteredShell({
  children,
  maxWidth = 'max-w-lg',
  compact = null,
  theme = 'default',
}) {
  const inIframe =
    compact == null
      ? isRunningInIframe() ||
        (typeof window !== 'undefined' && isParticipantEmbedPath(window.location.pathname))
      : Boolean(compact)
  return (
    <main
      className={`participant-session-bg grid place-items-center ${
        inIframe
          ? 'min-h-dvh overflow-y-auto p-3 sm:p-4'
          : 'min-h-dvh p-6 md:min-h-screen'
      }`}
      data-participant-theme={normalizeParticipantTheme(theme)}
    >
      <div
        className={`participant-surface w-full ${maxWidth} rounded-2xl border border-blue-200/70 bg-white/92 text-center shadow-sm shadow-navy-900/5 backdrop-blur-sm ${
          inIframe ? 'p-5 sm:p-6' : 'p-8'
        }`}
      >
        {children}
      </div>
    </main>
  )
}
