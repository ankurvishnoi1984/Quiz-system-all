import { isRunningInIframe } from '../../../utils/iframeEmbed'
import { isParticipantEmbedPath } from '../../../utils/joinUrl'
import {
  buildParticipantThemeStyle,
  normalizeParticipantTheme,
} from '../../../utils/participantTheme'

export function PageCenteredShell({
  children,
  maxWidth = 'max-w-lg',
  compact = null,
  theme = 'default',
  customTheme = null,
}) {
  const inIframe =
    compact == null
      ? isRunningInIframe() ||
        (typeof window !== 'undefined' && isParticipantEmbedPath(window.location.pathname))
      : Boolean(compact)
  const themeId = normalizeParticipantTheme(theme)
  const themeStyle = buildParticipantThemeStyle(themeId, customTheme)

  return (
    <main
      className={`participant-session-bg grid place-items-center ${
        inIframe
          ? 'h-dvh min-h-dvh overflow-x-hidden overflow-y-auto overscroll-y-contain p-3 pb-8 sm:p-4'
          : 'h-dvh min-h-dvh overflow-x-hidden overflow-y-auto overscroll-y-contain p-6 pb-[max(2rem,env(safe-area-inset-bottom))] md:h-auto md:min-h-screen md:overflow-visible md:pb-6'
      }`}
      data-participant-theme={themeId}
      style={themeStyle}
    >
      <div
        className={`participant-surface w-full ${maxWidth} rounded-2xl border border-blue-200/70 bg-white text-center shadow-sm shadow-navy-900/5 ${
          inIframe ? 'p-5 sm:p-6' : 'p-8'
        }`}
      >
        {children}
      </div>
    </main>
  )
}
