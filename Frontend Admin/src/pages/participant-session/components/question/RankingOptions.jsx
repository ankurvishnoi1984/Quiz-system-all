import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowUpDown, ListOrdered } from 'lucide-react'

function rankStyles(index) {
  if (index === 0) {
    return {
      badge: 'bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-900/20',
      card: 'border-amber-300/80 bg-linear-to-r from-amber-50/90 to-white',
    }
  }
  if (index === 1) {
    return {
      badge: 'bg-linear-to-br from-slate-300 to-slate-500 text-white',
      card: 'border-blue-200/80 bg-white',
    }
  }
  if (index === 2) {
    return {
      badge: 'bg-linear-to-br from-amber-700/90 to-amber-900 text-white',
      card: 'border-blue-200/80 bg-white',
    }
  }
  return {
    badge: 'bg-blue-50 text-navy-800 ring-1 ring-blue-200/80',
    card: 'border-blue-200/70 bg-white',
  }
}

function SortableRankingRow({ id, text, index, disabled = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })
  const styles = rankStyles(index)

  // Drag the row itself (no DragOverlay portal) so the card stays under the cursor.
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 30 : undefined,
    position: 'relative',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border-2 px-4 py-3.5 shadow-sm transition-[border-color,box-shadow,opacity] ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
          : `cursor-grab touch-none border-dashed active:cursor-grabbing hover:border-blue-400/80 hover:shadow-md ${styles.card} ${
              isDragging
                ? 'cursor-grabbing border-blue-400 bg-white shadow-lg ring-2 ring-blue-300/40'
                : ''
            }`
      }`}
      {...attributes}
      {...listeners}
      aria-label={`Rank ${index + 1}: ${text}. Drag to reorder.`}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ${styles.badge}`}
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-navy-900">{text}</p>
        </div>

        {!disabled ? (
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-navy-700 ring-1 ring-blue-200/70"
            aria-hidden
          >
            <ArrowUpDown className="size-4" />
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function RankingOptions({ question, currentResponse, inputsLocked, onRankingChange }) {
  const options = question?.options || []
  const optionIds = options.map((opt) => Number(opt.option_id)).filter(Boolean)
  const responseOrder = Array.isArray(currentResponse?.rankingOrder)
    ? currentResponse.rankingOrder.map(Number).filter(Boolean)
    : []

  const orderedIds =
    responseOrder.length === optionIds.length &&
    optionIds.every((id) => responseOrder.includes(id))
      ? responseOrder
      : optionIds

  const optionById = new Map(options.map((opt) => [Number(opt.option_id), opt]))
  const orderedOptions = orderedIds.map((id) => optionById.get(Number(id))).filter(Boolean)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event) => {
    if (inputsLocked) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedIds.findIndex((id) => id === Number(active.id))
    const newIndex = orderedIds.findIndex((id) => id === Number(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onRankingChange(arrayMove(orderedIds, oldIndex, newIndex))
  }

  if (!orderedOptions.length) return null

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-blue-200/70 bg-blue-50/50 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white text-navy-700 shadow-sm ring-1 ring-blue-200/70">
            <ListOrdered className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">Drag to rank your choices</p>
            <p className="mt-1 text-sm text-slate-600">
              Put your <strong>most preferred</strong> option at <strong>#1</strong> and your{' '}
              <strong>least preferred</strong> at the bottom. Drag any card to move it.
            </p>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5">
            {orderedOptions.map((option, index) => (
              <SortableRankingRow
                key={option.option_id}
                id={Number(option.option_id)}
                index={index}
                text={option.option_text}
                disabled={inputsLocked}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
