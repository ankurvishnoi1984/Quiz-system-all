/** Curated fonts for certificate name preview + layout. */
export const CERTIFICATE_FONT_OPTIONS = [
  { id: 'Georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", serif', google: false },
  {
    id: 'Times New Roman',
    label: 'Times New Roman',
    stack: '"Times New Roman", Times, serif',
    google: false,
  },
  { id: 'Palatino', label: 'Palatino', stack: 'Palatino, "Palatino Linotype", serif', google: false },
  { id: 'Arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif', google: false },
  { id: 'Helvetica', label: 'Helvetica', stack: 'Helvetica, Arial, sans-serif', google: false },
  { id: 'Verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif', google: false },
  {
    id: 'Trebuchet MS',
    label: 'Trebuchet MS',
    stack: '"Trebuchet MS", Helvetica, sans-serif',
    google: false,
  },
  {
    id: 'Courier New',
    label: 'Courier New',
    stack: '"Courier New", Courier, monospace',
    google: false,
  },
  { id: 'Impact', label: 'Impact', stack: 'Impact, Haettenschweiler, sans-serif', google: false },
  {
    id: 'Playfair Display',
    label: 'Playfair Display',
    stack: '"Playfair Display", Georgia, serif',
    google: true,
  },
  {
    id: 'Montserrat',
    label: 'Montserrat',
    stack: 'Montserrat, Arial, sans-serif',
    google: true,
  },
  {
    id: 'Great Vibes',
    label: 'Great Vibes',
    stack: '"Great Vibes", cursive',
    google: true,
  },
]

export const CERTIFICATE_GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@400;600;700&display=swap'

export const DEFAULT_CERTIFICATE_LAYOUT = {
  x_percent: 50,
  y_percent: 55,
  font_family: 'Georgia',
  font_size: 48,
  font_weight: '700',
  color: '#1e293b',
  text_align: 'center',
}

export function normalizeCertificateLayout(raw) {
  const base = { ...DEFAULT_CERTIFICATE_LAYOUT }
  if (!raw || typeof raw !== 'object') return base
  const size = Number(raw.font_size)
  const x = Number(raw.x_percent)
  const y = Number(raw.y_percent)
  return {
    x_percent: Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : base.x_percent,
    y_percent: Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : base.y_percent,
    font_family: String(raw.font_family || base.font_family),
    font_size:
      Number.isFinite(size) && size >= 1 && size <= 100 ? Math.round(size) : base.font_size,
    font_weight: String(raw.font_weight || base.font_weight),
    color: String(raw.color || base.color),
    text_align: ['left', 'center', 'right'].includes(raw.text_align)
      ? raw.text_align
      : base.text_align,
  }
}

export function certificateFontStack(fontFamily, customFamilyName = 'CertificateCustom') {
  if (fontFamily === customFamilyName || fontFamily === '__custom__') {
    return `"${customFamilyName}", Georgia, serif`
  }
  const found = CERTIFICATE_FONT_OPTIONS.find((f) => f.id === fontFamily)
  return found?.stack || `"${fontFamily}", Georgia, serif`
}
