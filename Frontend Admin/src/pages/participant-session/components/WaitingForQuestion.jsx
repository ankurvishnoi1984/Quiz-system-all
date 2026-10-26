import { Clock3 } from 'lucide-react'
import { getQuestionMediaKindFromApiType, resolveQuestionMediaUrl } from '../../../utils/questionMedia'

function WaitingMedia({ waitingImageUrl = '', waitingMediaType = null }) {
  const src = resolveQuestionMediaUrl(waitingImageUrl)
  if (!src) return null

  const kind = getQuestionMediaKindFromApiType(waitingMediaType || 'image')
  const wrapClass =
    'mx-auto flex w-full max-w-4xl items-center justify-center overflow-hidden rounded-xl bg-slate-50'
  const mediaClass = 'max-h-[min(78vh,42rem)] w-full object-contain'

  if (kind === 'video') {
    return (
      <div className={wrapClass}>
        <video
          src={src}
          autoPlay
          loop
          playsInline
          className={mediaClass}
        />
      </div>
    )
  }

  if (kind === 'audio') {
    return (
      <div className={`${wrapClass} px-4 py-4`}>
        <audio src={src} controls className="w-full" />
      </div>
    )
  }

  return (
    <div className={wrapClass}>
      <img src={src} alt="" className={mediaClass} />
    </div>
  )
}

export function WaitingForQuestion({
  quizTotalWaiting = false,
  waitingImageUrl = '',
  waitingMediaType = null,
}) {
  const hasMedia = Boolean(waitingImageUrl)

  if (quizTotalWaiting) {
    return (
      <section className="participant-surface quiz-enter flex w-full flex-col items-center justify-center space-y-3 rounded-2xl border border-blue-200/70 bg-white p-3 text-center shadow-sm shadow-navy-900/5 sm:p-4">
        {hasMedia ? (
          <WaitingMedia
            waitingImageUrl={waitingImageUrl}
            waitingMediaType={waitingMediaType}
          />
        ) : (
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Clock3 className="size-7 animate-pulse" />
          </div>
        )}
        <h2 className="text-lg font-bold text-navy-900 sm:text-xl">Quiz will start soon</h2>
        <p className="max-w-xl text-sm text-slate-600">
          The host will activate the quiz for everyone. This page updates automatically when it
          starts.
        </p>
      </section>
    )
  }

  return (
    <section className="participant-surface quiz-enter space-y-4 rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm shadow-navy-900/5">
      {hasMedia ? (
        <WaitingMedia
          waitingImageUrl={waitingImageUrl}
          waitingMediaType={waitingMediaType}
        />
      ) : (
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <Clock3 className="size-7 animate-pulse" />
        </div>
      )}
      <h2 className="text-xl font-bold text-navy-900">Waiting for a question</h2>
      <p className="text-sm text-slate-600">
        The host will open each question one at a time. This page updates automatically when a
        question is activated.
      </p>
    </section>
  )
}
