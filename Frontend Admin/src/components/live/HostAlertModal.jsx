import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { useEffect } from 'react'

const VARIANT_STYLES = {
  success: {
    panel: 'border-emerald-200/80 bg-linear-to-b from-emerald-50 to-white shadow-emerald-900/15',
    bar: 'bg-linear-to-r from-emerald-500 to-teal-500',
    iconWrap: 'bg-emerald-100 text-emerald-600 ring-emerald-50',
    title: 'text-emerald-900',
    message: 'text-emerald-800/90',
    button: 'bg-linear-to-r from-emerald-600 to-teal-600 focus:ring-emerald-500',
    Icon: CheckCircle2,
  },
  error: {
    panel: 'border-red-200/80 bg-linear-to-b from-red-50 to-white shadow-red-900/15',
    bar: 'bg-linear-to-r from-red-500 to-rose-500',
    iconWrap: 'bg-red-100 text-red-600 ring-red-50',
    title: 'text-red-900',
    message: 'text-red-800/90',
    button: 'bg-linear-to-r from-red-600 to-rose-600 focus:ring-red-500',
    Icon: XCircle,
  },
  info: {
    panel: 'border-emerald-200/80 bg-linear-to-b from-emerald-50 to-white shadow-emerald-900/15',
    bar: 'bg-linear-to-r from-emerald-400 to-teal-500',
    iconWrap: 'bg-emerald-100 text-emerald-600 ring-emerald-50',
    title: 'text-emerald-900',
    message: 'text-emerald-800/90',
    button: 'bg-linear-to-r from-emerald-600 to-teal-600 focus:ring-emerald-500',
    Icon: Info,
  },
  warning: {
    panel: 'border-amber-200/80 bg-linear-to-b from-amber-50 to-white shadow-amber-900/15',
    bar: 'bg-linear-to-r from-amber-500 to-orange-500',
    iconWrap: 'bg-amber-100 text-amber-700 ring-amber-50',
    title: 'text-amber-950',
    message: 'text-amber-900/90',
    button: 'bg-linear-to-r from-amber-600 to-orange-600 focus:ring-amber-500',
    Icon: AlertTriangle,
  },
}

export function HostAlertModal({
  open,
  variant = 'success',
  title,
  message,
  confirmLabel,
  secondaryLabel,
  secondaryHref,
  onSecondary,
  onClose,
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const theme = VARIANT_STYLES[variant] || VARIANT_STYLES.success
  const Icon = theme.Icon
  const showSecondary = Boolean(secondaryLabel && (secondaryHref || onSecondary))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-navy-950/30 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-labelledby="host-alert-title"
        aria-describedby="host-alert-message"
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl ${theme.panel}`}
      >
        <div className={`h-1.5 w-full ${theme.bar}`} aria-hidden />
        <div className="p-6 text-center">
          <div className={`mx-auto grid size-16 place-items-center rounded-full ring-4 ${theme.iconWrap}`}>
            <Icon className="size-9" strokeWidth={2.25} aria-hidden />
          </div>
          <p id="host-alert-title" className={`mt-5 text-xl font-bold ${theme.title}`}>
            {title}
          </p>
          <p
            id="host-alert-message"
            className={`mt-2 whitespace-pre-line text-sm leading-relaxed ${theme.message}`}
          >
            {message}
          </p>
          <div className="mt-6 space-y-2">
            {showSecondary ? (
              secondaryHref ? (
                <a
                  href={secondaryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white shadow-md transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme.button}`}
                >
                  {secondaryLabel}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onSecondary?.()
                    onClose?.()
                  }}
                  className={`h-11 w-full rounded-xl text-sm font-semibold text-white shadow-md transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme.button}`}
                >
                  {secondaryLabel}
                </button>
              )
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className={
                showSecondary
                  ? 'h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  : `h-11 w-full rounded-xl text-sm font-semibold text-white shadow-md transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme.button}`
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
