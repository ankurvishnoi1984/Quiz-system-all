import Modal from '../../components/ui/Modal'

export function PresentInstructionsModal({ open, onClose, instructions = [] }) {
  const list = Array.isArray(instructions) ? instructions : []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Instructions"
      subtitle="Host notes for this session"
      size="md"
    >
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">No instructions added.</p>
      ) : (
        <ol className="space-y-3">
          {list.map((text, index) => (
            <li
              key={`present-instruction-${index}`}
              className="flex gap-3 rounded-xl border border-blue-100 bg-slate-50/80 px-3 py-3"
            >
              <span className="shrink-0 text-sm font-bold tabular-nums text-navy-700">
                {index + 1}.
              </span>
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {text}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}

export default PresentInstructionsModal
