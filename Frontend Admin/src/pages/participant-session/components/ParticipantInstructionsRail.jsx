import { useEffect, useId, useState } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { splitInstructionTitle } from '../../present-mode/PresentInstructionsPanel'

/**
 * Left-edge collapsible instructions for the participant live quiz.
 * Default collapsed so the question stays primary.
 */
export function ParticipantInstructionsRail({ instructions = [] }) {
  const list = Array.isArray(instructions) ? instructions : []
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()

  useEffect(() => {
    if (!expanded) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  if (!list.length) return null

  if (!expanded) {
    return (
      <button
        type="button"
        aria-expanded={false}
        aria-controls={panelId}
        aria-label="Show instructions"
        onClick={() => setExpanded(true)}
        className="fixed left-0 top-[min(28%,12rem)] z-40 flex flex-col items-center gap-2 rounded-r-xl border border-l-0 border-navy-800/30 bg-navy-900 px-2 py-3 text-sky-200 shadow-lg shadow-navy-900/30 transition hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
      >
        <span className="grid size-7 place-items-center rounded-full border border-sky-300/40 bg-sky-100 text-navy-900">
          <Info className="size-3.5" strokeWidth={2.5} aria-hidden />
        </span>
        <ChevronRight className="size-4 text-sky-200" aria-hidden />
      </button>
    )
  }

  return (
    <aside
      id={panelId}
      className="fixed left-0 top-0 z-40 flex h-dvh w-[min(20rem,85vw)] flex-col border-r border-navy-800/20 bg-white shadow-2xl shadow-navy-900/20"
      role="complementary"
      aria-label="Important instructions"
    >
      <div className="flex shrink-0 items-center gap-2.5 bg-navy-900 px-3 py-3 text-white">
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-sky-300/50 bg-sky-100 text-navy-900">
          <Info className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Important Instructions</p>
          {/* <p className="mt-0.5 text-xs font-medium text-sky-200/90">
            {list.length === 1 ? '1 note' : `${list.length} notes`}
          </p> */}
        </div>
        <button
          type="button"
          aria-expanded={true}
          aria-controls={panelId}
          aria-label="Hide instructions"
          onClick={() => setExpanded(false)}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-sky-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      </div>

      <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-slate-50/80 p-3">
        {list.map((text, index) => {
          const { title, body } = splitInstructionTitle(text)
          return (
            <li
              key={`participant-instruction-${index}`}
              className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm"
            >
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-[0.7rem] font-bold tabular-nums text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                {title ? (
                  <>
                    <p className="text-sm font-bold leading-snug text-navy-900">{title}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-xs font-medium leading-snug text-slate-600">
                      {body}
                    </p>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap text-sm font-medium leading-snug text-navy-900">
                    {body}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}

export default ParticipantInstructionsRail
