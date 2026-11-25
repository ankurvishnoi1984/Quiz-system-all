import { Award, Download } from 'lucide-react'
import { CertificateDownloadButton } from '../../../components/participant-session/CertificateDownloadButton'

export function CertificateReadyPanel({
  sessionTitle = '',
  participantToken = null,
  sessionId = null,
}) {
  return (
    <section className="quiz-pop relative flex min-h-[min(60vh,28rem)] flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50 via-white to-sky-50/80 px-6 py-12 text-center shadow-sm">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-amber-100/70 to-transparent"
        aria-hidden
      />
      <div className="relative w-full">
        <div className="mx-auto mb-5 inline-flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-800 ring-4 ring-amber-50">
          <Award className="size-8" aria-hidden />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
          Well done
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          Save your achievement
        </h2>
        {sessionTitle ? (
          <p className="mt-3 text-base font-medium text-slate-700 sm:text-lg">{sessionTitle}</p>
        ) : null}
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
          Download a personalized certificate with your name. Keep it as a record of your
          participation in this session.
        </p>
        <CertificateDownloadButton
          enabled
          participantToken={participantToken}
          sessionId={sessionId}
          className="mt-6"
        />
        <p className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Download className="size-3.5 shrink-0" aria-hidden />
          Saves as a PNG image
        </p>
      </div>
    </section>
  )
}

export default CertificateReadyPanel
