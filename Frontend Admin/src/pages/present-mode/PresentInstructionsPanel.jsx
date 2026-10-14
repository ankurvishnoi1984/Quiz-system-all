import { ListOrdered } from 'lucide-react'

/**
 * Inline lobby instructions panel — Date/Time card language with a rose accent heading.
 */
export function PresentInstructionsPanel({ instructions = [], className = '' }) {
  const list = Array.isArray(instructions) ? instructions : []

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[2rem] border border-rose-200/80 bg-white/95 shadow-xl shadow-navy-900/10 ${className}`}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-rose-100 bg-linear-to-r from-rose-50/90 to-white px-[clamp(1rem,2.4vw,1.5rem)] py-[clamp(0.85rem,2vh,1.15rem)]">
        <span className="grid size-[clamp(2.5rem,5vw,3rem)] shrink-0 place-items-center rounded-xl bg-linear-to-br from-rose-100 to-red-100 text-rose-700 shadow-sm shadow-rose-200/60">
          <ListOrdered className="size-[clamp(1.1rem,2.2vw,1.35rem)]" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[clamp(0.7rem,1.3vw,0.85rem)] font-semibold uppercase tracking-wider text-rose-700">
            Instructions
          </p>
          <p className="mt-0.5 text-[clamp(0.7rem,1.2vw,0.8rem)] font-medium text-rose-700/70">
            {list.length === 1 ? '1 note for this session' : `${list.length} notes for this session`}
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="px-[clamp(1rem,2.4vw,1.5rem)] py-6 text-[clamp(0.95rem,1.8vw,1.15rem)] text-slate-500">
          No instructions.
        </p>
      ) : (
        <ol className="min-h-0 flex-1 space-y-[clamp(0.5rem,1.4vh,0.75rem)] overflow-y-auto overscroll-contain px-[clamp(1rem,2.4vw,1.5rem)] py-[clamp(0.85rem,2vh,1.15rem)] max-h-[min(48vh,26rem)] lg:max-h-none">
          {list.map((text, index) => (
            <li
              key={`instruction-${index}`}
              className="flex items-start gap-3 rounded-2xl border border-rose-100/80 bg-rose-50/40 px-[clamp(0.75rem,1.8vw,1rem)] py-[clamp(0.65rem,1.6vh,0.9rem)]"
            >
              <span className="grid size-[clamp(1.75rem,3.2vw,2.15rem)] shrink-0 place-items-center rounded-full bg-linear-to-br from-rose-500 to-red-500 text-[clamp(0.75rem,1.4vw,0.9rem)] font-bold tabular-nums text-white shadow-sm shadow-rose-300/50">
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 whitespace-pre-wrap pt-0.5 text-[clamp(0.95rem,1.9vw,1.2rem)] font-semibold leading-snug text-navy-900">
                {text}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default PresentInstructionsPanel
