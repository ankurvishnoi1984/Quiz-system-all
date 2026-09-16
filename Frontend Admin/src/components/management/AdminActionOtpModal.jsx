import Modal from '../ui/Modal'

export function AdminActionOtpModal({
  open,
  code,
  error,
  sending,
  verifying,
  onCodeChange,
  onConfirm,
  onClose,
  onResend,
}) {
  return (
    <Modal open={open} title="Verify admin action" onClose={onClose}>
      <form className="space-y-4" onSubmit={onConfirm}>
        <p className="text-sm text-slate-600">
          A one-time code was sent to the configured admin OTP mailbox. Enter it to complete this
          action.
        </p>
        <div>
          <label className="text-sm font-semibold text-slate-700">Verification code</label>
          <input
            value={code}
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="mt-1 h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-center text-lg font-semibold tracking-[0.35em] outline-none focus:border-blue-400"
            placeholder="000000"
            autoFocus
          />
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={sending || verifying}
            onClick={onResend}
            className="text-sm font-semibold text-blue-700 disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Resend code'}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={sending || verifying}
              onClick={onClose}
              className="h-11 rounded-xl border border-blue-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || verifying}
              className="h-11 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {verifying ? 'Verifying…' : 'Verify and continue'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
