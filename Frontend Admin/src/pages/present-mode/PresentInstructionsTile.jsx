import { ListOrdered } from 'lucide-react'

/**
 * Compact clickable card for lobby custom instructions (Overall Rankings tile style).
 */
export function PresentInstructionsTile({
  onClick,
  active = false,
  className = '',
  layout = 'compact',
}) {
  const isWide = layout === 'wide'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group cursor-pointer rounded-2xl border text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
        active
          ? 'border-amber-300 bg-amber-50 hover:border-amber-400 hover:bg-amber-50 hover:shadow-md'
          : 'border-blue-200/80 bg-white/90 hover:border-sky-300 hover:bg-white hover:shadow-md'
      } ${
        isWide
          ? 'flex w-full items-center justify-between gap-3 px-[clamp(1rem,2.5vw,1.5rem)] py-[clamp(0.85rem,2vh,1.15rem)]'
          : 'flex h-full min-h-[5.5rem] w-full flex-col justify-center px-4 py-3'
      } ${className}`}
      aria-label="View custom instructions"
    >
      <div className={`flex items-center gap-2 ${isWide ? '' : 'justify-start'}`}>
        <ListOrdered
          className={`size-[clamp(0.9rem,1.6vw,1.1rem)] shrink-0 transition ${
            active
              ? 'text-amber-600 group-hover:text-amber-700'
              : 'text-sky-600 group-hover:text-sky-700'
          }`}
          aria-hidden
        />
        <p
          className={`text-[clamp(0.7rem,1.3vw,0.85rem)] font-semibold uppercase tracking-wider ${
            active ? 'text-amber-800' : 'text-slate-500'
          }`}
        >
          Instructions
        </p>
      </div>
      <p
        className={`${isWide ? '' : 'mt-1'} text-[clamp(0.85rem,1.6vw,1rem)] font-semibold ${
          active ? 'text-amber-800' : 'text-navy-700'
        }`}
      >
        View
      </p>
    </button>
  )
}

export default PresentInstructionsTile
