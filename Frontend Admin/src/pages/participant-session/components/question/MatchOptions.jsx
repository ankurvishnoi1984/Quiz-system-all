import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CheckCircle2, GripVertical, Link2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

function shuffleIds(ids) {
  const arr = [...ids]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function AnswerChip({
  option,
  dragging = false,
  selected = false,
  disabled = false,
  compact = false,
  onClick,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group inline-flex max-w-full items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-semibold shadow-sm transition ${
        compact ? 'min-h-11 w-full' : 'min-h-12'
      } ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
          : selected
            ? 'border-navy-600 bg-navy-900 text-white shadow-md ring-2 ring-navy-400/40'
            : dragging
              ? 'cursor-grabbing border-blue-400 bg-white text-navy-900 shadow-xl ring-2 ring-blue-300/50'
              : 'cursor-grab border-blue-200/80 bg-white text-navy-900 hover:border-blue-400 hover:shadow-md active:cursor-grabbing'
      }`}
    >
      {!disabled ? (
        <GripVertical
          className={`size-4 shrink-0 ${selected ? 'text-blue-200' : 'text-slate-400'}`}
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 flex-1 leading-snug">{option.option_text}</span>
    </button>
  )
}

function DraggableAnswer({ option, disabled, selected, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `answer-${option.option_id}`,
    data: { type: 'answer', optionId: Number(option.option_id) },
    disabled,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <AnswerChip
        option={option}
        selected={selected}
        disabled={disabled}
        dragging={isDragging}
        onClick={() => {
          if (disabled) return
          onSelect?.(Number(option.option_id))
        }}
      />
    </div>
  )
}

function MatchSlot({
  leftOption,
  placedOption,
  selectedAnswerId,
  inputsLocked,
  highlighted,
  revealState = null,
  onSlotTap,
  onClear,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${leftOption.option_id}`,
    data: { type: 'slot', leftOptionId: Number(leftOption.option_id) },
    disabled: inputsLocked,
  })

  const revealBorder =
    revealState === 'correct'
      ? 'border-emerald-400 bg-emerald-50/70 ring-1 ring-emerald-200'
      : revealState === 'incorrect'
        ? 'border-red-300 bg-red-50/50 ring-1 ring-red-200'
        : highlighted
          ? 'border-emerald-300 bg-emerald-50/40'
          : 'border-blue-100 bg-white/90'

  return (
    <div
      className={`quiz-row-in grid gap-3 rounded-2xl border p-3 transition sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] sm:items-stretch ${revealBorder}`}
    >
      <div className="flex items-center rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-3">
        <p className="text-sm font-semibold leading-snug text-navy-900">{leftOption.option_text}</p>
      </div>

      <div
        ref={setNodeRef}
        role="button"
        tabIndex={inputsLocked ? -1 : 0}
        onClick={() => {
          if (inputsLocked) return
          onSlotTap?.(Number(leftOption.option_id))
        }}
        onKeyDown={(event) => {
          if (inputsLocked) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSlotTap?.(Number(leftOption.option_id))
          }
        }}
        className={`relative flex min-h-14 items-center rounded-2xl border-2 border-dashed px-2.5 py-2 transition ${
          isOver
            ? 'border-navy-500 bg-blue-50 shadow-inner'
            : placedOption
              ? revealState === 'correct'
                ? 'border-emerald-400 bg-emerald-50/80'
                : revealState === 'incorrect'
                  ? 'border-red-300 bg-red-50/70'
                  : 'border-blue-300 bg-blue-50/50'
              : selectedAnswerId
                ? 'border-navy-400 bg-navy-50/60'
                : 'border-blue-200/80 bg-white'
        }`}
        aria-label={
          placedOption
            ? `Matched: ${placedOption.option_text}. Tap to replace or clear.`
            : `Drop or tap an answer for ${leftOption.option_text}`
        }
      >
        {placedOption ? (
          <div className="flex w-full items-center gap-2">
            <div className="min-w-0 flex-1">
              <AnswerChip option={placedOption} compact disabled={inputsLocked} />
            </div>
            {!inputsLocked ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onClear?.(Number(leftOption.option_id))
                }}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                aria-label="Clear match"
              >
                <X className="size-4" />
              </button>
            ) : revealState === 'correct' ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
            ) : null}
          </div>
        ) : (
          <p className="w-full px-2 text-center text-xs font-medium text-slate-400">
            {selectedAnswerId ? 'Tap here to place' : 'Drop or tap an answer'}
          </p>
        )}
      </div>
    </div>
  )
}

export function MatchOptions({
  question,
  currentResponse,
  inputsLocked,
  onMatchingChange,
  canSeeAnswerReveal = false,
  correctMatchingPairs = null,
}) {
  const options = question?.options || []
  const leftOptions = useMemo(
    () =>
      options
        .filter((opt) => opt.match_side === 'left')
        .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0)),
    [options],
  )
  const rightOptions = useMemo(
    () => options.filter((opt) => opt.match_side === 'right'),
    [options],
  )
  const rightById = useMemo(
    () => new Map(rightOptions.map((opt) => [Number(opt.option_id), opt])),
    [rightOptions],
  )

  const matchingPairs =
    currentResponse?.matchingPairs && typeof currentResponse.matchingPairs === 'object'
      ? currentResponse.matchingPairs
      : {}

  const resolvedCorrectPairs =
    correctMatchingPairs && typeof correctMatchingPairs === 'object'
      ? correctMatchingPairs
      : question?.correctMatchingPairs && typeof question.correctMatchingPairs === 'object'
        ? question.correctMatchingPairs
        : null

  const [bankOrder, setBankOrder] = useState([])
  const [selectedAnswerId, setSelectedAnswerId] = useState(null)
  const [activeDragId, setActiveDragId] = useState(null)

  useEffect(() => {
    const ids = rightOptions.map((opt) => Number(opt.option_id)).filter(Boolean)
    setBankOrder((prev) => {
      if (prev.length === ids.length && ids.every((id) => prev.includes(id))) return prev
      return shuffleIds(ids)
    })
  }, [question?.id, rightOptions])

  const usedRightIds = useMemo(
    () => new Set(Object.values(matchingPairs).map(Number).filter(Boolean)),
    [matchingPairs],
  )

  const availableBankIds = bankOrder.filter((id) => !usedRightIds.has(id))
  const filledCount = leftOptions.filter((left) => matchingPairs[String(left.option_id)]).length
  const allFilled = leftOptions.length > 0 && filledCount === leftOptions.length

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  )

  const placeAnswer = (leftOptionId, rightOptionId) => {
    if (inputsLocked) return
    const next = { ...matchingPairs }
    for (const [leftId, rightId] of Object.entries(next)) {
      if (Number(rightId) === Number(rightOptionId)) delete next[leftId]
    }
    next[String(leftOptionId)] = Number(rightOptionId)
    onMatchingChange?.(next)
    setSelectedAnswerId(null)
  }

  const clearSlot = (leftOptionId) => {
    if (inputsLocked) return
    const next = { ...matchingPairs }
    delete next[String(leftOptionId)]
    onMatchingChange?.(next)
  }

  const handleSlotTap = (leftOptionId) => {
    if (inputsLocked) return
    if (selectedAnswerId) {
      placeAnswer(leftOptionId, selectedAnswerId)
      return
    }
    const existing = matchingPairs[String(leftOptionId)]
    if (existing) {
      clearSlot(leftOptionId)
      setSelectedAnswerId(Number(existing))
    }
  }

  const handleDragEnd = (event) => {
    setActiveDragId(null)
    if (inputsLocked) return
    const { active, over } = event
    if (!over) return
    const answerId = Number(active?.data?.current?.optionId)
    const leftId = Number(over?.data?.current?.leftOptionId)
    if (!answerId || !leftId) return
    placeAnswer(leftId, answerId)
  }

  const activeOption = activeDragId
    ? rightById.get(Number(String(activeDragId).replace('answer-', '')))
    : null

  const correctKeyRows = useMemo(() => {
    if (!canSeeAnswerReveal || !resolvedCorrectPairs) return []
    return leftOptions.map((left) => {
      const correctRightId = Number(resolvedCorrectPairs[String(left.option_id)])
      return {
        left,
        correctRight: rightById.get(correctRightId) || null,
      }
    })
  }, [canSeeAnswerReveal, resolvedCorrectPairs, leftOptions, rightById])

  if (!leftOptions.length || !rightOptions.length) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        This match question is missing pairs.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200/70 bg-linear-to-br from-blue-50/80 via-white to-cyan-50/40 px-4 py-3.5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-navy-900 text-white shadow-md shadow-navy-900/20">
            <Link2 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-navy-900">Match the following</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Drag an answer into a slot, or <strong>tap an answer</strong> then{' '}
              <strong>tap a slot</strong>. Clear a slot with × to try again.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-navy-800 ring-1 ring-blue-200/80">
                {filledCount} / {leftOptions.length} matched
              </span>
              {allFilled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 className="size-3.5" />
                  Ready to submit
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => setActiveDragId(event.active.id)}
        onDragCancel={() => setActiveDragId(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-2.5">
          {leftOptions.map((left) => {
            const placedId = Number(matchingPairs[String(left.option_id)] || 0)
            const placedOption = placedId ? rightById.get(placedId) : null
            let revealState = null
            if (canSeeAnswerReveal && resolvedCorrectPairs) {
              const correctId = Number(resolvedCorrectPairs[String(left.option_id)])
              revealState =
                placedId && correctId && placedId === correctId ? 'correct' : 'incorrect'
            }
            return (
              <MatchSlot
                key={left.option_id}
                leftOption={left}
                placedOption={placedOption}
                selectedAnswerId={selectedAnswerId}
                inputsLocked={inputsLocked}
                highlighted={Boolean(placedOption) && !canSeeAnswerReveal}
                revealState={revealState}
                onSlotTap={handleSlotTap}
                onClear={clearSlot}
              />
            )
          })}
        </div>

        {!canSeeAnswerReveal ? (
          <div className="rounded-2xl border border-blue-200/70 bg-white/95 p-3.5 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-navy-700">Answer bank</p>
              <p className="text-[11px] font-medium text-slate-500">
                {availableBankIds.length
                  ? `${availableBankIds.length} left`
                  : 'All answers placed'}
              </p>
            </div>
            {availableBankIds.length ? (
              <div className="flex flex-wrap gap-2">
                {availableBankIds.map((id) => {
                  const option = rightById.get(id)
                  if (!option) return null
                  return (
                    <DraggableAnswer
                      key={id}
                      option={option}
                      disabled={inputsLocked}
                      selected={selectedAnswerId === id}
                      onSelect={(optionId) => {
                        setSelectedAnswerId((prev) => (prev === optionId ? null : optionId))
                      }}
                    />
                  )
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                Every answer is matched. Clear a slot if you want to rearrange.
              </p>
            )}
          </div>
        ) : null}

        <DragOverlay dropAnimation={null}>
          {activeOption ? <AnswerChip option={activeOption} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {canSeeAnswerReveal && correctKeyRows.length ? (
        <div className="quiz-banner-in rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-800">
            Correct matches
          </p>
          <div className="space-y-2">
            {correctKeyRows.map(({ left, correctRight }, idx) => (
              <div
                key={left.option_id}
                className="quiz-row-in flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/80 bg-white px-3 py-2.5"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <span className="min-w-0 flex-1 text-sm font-semibold text-navy-900">
                  {left.option_text}
                </span>
                <span className="text-slate-400" aria-hidden>
                  →
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-emerald-800">
                  {correctRight?.option_text || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
