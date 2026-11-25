import { useEffect, useRef, useState } from 'react'
import { FileUp, Loader2, X } from 'lucide-react'
import { resolveQuestionMediaUrl } from '../../utils/questionMedia'
import {
  CERTIFICATE_FONT_OPTIONS,
  CERTIFICATE_GOOGLE_FONTS_HREF,
  certificateFontStack,
  normalizeCertificateLayout,
} from '../../utils/certificateFonts'

const SAMPLE_NAME = 'Participant Name'
const CUSTOM_FAMILY = 'CertificateCustom'

/**
 * Drag-position name on certificate template + typography controls.
 */
export function CertificateLayoutEditor({
  enabled,
  onEnabledChange,
  templateUrl,
  onTemplateUpload,
  onTemplateClear,
  templateUploading = false,
  templateError = '',
  customFontUrl,
  onFontUpload,
  onFontClear,
  fontUploading = false,
  fontError = '',
  layout,
  onLayoutChange,
  canUpload = true,
}) {
  const templateInputRef = useRef(null)
  const fontInputRef = useRef(null)
  const stageRef = useRef(null)
  const draggingRef = useRef(false)
  const normalized = normalizeCertificateLayout(layout)
  const [fontsReady, setFontsReady] = useState(false)
  const [fontSizeDraft, setFontSizeDraft] = useState(String(normalized.font_size))

  useEffect(() => {
    setFontSizeDraft(String(normalized.font_size))
  }, [normalized.font_size])

  useEffect(() => {
    if (document.getElementById('certificate-google-fonts')) {
      setFontsReady(true)
      return undefined
    }
    const link = document.createElement('link')
    link.id = 'certificate-google-fonts'
    link.rel = 'stylesheet'
    link.href = CERTIFICATE_GOOGLE_FONTS_HREF
    link.onload = () => setFontsReady(true)
    document.head.appendChild(link)
    return undefined
  }, [])

  useEffect(() => {
    if (!customFontUrl) return undefined
    const href = resolveQuestionMediaUrl(customFontUrl)
    if (!href) return undefined
    const styleId = 'certificate-custom-font-face'
    let style = document.getElementById(styleId)
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.head.appendChild(style)
    }
    style.textContent = `
      @font-face {
        font-family: '${CUSTOM_FAMILY}';
        src: url('${href}');
        font-weight: normal;
        font-style: normal;
      }
    `
    return undefined
  }, [customFontUrl])

  const updateLayout = (patch) => {
    onLayoutChange(normalizeCertificateLayout({ ...normalized, ...patch }))
  }

  const setPositionFromPointer = (clientX, clientY) => {
    const el = stageRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    updateLayout({
      x_percent: Math.min(100, Math.max(0, x)),
      y_percent: Math.min(100, Math.max(0, y)),
    })
  }

  const usingCustom =
    Boolean(customFontUrl) &&
    (normalized.font_family === CUSTOM_FAMILY || normalized.font_family === '__custom__')
  const fontStack = certificateFontStack(
    usingCustom ? CUSTOM_FAMILY : normalized.font_family,
    CUSTOM_FAMILY,
  )
  const previewSrc = resolveQuestionMediaUrl(templateUrl)

  return (
    <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
      <label className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/70 bg-white px-3 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Issue certificate for this session</p>
          <p className="text-xs text-slate-500">
            Upload a template and place the participant name. You can enable download from Live after
            the session.
          </p>
        </div>
        <input
          type="checkbox"
          checked={Boolean(enabled)}
          onChange={(event) => onEnabledChange(event.target.checked)}
          className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
        />
      </label>

      {enabled ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-blue-200/70 bg-white px-3 py-3">
            <p className="text-sm font-semibold text-slate-700">Certificate template</p>
            <p className="mt-1 text-xs text-slate-500">PNG, JPG, or WebP. Landscape works best.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                ref={templateInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void onTemplateUpload(file)
                }}
              />
              <button
                type="button"
                disabled={templateUploading || !canUpload}
                onClick={() => templateInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-navy-800 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {templateUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileUp className="size-4" />
                )}
                {previewSrc ? 'Replace template' : 'Upload template'}
              </button>
              {previewSrc ? (
                <button
                  type="button"
                  disabled={templateUploading}
                  onClick={onTemplateClear}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  <X className="size-4" />
                  Remove
                </button>
              ) : null}
            </div>
            {templateError ? (
              <p className="mt-1.5 text-xs font-semibold text-red-700">{templateError}</p>
            ) : null}
          </div>

          {previewSrc ? (
            <>
              <div className="rounded-xl border border-blue-200/70 bg-white px-3 py-3">
                <p className="text-sm font-semibold text-slate-700">Name position</p>
                <p className="mt-1 text-xs text-slate-500">
                  Drag the name on the preview to set where it appears on the certificate.
                </p>
                <div
                  ref={stageRef}
                  className="relative mt-3 w-full select-none overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  onPointerDown={(event) => {
                    draggingRef.current = true
                    event.currentTarget.setPointerCapture?.(event.pointerId)
                    setPositionFromPointer(event.clientX, event.clientY)
                  }}
                  onPointerMove={(event) => {
                    if (!draggingRef.current) return
                    setPositionFromPointer(event.clientX, event.clientY)
                  }}
                  onPointerUp={() => {
                    draggingRef.current = false
                  }}
                  onPointerCancel={() => {
                    draggingRef.current = false
                  }}
                >
                  <img
                    src={previewSrc}
                    alt="Certificate template preview"
                    className="pointer-events-none block w-full object-contain"
                    draggable={false}
                  />
                  <div
                    className="pointer-events-none absolute max-w-[90%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded px-2 py-1"
                    style={{
                      left: `${normalized.x_percent}%`,
                      top: `${normalized.y_percent}%`,
                      color: normalized.color,
                      fontFamily: fontStack,
                      fontSize: `clamp(12px, ${normalized.font_size * 0.35}px, ${normalized.font_size}px)`,
                      fontWeight: normalized.font_weight,
                      textAlign: normalized.text_align,
                      textShadow: '0 1px 2px rgba(255,255,255,0.65)',
                      opacity: fontsReady || !CERTIFICATE_FONT_OPTIONS.find((f) => f.id === normalized.font_family)?.google ? 1 : 0.85,
                    }}
                  >
                    {SAMPLE_NAME}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border border-blue-200/70 bg-white px-3 py-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="cert-font-family">
                    Font family
                  </label>
                  <select
                    id="cert-font-family"
                    value={usingCustom ? CUSTOM_FAMILY : normalized.font_family}
                    onChange={(event) => updateLayout({ font_family: event.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    style={{ fontFamily: fontStack }}
                  >
                    {CERTIFICATE_FONT_OPTIONS.map((font) => (
                      <option key={font.id} value={font.id} style={{ fontFamily: font.stack }}>
                        {font.label}
                      </option>
                    ))}
                    {customFontUrl ? (
                      <option
                        value={CUSTOM_FAMILY}
                        style={{ fontFamily: `"${CUSTOM_FAMILY}", Georgia, serif` }}
                      >
                        Custom uploaded font
                      </option>
                    ) : null}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="cert-font-size">
                    Font size
                  </label>
                  <input
                    id="cert-font-size"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    step={1}
                    value={fontSizeDraft}
                    onChange={(event) => {
                      const raw = event.target.value
                      if (raw === '') {
                        setFontSizeDraft('')
                        return
                      }
                      if (!/^\d{1,3}$/.test(raw)) return
                      const next = Number(raw)
                      if (!Number.isFinite(next) || next > 100) return
                      setFontSizeDraft(raw)
                      if (next >= 1) {
                        updateLayout({ font_size: next })
                      }
                    }}
                    onBlur={() => {
                      const next = Number(fontSizeDraft)
                      const clamped =
                        Number.isFinite(next) && next >= 1 && next <= 100
                          ? Math.round(next)
                          : normalized.font_size
                      setFontSizeDraft(String(clamped))
                      updateLayout({ font_size: clamped })
                    }}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">Enter any number from 1 to 100.</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="cert-font-weight">
                    Font weight
                  </label>
                  <select
                    id="cert-font-weight"
                    value={normalized.font_weight}
                    onChange={(event) => updateLayout({ font_weight: event.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  >
                    <option value="400">Regular (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semi-bold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">Extra-bold (800)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="cert-color">
                    Color
                  </label>
                  <input
                    id="cert-color"
                    type="color"
                    value={normalized.color}
                    onChange={(event) => updateLayout({ color: event.target.value })}
                    className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="cert-align">
                    Alignment
                  </label>
                  <select
                    id="cert-align"
                    value={normalized.text_align}
                    onChange={(event) => updateLayout({ text_align: event.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-slate-700">Custom font (optional)</p>
                  <p className="mt-1 text-xs text-slate-500">TTF, OTF, WOFF, or WOFF2 up to 5 MB.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      ref={fontInputRef}
                      type="file"
                      accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void onFontUpload(file)
                      }}
                    />
                    <button
                      type="button"
                      disabled={fontUploading || !canUpload}
                      onClick={() => fontInputRef.current?.click()}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-navy-800 transition hover:bg-blue-50 disabled:opacity-60"
                    >
                      {fontUploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <FileUp className="size-4" />
                      )}
                      {customFontUrl ? 'Replace font' : 'Upload font'}
                    </button>
                    {customFontUrl ? (
                      <button
                        type="button"
                        disabled={fontUploading}
                        onClick={() => {
                          onFontClear()
                          if (usingCustom) updateLayout({ font_family: 'Georgia' })
                        }}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        <X className="size-4" />
                        Remove font
                      </button>
                    ) : null}
                  </div>
                  {fontError ? (
                    <p className="mt-1.5 text-xs font-semibold text-red-700">{fontError}</p>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default CertificateLayoutEditor
