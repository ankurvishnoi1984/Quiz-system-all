const MAX_ALLOWLIST_ENTRIES = 5000
const MAX_EXCEL_FILE_BYTES = 5 * 1024 * 1024

function looksLikeEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase()
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
}

function looksLikeMobile(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

function cellToToken(value) {
  if (value == null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Keep phone numbers as full digits (Excel often stores them as numbers).
    return String(Math.trunc(value))
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('').trim()
    }
    if (value.text != null) return String(value.text).trim()
    if (value.result != null) return cellToToken(value.result)
    if (value.hyperlink != null) return String(value.text || value.hyperlink).trim()
  }
  return String(value).trim()
}

function addAllowlistToken(token, emails, mobiles) {
  const value = String(token || '').trim().replace(/^["']|["']$/g, '')
  if (!value) return
  const lower = value.toLowerCase()
  if (
    [
      'email',
      'emails',
      'e-mail',
      'e_mail',
      'mobile',
      'phone',
      'phones',
      'contact',
      'name',
      'full_name',
      'fullname',
    ].includes(lower)
  ) {
    return
  }
  if (looksLikeEmail(value)) {
    emails.add(lower)
    return
  }
  if (looksLikeMobile(value)) {
    mobiles.add(value.replace(/\s+/g, ''))
  }
}

/**
 * Parse pasted text or CSV into { emails, mobiles }.
 * Supports:
 * - one contact per line
 * - comma / semicolon / tab separated values
 * - optional header row with email / mobile / phone
 */
export function parseJoinAllowlistText(rawText) {
  const emails = new Set()
  const mobiles = new Set()

  const text = String(rawText || '').replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/[,;\t|]/)
    for (const part of parts) addAllowlistToken(part, emails, mobiles)
  }

  return {
    emails: [...emails],
    mobiles: [...mobiles],
  }
}

/**
 * Parse an Excel .xlsx file into { emails, mobiles }.
 * Reads every sheet; picks up email / mobile / phone cells (any column).
 */
export async function parseJoinAllowlistExcel(file) {
  if (!file) {
    throw new Error('No file selected.')
  }
  const name = String(file.name || '').toLowerCase()
  if (!name.endsWith('.xlsx')) {
    throw new Error('Only .xlsx Excel files are supported.')
  }
  if (file.size > MAX_EXCEL_FILE_BYTES) {
    throw new Error('Excel file must be 5 MB or smaller.')
  }

  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())

  const emails = new Set()
  const mobiles = new Set()

  workbook.eachSheet((worksheet) => {
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        addAllowlistToken(cellToToken(cell.value), emails, mobiles)
      })
    })
  })

  return {
    emails: [...emails],
    mobiles: [...mobiles],
  }
}

export function allowlistEntryCount(list) {
  if (!list || typeof list !== 'object') return 0
  const emails = Array.isArray(list.emails) ? list.emails.length : 0
  const mobiles = Array.isArray(list.mobiles) ? list.mobiles.length : 0
  return emails + mobiles
}

export function summarizeJoinAllowlist(list) {
  const emails = Array.isArray(list?.emails) ? list.emails.length : 0
  const mobiles = Array.isArray(list?.mobiles) ? list.mobiles.length : 0
  const parts = []
  if (emails) parts.push(`${emails} email${emails === 1 ? '' : 's'}`)
  if (mobiles) parts.push(`${mobiles} mobile${mobiles === 1 ? '' : 's'}`)
  return parts.join(', ') || '0 contacts'
}

export function isJoinAllowlistOverLimit(list) {
  return allowlistEntryCount(list) > MAX_ALLOWLIST_ENTRIES
}

export { MAX_ALLOWLIST_ENTRIES, MAX_EXCEL_FILE_BYTES }
