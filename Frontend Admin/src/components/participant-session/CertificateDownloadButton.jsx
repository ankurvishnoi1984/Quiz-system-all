import { useState } from 'react'
import { Award, Loader2 } from 'lucide-react'
import { downloadCertificateApi } from '../../services/participantApi'

export function CertificateDownloadButton({
  enabled,
  participantToken,
  sessionId,
  className = '',
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!enabled || !participantToken || !sessionId) return null

  const handleDownload = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const { blob, filename } = await downloadCertificateApi(participantToken, sessionId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Unable to download certificate')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleDownload()}
        className="participant-btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Award className="size-4" />}
        {busy ? 'Preparing…' : 'Download certificate'}
      </button>
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  )
}

export default CertificateDownloadButton
