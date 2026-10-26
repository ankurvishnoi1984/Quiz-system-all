import { useId, useState } from 'react'
import { ChevronDown, ListOrdered } from 'lucide-react'

/**
 * Split "Title: body" host notes for scanability. No colon / empty sides → whole string as body.
 * @param {unknown} text
 * @returns {{ title: string | null, body: string }}
 */
export function splitInstructionTitle(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return { title: null, body: '' }
  const sep = ': '
  const idx = raw.indexOf(sep)
  if (idx <= 0) return { title: null, body: raw }
  const title = raw.slice(0, idx).trim()
  const body = raw.slice(idx + sep.length).trim()
  if (!title || !body) return { title: null, body: raw }
  return { title, body }
}

/**
 * Lobby instructions panel — matches Date/Time/Audience navy-blue chrome.
 * Header toggles expand/collapse (default expanded).
 */
export function PresentInstructionsPanel({ instructions = [], className = '' }) {
  const list = Array.isArray(instructions) ? instructions : []
  const [expanded, setExpanded] = useState(true)
  const panelId = useId()
  const parentClass = expanded
    ? className
    : `${String(className || '')
        .replace(/\bh-full\b/g, '')
        .replace(/\bmin-h-0\b/g, '')
        .trim()} h-auto self-start`.trim()

  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-[2rem] border border-blue-200/70 bg-white/95 shadow-xl shadow-navy-900/10 ${
        expanded ? 'min-h-0' : ''
      } ${parentClass}`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        className={`flex w-full shrink-0 items-center gap-2.5 px-[clamp(0.85rem,2vw,1.25rem)] py-[clamp(0.7rem,1.6vh,0.95rem)] text-left transition hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-inset ${
          expanded ? 'border-b border-blue-100/80' : ''
        }`}
      >
        <span className="grid size-[clamp(2.15rem,4.2vw,2.6rem)] shrink-0 place-items-center rounded-xl bg-linear-to-br from-sky-100 to-blue-100 text-sky-800">
          <ListOrdered className="size-[clamp(1rem,2vw,1.2rem)]" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[clamp(0.65rem,1.2vw,0.8rem)] font-semibold uppercase tracking-wider text-slate-500">
            Instructions
          </p>
          {/* {list.length > 0 ? (
            <p className="mt-0.5 text-[clamp(0.65rem,1.1vw,0.75rem)] font-medium text-slate-400">
              {list.length === 1 ? '1 note' : `${list.length} notes`}
            </p>
          ) : null} */}
        </div>
        <ChevronDown
          className={`size-[clamp(1.1rem,2vw,1.35rem)] shrink-0 text-slate-500 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div id={panelId}>
          {list.length === 0 ? (
            <p className="px-[clamp(0.85rem,2vw,1.25rem)] py-5 text-[clamp(0.85rem,1.6vw,1.05rem)] text-slate-500">
              No instructions.
            </p>
          ) : (
            <ol className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain px-[clamp(0.85rem,2vw,1.25rem)] max-h-[min(48vh,26rem)] lg:max-h-none">
              {list.map((text, index) => {
                const { title, body } = splitInstructionTitle(text)
                return (
                  <li
                    key={`instruction-${index}`}
                    className="flex items-start gap-2.5 py-[clamp(0.5rem,1.2vh,0.75rem)]"
                  >
                    <span className="mt-0.5 grid size-[clamp(1.45rem,2.6vw,1.7rem)] shrink-0 place-items-center rounded-full bg-slate-100 text-[clamp(0.65rem,1.2vw,0.75rem)] font-bold tabular-nums text-navy-800">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      {title ? (
                        <>
                          <p className="text-[clamp(0.85rem,1.6vw,1.05rem)] font-bold leading-snug text-navy-900">
                            {title}
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap text-[clamp(0.8rem,1.5vw,0.95rem)] font-medium leading-snug text-slate-600">
                            {body}
                          </p>
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap text-[clamp(0.85rem,1.6vw,1.05rem)] font-medium leading-snug text-navy-900">
                          {body}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      ) : (
        <div id={panelId} hidden />
      )}
    </div>
  )
}

export default PresentInstructionsPanel
