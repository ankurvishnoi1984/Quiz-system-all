import { isRunningInIframe } from '../../../utils/iframeEmbed'
import { isParticipantEmbedPath } from '../../../utils/joinUrl'

export function PageCenteredShell({ children, maxWidth = 'max-w-lg', compact = null }) {
  const inIframe =
    compact == null
      ? isRunningInIframe() ||
        (typeof window !== 'undefined' && isParticipantEmbedPath(window.location.pathname))
      : Boolean(compact)
  return (
    <main
      className={`grid place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 ${
        inIframe
          ? 'min-h-dvh overflow-y-auto p-3 sm:p-4'
          : 'min-h-dvh p-6 md:min-h-screen'
      }`}
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl border border-blue-200/70 bg-white text-center shadow-sm ${
          inIframe ? 'p-5 sm:p-6' : 'p-8'
        }`}
      >
        {children}
      </div>
    </main>
  )
}
